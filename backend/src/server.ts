import express from "express";
import cors from "cors";
import { z } from "zod";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { verifyIntentSignature, type SignedIntent } from "./crypto/intent.js";
import { evaluatePolicy } from "./policy.js";
import { isPayPalConfigured, createPayPalOrder, capturePayPalOrder } from "./paypal.js";

const app = express();
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "agentshield-api", paypal: isPayPalConfigured() ? "configured" : "not_configured" });
});

app.get("/api/agents", async (_req, res, next) => {
  try {
    const agents = await prisma.agent.findMany({ orderBy: { createdAt: "desc" } });
    res.json(agents.map(({ publicKey: _key, ...agent }) => agent));
  } catch (error) { next(error); }
});

const registerAgentSchema = z.object({
  id: z.string().min(3).max(100),
  name: z.string().min(1).max(150),
  publicKey: z.string().min(40)
});

app.post("/api/agents", async (req, res, next) => {
  try {
    const input = registerAgentSchema.parse(req.body);
    const agent = await prisma.agent.create({ data: input });
    await prisma.auditEvent.create({ data: { eventType: "AGENT_REGISTERED", entityId: agent.id, message: "Agent registered" } });
    const { publicKey: _key, ...safeAgent } = agent;
    res.status(201).json(safeAgent);
  } catch (error) { next(error); }
});

const intentSchema = z.object({
  intentId: z.string().min(1),
  agentId: z.string().min(1),
  recipient: z.string().min(1),
  service: z.string().min(1),
  amountMinor: z.number().int().positive().safe(),
  currency: z.string().length(3).transform(v => v.toUpperCase()),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  nonce: z.string().min(12)
});

app.post("/api/intents/verify", async (req, res, next) => {
  try {
    const bodySchema = z.object({ intent: intentSchema, signatureBase64: z.string().min(1) });
    const body = bodySchema.parse(req.body);
    const intent: SignedIntent = body.intent;
    const agent = await prisma.agent.findUnique({ where: { id: intent.agentId } });
    if (!agent || agent.status !== "ACTIVE") {
      await prisma.auditEvent.create({ data: { eventType: "INTENT_REJECTED", entityId: intent.intentId, message: "Unknown, suspended, or revoked agent" } });
      return res.status(403).json({ decision: "REJECTED", reason: "Unknown, suspended, or revoked agent." });
    }
    if (!verifyIntentSignature(intent, body.signatureBase64, agent.publicKey)) {
      await prisma.auditEvent.create({ data: { eventType: "INTENT_REJECTED", entityId: intent.intentId, message: "Invalid signature" } });
      return res.status(403).json({ decision: "REJECTED", reason: "Invalid signature." });
    }
    const now = Date.now();
    if (Date.parse(intent.expiresAt) <= now || Date.parse(intent.createdAt) > now + 60_000) {
      return res.status(400).json({ decision: "REJECTED", reason: "Intent is expired or has an invalid creation time." });
    }
    const policy = evaluatePolicy(intent);
    if (policy.decision === "REJECTED") {
      await prisma.auditEvent.create({ data: { eventType: "INTENT_REJECTED", entityId: intent.intentId, message: policy.reason } });
      return res.status(403).json(policy);
    }
    try {
      await prisma.paymentIntent.create({
        data: {
          id: intent.intentId, agentId: intent.agentId, recipient: intent.recipient,
          service: intent.service, amountMinor: BigInt(intent.amountMinor), currency: intent.currency,
          nonce: intent.nonce, createdAt: new Date(intent.createdAt), expiresAt: new Date(intent.expiresAt),
          status: policy.decision === "REQUIRES_HUMAN_APPROVAL" ? "AWAITING_APPROVAL" : "READY_FOR_PAYMENT",
          decisionReason: policy.reason
        }
      });
    } catch {
      return res.status(409).json({ decision: "REJECTED", reason: "Intent ID or nonce already consumed; replay rejected." });
    }
    await prisma.auditEvent.create({ data: { eventType: "INTENT_VERIFIED", entityId: intent.intentId, message: policy.reason } });
    return res.json({ intentId: intent.intentId, ...policy });
  } catch (error) { next(error); }
});

app.get("/api/approvals", async (_req, res, next) => {
  try {
    const rows = await prisma.paymentIntent.findMany({ where: { status: "AWAITING_APPROVAL" }, orderBy: { createdRecordAt: "asc" } });
    res.json(rows.map(row => ({ ...row, amountMinor: row.amountMinor.toString() })));
  } catch (error) { next(error); }
});

app.post("/api/approvals/:intentId", async (req, res, next) => {
  try {
    const decision = z.object({ approved: z.boolean() }).parse(req.body);
    const current = await prisma.paymentIntent.findUnique({ where: { id: req.params.intentId } });
    if (!current || current.status !== "AWAITING_APPROVAL") return res.status(404).json({ error: "Pending approval not found." });
    const updated = await prisma.paymentIntent.update({
      where: { id: current.id },
      data: { status: decision.approved ? "READY_FOR_PAYMENT" : "REJECTED", decisionReason: decision.approved ? "Human approved." : "Human rejected." }
    });
    await prisma.auditEvent.create({ data: { eventType: decision.approved ? "HUMAN_APPROVED" : "HUMAN_REJECTED", entityId: current.id, message: updated.decisionReason ?? "Approval decision" } });
    res.json({ id: updated.id, status: updated.status, decisionReason: updated.decisionReason });
  } catch (error) { next(error); }
});

app.get("/api/transactions", async (_req, res, next) => {
  try {
    const rows = await prisma.paymentIntent.findMany({ orderBy: { createdRecordAt: "desc" }, take: 100 });
    res.json(rows.map(row => ({ ...row, amountMinor: row.amountMinor.toString() })));
  } catch (error) { next(error); }
});

app.post("/api/paypal/orders", async (req, res, next) => {
  try {
    if (!isPayPalConfigured()) return res.status(503).json({ error: "PAYPAL_NOT_CONFIGURED", message: "Configure PayPal Sandbox credentials in .env." });
    const { intentId } = z.object({ intentId: z.string().min(1) }).parse(req.body);
    const intent = await prisma.paymentIntent.findUnique({ where: { id: intentId } });
    if (!intent || intent.status !== "READY_FOR_PAYMENT") return res.status(409).json({ error: "Intent is not approved for payment." });
    const order = await createPayPalOrder(Number(intent.amountMinor), intent.currency, intent.id) as { id?: string; status?: string };
    if (!order.id) return res.status(502).json({ error: "PayPal did not return an order ID." });
    await prisma.paymentIntent.update({ where: { id: intent.id }, data: { paypalOrderId: order.id, status: "AWAITING_BUYER_APPROVAL" } });
    res.status(201).json({ orderId: order.id, status: order.status });
  } catch (error) { next(error); }
});

app.post("/api/paypal/orders/:orderId/capture", async (req, res, next) => {
  try {
    if (!isPayPalConfigured()) return res.status(503).json({ error: "PAYPAL_NOT_CONFIGURED" });
    const intent = await prisma.paymentIntent.findFirst({ where: { paypalOrderId: req.params.orderId } });
    if (!intent || intent.status !== "AWAITING_BUYER_APPROVAL") return res.status(409).json({ error: "Order is not associated with an awaiting intent." });
    await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: "CAPTURE_PENDING" } });
    const capture = await capturePayPalOrder(req.params.orderId) as { status?: string; purchase_units?: Array<{ payments?: { captures?: Array<{ id?: string; status?: string }> } }> };
    const captured = capture.purchase_units?.flatMap(p => p.payments?.captures ?? []).find(c => c.status === "COMPLETED");
    if (capture.status === "COMPLETED" && captured?.id) {
      await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: "COMPLETED", paypalCaptureId: captured.id } });
      await prisma.auditEvent.create({ data: { eventType: "PAYMENT_COMPLETED", entityId: intent.id, message: "PayPal capture confirmed as COMPLETED" } });
      return res.json({ status: "COMPLETED", captureId: captured.id });
    }
    await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: "REQUIRES_RECONCILIATION" } });
    return res.status(202).json({ status: "REQUIRES_RECONCILIATION", message: "Capture outcome requires reconciliation; do not retry blindly." });
  } catch (error) { next(error); }
});

app.get("/api/audit", async (_req, res, next) => {
  try { res.json(await prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 })); }
  catch (error) { next(error); }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: "VALIDATION_ERROR", details: error.issues });
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message === "PAYPAL_NOT_CONFIGURED") return res.status(503).json({ error: message });
  console.error("Request failed:", message);
  return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Request could not be completed." });
});

const server = app.listen(config.port, () => {
  console.log(`AgentShield API listening on http://localhost:${config.port}`);
});
process.on("SIGINT", async () => { server.close(); await prisma.$disconnect(); process.exit(0); });
