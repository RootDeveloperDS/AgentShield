import { describe, expect, it } from "vitest";
import {
  generateEd25519KeyPair,
  signIntent,
  verifyIntentSignature,
  generateChallenge,
  signChallenge,
  verifyChallengeSignature,
  validateIntentTiming,
  type SignedIntent
} from "../src/crypto/intent.js";

const now = 1_760_000_000_000;

const baseIntent: SignedIntent = {
  intentId: "intent-test-1",
  agentId: "agent-test",
  recipient: "merchant-1",
  service: "gpu-cluster-lease",
  amountMinor: 2500,
  currency: "USD",
  createdAt: new Date(now).toISOString(),
  expiresAt: new Date(now + 120_000).toISOString(), // 2 minutes
  nonce: "nonce-test-unique-123"
};

describe("Ed25519 Cryptographic Intent Verification", () => {
  it("verifies a valid canonical signature", () => {
    const pair = generateEd25519KeyPair();
    const signature = signIntent(baseIntent, pair.privateKeyPem);
    expect(verifyIntentSignature(baseIntent, signature, pair.publicKeyPem)).toBe(true);
  });

  it("rejects when transaction amount is tampered", () => {
    const pair = generateEd25519KeyPair();
    const signature = signIntent(baseIntent, pair.privateKeyPem);
    const tampered = { ...baseIntent, amountMinor: 999999 };
    expect(verifyIntentSignature(tampered, signature, pair.publicKeyPem)).toBe(false);
  });

  it("rejects when recipient is tampered", () => {
    const pair = generateEd25519KeyPair();
    const signature = signIntent(baseIntent, pair.privateKeyPem);
    const tampered = { ...baseIntent, recipient: "hacker-wallet-99" };
    expect(verifyIntentSignature(tampered, signature, pair.publicKeyPem)).toBe(false);
  });

  it("rejects when nonce is tampered", () => {
    const pair = generateEd25519KeyPair();
    const signature = signIntent(baseIntent, pair.privateKeyPem);
    const tampered = { ...baseIntent, nonce: "forged-nonce-value" };
    expect(verifyIntentSignature(tampered, signature, pair.publicKeyPem)).toBe(false);
  });

  it("rejects signature signed by a different agent private key", () => {
    const realAgent = generateEd25519KeyPair();
    const attacker = generateEd25519KeyPair();
    const attackerSignature = signIntent(baseIntent, attacker.privateKeyPem);
    expect(verifyIntentSignature(baseIntent, attackerSignature, realAgent.publicKeyPem)).toBe(false);
  });
});

describe("Agent Registration Challenge-Response Key Proof", () => {
  it("generates a 64-character hex cryptographic challenge", () => {
    const challenge1 = generateChallenge();
    const challenge2 = generateChallenge();
    expect(challenge1).toHaveLength(64);
    expect(challenge2).toHaveLength(64);
    expect(challenge1).not.toBe(challenge2);
  });

  it("verifies valid challenge signature proving private key ownership", () => {
    const pair = generateEd25519KeyPair();
    const challenge = generateChallenge();
    const signature = signChallenge(challenge, pair.privateKeyPem);
    const verified = verifyChallengeSignature(challenge, signature, pair.publicKeyPem);
    expect(verified).toBe(true);
  });

  it("rejects challenge signature when signed by a rogue private key", () => {
    const legitimateAgent = generateEd25519KeyPair();
    const impostorAgent = generateEd25519KeyPair();
    const challenge = generateChallenge();

    // Impostor tries to sign the challenge using their own private key
    const forgedSignature = signChallenge(challenge, impostorAgent.privateKeyPem);

    // Verification fails against the legitimate agent's public key
    const verified = verifyChallengeSignature(challenge, forgedSignature, legitimateAgent.publicKeyPem);
    expect(verified).toBe(false);
  });

  it("rejects challenge signature if challenge token is modified", () => {
    const pair = generateEd25519KeyPair();
    const challenge = generateChallenge();
    const signature = signChallenge(challenge, pair.privateKeyPem);

    const verified = verifyChallengeSignature("different-challenge-value", signature, pair.publicKeyPem);
    expect(verified).toBe(false);
  });
});

describe("Intent Timing Bounds & Clock-Skew Protection", () => {
  it("accepts an intent within normal 2-minute validity window", () => {
    const timing = validateIntentTiming(baseIntent, now);
    expect(timing.valid).toBe(true);
  });

  it("rejects an intent that has already expired", () => {
    const expiredIntent = {
      ...baseIntent,
      createdAt: new Date(now - 120_000).toISOString(),
      expiresAt: new Date(now - 1_000).toISOString() // Expired 1 second ago
    };
    const timing = validateIntentTiming(expiredIntent, now);
    expect(timing.valid).toBe(false);
    expect(timing.reasonCode).toBe("INTENT_EXPIRED");
  });

  it("rejects an intent issued in the future beyond allowed 30s clock skew", () => {
    const futureIntent = {
      ...baseIntent,
      createdAt: new Date(now + 45_000).toISOString(), // 45s in future (> 30s allowed drift)
      expiresAt: new Date(now + 120_000).toISOString()
    };
    const timing = validateIntentTiming(futureIntent, now);
    expect(timing.valid).toBe(false);
    expect(timing.reasonCode).toBe("ISSUED_IN_FUTURE");
  });

  it("tolerates minor clock drift up to 30 seconds into future", () => {
    const slightlyFutureIntent = {
      ...baseIntent,
      createdAt: new Date(now + 15_000).toISOString(), // 15s in future (<= 30s allowed)
      expiresAt: new Date(now + 120_000).toISOString()
    };
    const timing = validateIntentTiming(slightlyFutureIntent, now);
    expect(timing.valid).toBe(true);
  });

  it("rejects logically inverted timestamps (expiresAt <= createdAt)", () => {
    const invertedIntent = {
      ...baseIntent,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now - 10_000).toISOString()
    };
    const timing = validateIntentTiming(invertedIntent, now);
    expect(timing.valid).toBe(false);
    expect(timing.reasonCode).toBe("EXPIRY_BEFORE_CREATED_AT");
  });

  it("rejects intents exceeding maximum allowed 5-minute validity window", () => {
    const longLivedIntent = {
      ...baseIntent,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 300_001).toISOString() // 5 minutes + 1 ms
    };
    const timing = validateIntentTiming(longLivedIntent, now);
    expect(timing.valid).toBe(false);
    expect(timing.reasonCode).toBe("VALIDITY_WINDOW_EXCEEDED");
  });

  it("fails closed on invalid timestamp format strings", () => {
    const malformed = {
      createdAt: "not-a-date",
      expiresAt: "invalid"
    };
    const timing = validateIntentTiming(malformed, now);
    expect(timing.valid).toBe(false);
    expect(timing.reasonCode).toBe("INVALID_TIMESTAMP_FORMAT");
  });
});
