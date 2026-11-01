import type { SignedIntent } from "./crypto/intent.js";

export type PolicyDecision = "APPROVED" | "REJECTED" | "REQUIRES_HUMAN_APPROVAL";

export type PolicyResult = {
  decision: PolicyDecision;
  reason: string;
  reasonCode?: string;
};

export type PolicyConfig = {
  maxTransactionMinor: number;
  dailyLimitMinor: number;
  humanReviewAboveMinor: number;
  allowedCurrencies: string[];
  allowedRecipients?: string[];
  blockedRiskFlags?: string[];
};

export const defaultPolicy: PolicyConfig = {
  maxTransactionMinor: 100_000,      // $1,000.00 hard limit per transaction
  dailyLimitMinor: 250_000,         // $2,500.00 rolling daily spend limit per agent
  humanReviewAboveMinor: 50_000,     // >= $500.00 requires human review/approval
  allowedCurrencies: ["USD"],
  blockedRiskFlags: [
    "PROMPT_INJECTION_SUSPECTED",
    "SANCTIONED_ENTITY",
    "ANOMALOUS_VELOCITY",
    "UNVERIFIED_DELIVERABLE",
  ],
};

export type PolicyContext = {
  currentDailySpendMinor?: number;
  riskFlags?: string[];
};

/**
 * Deterministic policy evaluator.
 * Security decisions are 100% rule-based and can never be overridden by an LLM.
 *
 * @param intent Verified payment intent payload
 * @param policy Configuration rules (defaults to defaultPolicy)
 * @param context Additional evaluation context (e.g. cumulative daily spend, risk flags)
 */
export function evaluatePolicy(
  intent: SignedIntent & { riskFlags?: string[] },
  policy: PolicyConfig = defaultPolicy,
  context?: PolicyContext | number
): PolicyResult {
  // 1. Fail-closed: Payload structure validation
  if (!intent || typeof intent !== "object") {
    return {
      decision: "REJECTED",
      reason: "Invalid or missing intent payload.",
      reasonCode: "MALFORMED_INTENT"
    };
  }

  if (!intent.intentId || typeof intent.intentId !== "string" || !intent.intentId.trim()) {
    return { decision: "REJECTED", reason: "Missing or invalid intentId.", reasonCode: "MISSING_INTENT_ID" };
  }
  if (!intent.agentId || typeof intent.agentId !== "string" || !intent.agentId.trim()) {
    return { decision: "REJECTED", reason: "Missing or invalid agentId.", reasonCode: "MISSING_AGENT_ID" };
  }
  if (!intent.recipient || typeof intent.recipient !== "string" || !intent.recipient.trim()) {
    return { decision: "REJECTED", reason: "Missing or invalid recipient.", reasonCode: "MISSING_RECIPIENT" };
  }
  if (!intent.service || typeof intent.service !== "string" || !intent.service.trim()) {
    return { decision: "REJECTED", reason: "Missing or invalid service specification.", reasonCode: "MISSING_SERVICE" };
  }
  if (!intent.currency || typeof intent.currency !== "string" || !intent.currency.trim()) {
    return { decision: "REJECTED", reason: "Missing or invalid currency.", reasonCode: "MISSING_CURRENCY" };
  }

  // 2. Strict integer minor units check (fail closed on floating point or negative amounts)
  if (!Number.isSafeInteger(intent.amountMinor) || intent.amountMinor <= 0) {
    return {
      decision: "REJECTED",
      reason: "Amount must be a positive safe integer in minor currency units.",
      reasonCode: "INVALID_AMOUNT"
    };
  }

  // 3. Prevent self-payment loop
  if (intent.agentId.trim() === intent.recipient.trim()) {
    return {
      decision: "REJECTED",
      reason: "Self-payment is forbidden; agent cannot pay itself.",
      reasonCode: "SELF_PAYMENT_FORBIDDEN"
    };
  }

  // 4. Allowed currencies check
  const allowedCurrencies = (policy.allowedCurrencies ?? defaultPolicy.allowedCurrencies).map(c => c.toUpperCase());
  if (!allowedCurrencies.includes(intent.currency.toUpperCase())) {
    return {
      decision: "REJECTED",
      reason: "Currency is not allowed by policy.",
      reasonCode: "UNSUPPORTED_CURRENCY"
    };
  }

  // 5. Permitted recipients allowlist check
  if (policy.allowedRecipients && !policy.allowedRecipients.includes(intent.recipient)) {
    return {
      decision: "REJECTED",
      reason: "Recipient is not allowed by policy.",
      reasonCode: "UNAUTHORIZED_RECIPIENT"
    };
  }

  // 6. Blocked risk flags check (Prompt injection, velocity anomaly, sanctioned entity)
  const blockedFlags = new Set(
    (policy.blockedRiskFlags ?? defaultPolicy.blockedRiskFlags ?? []).map(f => f.toUpperCase())
  );
  const contextFlags = typeof context === "object" && Array.isArray(context?.riskFlags) ? context.riskFlags : [];
  const intentFlags = Array.isArray(intent.riskFlags) ? intent.riskFlags : [];
  const allFlags = [...intentFlags, ...contextFlags];

  for (const flag of allFlags) {
    if (typeof flag === "string" && blockedFlags.has(flag.toUpperCase())) {
      return {
        decision: "REJECTED",
        reason: `Transaction blocked due to security risk flag: ${flag}.`,
        reasonCode: `RISK_FLAG_${flag.toUpperCase()}`
      };
    }
  }

  // 7. Max per-transaction spending limit check
  if (intent.amountMinor > policy.maxTransactionMinor) {
    return {
      decision: "REJECTED",
      reason: "Transaction exceeds the per-transaction spending limit.",
      reasonCode: "EXCEEDS_MAX_TRANSACTION"
    };
  }

  // 8. Rolling daily spending limit check (Fixes the daily limit phantom bug)
  const currentDailySpend = typeof context === "number"
    ? context
    : (typeof context === "object" && typeof context?.currentDailySpendMinor === "number" ? context.currentDailySpendMinor : 0);

  if (currentDailySpend + intent.amountMinor > policy.dailyLimitMinor) {
    return {
      decision: "REJECTED",
      reason: "Transaction exceeds the daily spending limit for this agent.",
      reasonCode: "EXCEEDS_DAILY_LIMIT"
    };
  }

  // 9. Human approval threshold check
  if (intent.amountMinor >= policy.humanReviewAboveMinor) {
    return {
      decision: "REQUIRES_HUMAN_APPROVAL",
      reason: "Transaction requires human approval.",
      reasonCode: "HUMAN_APPROVAL_REQUIRED"
    };
  }

  // 10. All deterministic checks passed
  return {
    decision: "APPROVED",
    reason: "Transaction passed deterministic policy checks.",
    reasonCode: "POLICY_PASSED"
  };
}

/**
 * Calculates the cumulative spend in minor units for an agent over the last 24 hours.
 * Only includes authorized/in-flight transactions (excluding rejected/failed).
 */
export async function calculateAgentDailySpend(
  prismaClient: {
    paymentIntent: {
      findMany: (args: any) => Promise<Array<{ amountMinor: bigint | number }>>;
    };
  },
  agentId: string,
  now: Date = new Date()
): Promise<number> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const activeStatuses = [
    "AWAITING_APPROVAL",
    "READY_FOR_PAYMENT",
    "ORDER_CREATED",
    "AWAITING_BUYER_APPROVAL",
    "CAPTURE_PENDING",
    "COMPLETED"
  ];

  try {
    const intents = await prismaClient.paymentIntent.findMany({
      where: {
        agentId,
        createdRecordAt: { gte: since },
        status: { in: activeStatuses }
      },
      select: { amountMinor: true }
    });

    return intents.reduce((acc, cur) => acc + Number(cur.amountMinor), 0);
  } catch {
    return 0;
  }
}
