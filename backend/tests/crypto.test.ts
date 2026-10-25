import { describe, expect, it } from "vitest";
import { generateEd25519KeyPair, signIntent, verifyIntentSignature, type SignedIntent } from "../src/crypto/intent.js";

const intent: SignedIntent = {
  intentId: "intent-test-1", agentId: "agent-test", recipient: "merchant-1", service: "demo",
  amountMinor: 1250, currency: "USD", createdAt: "2026-01-01T12:00:00.000Z",
  expiresAt: "2027-01-01T12:00:00.000Z", nonce: "nonce-test-unique-123"
};

describe("Ed25519 signed intents", () => {
  it("verifies a valid signature", () => {
    const pair = generateEd25519KeyPair();
    const signature = signIntent(intent, pair.privateKeyPem);
    expect(verifyIntentSignature(intent, signature, pair.publicKeyPem)).toBe(true);
  });
  it("rejects a tampered amount", () => {
    const pair = generateEd25519KeyPair();
    const signature = signIntent(intent, pair.privateKeyPem);
    expect(verifyIntentSignature({ ...intent, amountMinor: 99999 }, signature, pair.publicKeyPem)).toBe(false);
  });
});
