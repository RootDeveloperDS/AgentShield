import { describe, expect, it } from "vitest";
import { evaluatePolicy, calculateAgentDailySpend, defaultPolicy } from "../src/policy.js";
import type { SignedIntent } from "../src/crypto/intent.js";

const base: SignedIntent = {
  intentId: "intent-001",
  agentId: "agent-buyer-01",
  recipient: "agent-service-02",
  service: "gpu-cluster-provision",
  amountMinor: 1000, // $10.00
  currency: "USD",
  createdAt: "2026-10-31T12:00:00.000Z",
  expiresAt: "2026-10-31T12:05:00.000Z",
  nonce: "unique-nonce-12345678"
};

describe("Deterministic Policy Engine — Positive Scenarios", () => {
  it("approves a valid, fresh payment intent within automatic limits", () => {
    const result = evaluatePolicy(base);
    expect(result.decision).toBe("APPROVED");
    expect(result.reasonCode).toBe("POLICY_PASSED");
    expect(result.reason).toContain("passed deterministic policy checks");
  });

  it("handles currency check case-insensitively for allowed currencies", () => {
    const lowerCurrencyIntent = { ...base, currency: "usd" };
    const result = evaluatePolicy(lowerCurrencyIntent);
    expect(result.decision).toBe("APPROVED");
  });

  it("approves when recipient is explicitly in custom allowedRecipients list", () => {
    const customPolicy = {
      ...defaultPolicy,
      allowedRecipients: ["agent-service-02", "agent-data-03"]
    };
    const result = evaluatePolicy(base, customPolicy);
    expect(result.decision).toBe("APPROVED");
  });

  it("triggers REQUIRES_HUMAN_APPROVAL when amount reaches or exceeds human review threshold ($500.00)", () => {
    const highValueIntent = { ...base, amountMinor: 50_000 }; // $500.00
    const result = evaluatePolicy(highValueIntent);
    expect(result.decision).toBe("REQUIRES_HUMAN_APPROVAL");
    expect(result.reasonCode).toBe("HUMAN_APPROVAL_REQUIRED");
    expect(result.reason).toContain("requires human approval");
  });

  it("allows multiple payments as long as cumulative daily spend remains within budget", () => {
    // Current spend is $2,000 (200,000 cents), new intent is $400 (40,000 cents) -> total $2,400 <= $2,500 limit
    const result = evaluatePolicy({ ...base, amountMinor: 40_000 }, defaultPolicy, {
      currentDailySpendMinor: 200_000
    });
    expect(result.decision).toBe("APPROVED");
  });
});

describe("Deterministic Policy Engine — Negative Rejection Scenarios", () => {
  it("rejects binary floating-point amounts (must be integer minor units)", () => {
    const floatIntent = { ...base, amountMinor: 25.50 as unknown as number };
    const result = evaluatePolicy(floatIntent);
    expect(result.decision).toBe("REJECTED");
    expect(result.reasonCode).toBe("INVALID_AMOUNT");
    expect(result.reason).toContain("positive safe integer");
  });

  it("rejects zero or negative payment amounts", () => {
    const zeroResult = evaluatePolicy({ ...base, amountMinor: 0 });
    expect(zeroResult.decision).toBe("REJECTED");
    expect(zeroResult.reasonCode).toBe("INVALID_AMOUNT");

    const negativeResult = evaluatePolicy({ ...base, amountMinor: -500 });
    expect(negativeResult.decision).toBe("REJECTED");
    expect(negativeResult.reasonCode).toBe("INVALID_AMOUNT");
  });

  it("rejects self-payment loops where payer equals recipient", () => {
    const selfPaymentIntent = { ...base, recipient: "agent-buyer-01" };
    const result = evaluatePolicy(selfPaymentIntent);
    expect(result.decision).toBe("REJECTED");
    expect(result.reasonCode).toBe("SELF_PAYMENT_FORBIDDEN");
    expect(result.reason).toContain("cannot pay itself");
  });

  it("rejects unsupported currencies", () => {
    const eurIntent = { ...base, currency: "EUR" };
    const result = evaluatePolicy(eurIntent);
    expect(result.decision).toBe("REJECTED");
    expect(result.reasonCode).toBe("UNSUPPORTED_CURRENCY");
  });

  it("rejects recipients not on the allowedRecipients allowlist", () => {
    const customPolicy = {
      ...defaultPolicy,
      allowedRecipients: ["trusted-vendor-99"]
    };
    const result = evaluatePolicy(base, customPolicy);
    expect(result.decision).toBe("REJECTED");
    expect(result.reasonCode).toBe("UNAUTHORIZED_RECIPIENT");
  });

  it("rejects when transaction amount exceeds per-transaction limit ($1,000.00)", () => {
    const overLimitIntent = { ...base, amountMinor: 100_001 }; // $1,000.01
    const result = evaluatePolicy(overLimitIntent);
    expect(result.decision).toBe("REJECTED");
    expect(result.reasonCode).toBe("EXCEEDS_MAX_TRANSACTION");
  });

  it("rejects when cumulative daily spending limit ($2,500.00) is exceeded", () => {
    // Current spend is $2,490 (249,000 cents), new intent is $20 (2,000 cents) -> total $2,510 > $2,500
    const result = evaluatePolicy({ ...base, amountMinor: 2_000 }, defaultPolicy, {
      currentDailySpendMinor: 249_000
    });
    expect(result.decision).toBe("REJECTED");
    expect(result.reasonCode).toBe("EXCEEDS_DAILY_LIMIT");
    expect(result.reason).toContain("exceeds the daily spending limit");
  });

  it("rejects intent containing security risk flag PROMPT_INJECTION_SUSPECTED", () => {
    const riskyIntent = {
      ...base,
      riskFlags: ["PROMPT_INJECTION_SUSPECTED"]
    };
    const result = evaluatePolicy(riskyIntent);
    expect(result.decision).toBe("REJECTED");
    expect(result.reasonCode).toBe("RISK_FLAG_PROMPT_INJECTION_SUSPECTED");
    expect(result.reason).toContain("security risk flag");
  });

  it("rejects intent containing security risk flag SANCTIONED_ENTITY in context", () => {
    const result = evaluatePolicy(base, defaultPolicy, {
      riskFlags: ["SANCTIONED_ENTITY"]
    });
    expect(result.decision).toBe("REJECTED");
    expect(result.reasonCode).toBe("RISK_FLAG_SANCTIONED_ENTITY");
  });

  it("fails closed on missing required fields or malformed payload", () => {
    expect(evaluatePolicy(null as unknown as SignedIntent).decision).toBe("REJECTED");
    expect(evaluatePolicy({} as unknown as SignedIntent).decision).toBe("REJECTED");

    const missingService = { ...base, service: "" };
    const serviceResult = evaluatePolicy(missingService);
    expect(serviceResult.decision).toBe("REJECTED");
    expect(serviceResult.reasonCode).toBe("MISSING_SERVICE");

    const missingRecipient = { ...base, recipient: "   " };
    const recipientResult = evaluatePolicy(missingRecipient);
    expect(recipientResult.decision).toBe("REJECTED");
    expect(recipientResult.reasonCode).toBe("MISSING_RECIPIENT");
  });
});

describe("Rolling 24-Hour Daily Spend Aggregator", () => {
  it("correctly aggregates authorized transactions within the last 24 hours", async () => {
    const now = new Date("2026-10-31T12:00:00.000Z");

    const mockPrisma = {
      paymentIntent: {
        findMany: async (args: any) => {
          // Verify query parameters enforce 24h filter and active statuses
          expect(args.where.agentId).toBe("agent-buyer-01");
          expect(args.where.status.in).toContain("COMPLETED");
          expect(args.where.status.in).toContain("AWAITING_APPROVAL");
          expect(args.where.status.in).not.toContain("REJECTED");
          expect(args.where.status.in).not.toContain("FAILED");

          return [
            { amountMinor: BigInt(2500) },  // $25.00
            { amountMinor: BigInt(10000) }, // $100.00
            { amountMinor: BigInt(5000) }   // $50.00
          ];
        }
      }
    };

    const totalSpend = await calculateAgentDailySpend(mockPrisma, "agent-buyer-01", now);
    expect(totalSpend).toBe(17500); // 17,500 minor units ($175.00)
  });

  it("gracefully returns 0 if database query encounters an error", async () => {
    const brokenPrisma = {
      paymentIntent: {
        findMany: async () => {
          throw new Error("DB Connection Error");
        }
      }
    };

    const totalSpend = await calculateAgentDailySpend(brokenPrisma, "agent-buyer-01");
    expect(totalSpend).toBe(0);
  });
});
