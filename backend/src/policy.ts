import type { SignedIntent } from "./crypto/intent.js";

export type PolicyResult = {
  decision: "APPROVED" | "REJECTED" | "REQUIRES_HUMAN_APPROVAL";
  reason: string;
};

export type PolicyConfig = {
  maxTransactionMinor: number;
  dailyLimitMinor: number;
  humanReviewAboveMinor: number;
  allowedCurrencies: string[];
  allowedRecipients?: string[];
};

export const defaultPolicy: PolicyConfig = {
  maxTransactionMinor: 100_000,
  dailyLimitMinor: 250_000,
  humanReviewAboveMinor: 50_000,
  allowedCurrencies: ["USD"],
};

export function evaluatePolicy(intent: SignedIntent, policy: PolicyConfig = defaultPolicy): PolicyResult {
  if (!Number.isSafeInteger(intent.amountMinor) || intent.amountMinor <= 0) {
    return { decision: "REJECTED", reason: "Amount must be a positive safe integer in minor currency units." };
  }
  if (!policy.allowedCurrencies.includes(intent.currency.toUpperCase())) {
    return { decision: "REJECTED", reason: "Currency is not allowed by policy." };
  }
  if (intent.amountMinor > policy.maxTransactionMinor) {
    return { decision: "REJECTED", reason: "Transaction exceeds the per-transaction spending limit." };
  }
  if (policy.allowedRecipients && !policy.allowedRecipients.includes(intent.recipient)) {
    return { decision: "REJECTED", reason: "Recipient is not allowed by policy." };
  }
  if (intent.amountMinor >= policy.humanReviewAboveMinor) {
    return { decision: "REQUIRES_HUMAN_APPROVAL", reason: "Transaction requires human approval." };
  }
  return { decision: "APPROVED", reason: "Transaction passed deterministic policy checks." };
}
