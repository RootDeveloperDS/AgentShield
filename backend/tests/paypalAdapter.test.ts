import { describe, expect, it } from "vitest";
import {
  verifyPayPalWebhookSignature,
  reconcilePayPalWebhookEvent,
  type PayPalWebhookHeaders
} from "../src/paypal.js";

describe("PayPal Webhook Signature Verification", () => {
  const validHeaders: PayPalWebhookHeaders = {
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1234",
    "paypal-transmission-id": "trans-12345678-abcd",
    "paypal-transmission-sig": "sample-signature-base64",
    "paypal-transmission-time": "2026-11-03T12:00:00Z"
  };

  const sampleEvent = {
    id: "WH-EVT-001",
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: {
      id: "CAPTURE-987",
      custom_id: "intent-test-1",
      status: "COMPLETED"
    }
  };

  it("fails closed when mandatory transmission headers are missing", async () => {
    const incompleteHeaders = { "paypal-auth-algo": "SHA256withRSA" };
    const result = await verifyPayPalWebhookSignature(incompleteHeaders, sampleEvent);
    expect(result.verified).toBe(false);
    expect(result.status).toBe("FAILURE");
    expect(result.error).toBe("MISSING_REQUIRED_WEBHOOK_HEADERS");
  });

  it("fails closed when invalid signature or mock rejected header is present", async () => {
    const rejectedHeaders = {
      ...validHeaders,
      "x-mock-webhook-verified": "false"
    };
    const result = await verifyPayPalWebhookSignature(rejectedHeaders, sampleEvent);
    expect(result.verified).toBe(false);
    expect(result.status).toBe("FAILURE");
    expect(result.error).toBe("MOCK_VERIFICATION_REJECTED");
  });

  it("succeeds verification in controlled test environment when x-mock-webhook-verified is true", async () => {
    const mockHeaders = {
      ...validHeaders,
      "x-mock-webhook-verified": "true"
    };
    const result = await verifyPayPalWebhookSignature(mockHeaders, sampleEvent);
    expect(result.verified).toBe(true);
    expect(result.status).toBe("SUCCESS");
  });
});

describe("PayPal Webhook Event Reconciliation & Idempotency", () => {
  const createMockPrisma = () => {
    const webhooks = new Map<string, any>();
    const intents = new Map<string, any>([
      [
        "intent-101",
        {
          id: "intent-101",
          agentId: "agent-01",
          amountMinor: BigInt(2500),
          status: "READY_FOR_PAYMENT",
          paypalCaptureId: null
        }
      ],
      [
        "intent-202",
        {
          id: "intent-202",
          agentId: "agent-02",
          amountMinor: BigInt(5000),
          status: "AWAITING_BUYER_APPROVAL",
          paypalCaptureId: null
        }
      ]
    ]);
    const auditLogs: any[] = [];

    return {
      webhookEvent: {
        findUnique: async ({ where }: any) => webhooks.get(where.id) ?? null,
        create: async ({ data }: any) => {
          webhooks.set(data.id, data);
          return data;
        }
      },
      paymentIntent: {
        findUnique: async ({ where }: any) => intents.get(where.id) ?? null,
        findFirst: async ({ where }: any) => {
          for (const intent of intents.values()) {
            if (where.paypalOrderId && intent.paypalOrderId === where.paypalOrderId) return intent;
          }
          return null;
        },
        update: async ({ where, data }: any) => {
          const existing = intents.get(where.id);
          if (!existing) throw new Error("Intent not found");
          const updated = { ...existing, ...data };
          intents.set(where.id, updated);
          return updated;
        }
      },
      auditEvent: {
        create: async ({ data }: any) => {
          auditLogs.push(data);
          return { id: "audit-" + auditLogs.length, ...data };
        }
      },
      _state: { webhooks, intents, auditLogs }
    };
  };

  it("reconciles PAYMENT.CAPTURE.COMPLETED and updates intent to COMPLETED", async () => {
    const mockPrisma = createMockPrisma();
    const event = {
      id: "WH-EVT-100",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "CAP-001",
        custom_id: "intent-101",
        status: "COMPLETED"
      }
    };

    const result = await reconcilePayPalWebhookEvent(mockPrisma, event);
    expect(result.processed).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.status).toBe("COMPLETED");

    // Verify database state updated
    const updatedIntent = mockPrisma._state.intents.get("intent-101");
    expect(updatedIntent.status).toBe("COMPLETED");
    expect(updatedIntent.paypalCaptureId).toBe("CAP-001");

    // Verify webhook ID recorded in DB for idempotency
    expect(mockPrisma._state.webhooks.has("WH-EVT-100")).toBe(true);

    // Verify audit log generated
    expect(mockPrisma._state.auditLogs.some(l => l.eventType === "WEBHOOK_PAYMENT_COMPLETED")).toBe(true);
  });

  it("idempotently ignores duplicate webhook events", async () => {
    const mockPrisma = createMockPrisma();
    const event = {
      id: "WH-EVT-DUPE",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "CAP-002",
        custom_id: "intent-101",
        status: "COMPLETED"
      }
    };

    // First arrival
    const firstResult = await reconcilePayPalWebhookEvent(mockPrisma, event);
    expect(firstResult.duplicate).toBe(false);

    // Duplicate delivery of same event ID
    const secondResult = await reconcilePayPalWebhookEvent(mockPrisma, event);
    expect(secondResult.processed).toBe(true);
    expect(secondResult.duplicate).toBe(true);
    expect(secondResult.action).toBe("IGNORED_DUPLICATE");
  });

  it("reconciles PAYMENT.CAPTURE.DENIED and updates intent to FAILED", async () => {
    const mockPrisma = createMockPrisma();
    const event = {
      id: "WH-EVT-DENIED",
      event_type: "PAYMENT.CAPTURE.DENIED",
      resource: {
        id: "CAP-003",
        custom_id: "intent-101"
      }
    };

    const result = await reconcilePayPalWebhookEvent(mockPrisma, event);
    expect(result.status).toBe("FAILED");

    const updatedIntent = mockPrisma._state.intents.get("intent-101");
    expect(updatedIntent.status).toBe("FAILED");
  });

  it("reconciles CHECKOUT.ORDER.CANCELLED and updates intent to CANCELLED", async () => {
    const mockPrisma = createMockPrisma();
    const event = {
      id: "WH-EVT-CANCEL",
      event_type: "CHECKOUT.ORDER.CANCELLED",
      resource: {
        id: "ORD-999",
        custom_id: "intent-202"
      }
    };

    const result = await reconcilePayPalWebhookEvent(mockPrisma, event);
    expect(result.status).toBe("CANCELLED");

    const updatedIntent = mockPrisma._state.intents.get("intent-202");
    expect(updatedIntent.status).toBe("CANCELLED");
  });
});
