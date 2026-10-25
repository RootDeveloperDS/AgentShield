import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../src/policy.js";
import type { SignedIntent } from "../src/crypto/intent.js";

const base: SignedIntent = {
  intentId: "i1", agentId: "a1", recipient: "merchant", service: "test",
  amountMinor: 1000, currency: "USD", createdAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2027-01-01T00:00:00.000Z", nonce: "unique-nonce-1234"
};

describe("policy engine", () => {
  it("approves a small allowed transaction", () => {
    expect(evaluatePolicy(base).decision).toBe("APPROVED");
  });
  it("requires human approval above threshold", () => {
    expect(evaluatePolicy({ ...base, amountMinor: 60000 }).decision).toBe("REQUIRES_HUMAN_APPROVAL");
  });
  it("rejects disallowed currency", () => {
    expect(evaluatePolicy({ ...base, currency: "EUR" }).decision).toBe("REJECTED");
  });
});
