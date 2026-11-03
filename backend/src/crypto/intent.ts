import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  randomBytes
} from "node:crypto";

export type SignedIntent = {
  intentId: string;
  agentId: string;
  recipient: string;
  service: string;
  amountMinor: number;
  currency: string;
  createdAt: string;
  expiresAt: string;
  nonce: string;
};

/**
 * Deterministic JSON canonicalization.
 * Fixed field order is part of the cryptographic signature protocol.
 */
export function canonicalizeIntent(intent: SignedIntent): string {
  return JSON.stringify({
    intentId: intent.intentId,
    agentId: intent.agentId,
    recipient: intent.recipient,
    service: intent.service,
    amountMinor: intent.amountMinor,
    currency: intent.currency.toUpperCase(),
    createdAt: intent.createdAt,
    expiresAt: intent.expiresAt,
    nonce: intent.nonce
  });
}

/**
 * Generates an Ed25519 public/private key pair in standard PEM format.
 */
export function generateEd25519KeyPair() {
  const pair = generateKeyPairSync("ed25519");
  return {
    publicKeyPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKeyPem: pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString()
  };
}

/**
 * Signs a canonical payment intent using an agent's Ed25519 private key.
 */
export function signIntent(intent: SignedIntent, privateKeyPem: string): string {
  const key = createPrivateKey(privateKeyPem);
  return sign(null, Buffer.from(canonicalizeIntent(intent)), key).toString("base64");
}

/**
 * Verifies an Ed25519 signature over a canonical payment intent.
 */
export function verifyIntentSignature(intent: SignedIntent, signatureBase64: string, publicKeyPem: string): boolean {
  try {
    const key = createPublicKey(publicKeyPem);
    return verify(null, Buffer.from(canonicalizeIntent(intent)), key, Buffer.from(signatureBase64, "base64"));
  } catch {
    return false;
  }
}

/**
 * Generates an unpredictable 32-byte cryptographic challenge token for agent registration proof.
 */
export function generateChallenge(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Cryptographically signs a registration challenge using an agent's private key.
 * Prepends a domain-separation prefix to prevent cross-protocol signature reuse.
 */
export function signChallenge(challenge: string, privateKeyPem: string): string {
  const key = createPrivateKey(privateKeyPem);
  const message = Buffer.from(`AgentShield-Registration-Challenge:${challenge}`);
  return sign(null, message, key).toString("base64");
}

/**
 * Verifies that a challenge was signed by the holder of the corresponding public key.
 */
export function verifyChallengeSignature(challenge: string, signatureBase64: string, publicKeyPem: string): boolean {
  try {
    const key = createPublicKey(publicKeyPem);
    const message = Buffer.from(`AgentShield-Registration-Challenge:${challenge}`);
    return verify(null, message, key, Buffer.from(signatureBase64, "base64"));
  } catch {
    return false;
  }
}

export type TimingValidationResult = {
  valid: boolean;
  reason?: string;
  reasonCode?: string;
};

export type TimingOptions = {
  maxClockSkewMs?: number;       // Default: 30 seconds
  maxValidityWindowMs?: number;  // Default: 5 minutes (300,000 ms)
};

/**
 * Validates timestamp ordering, expiration, clock skew, and validity window boundaries.
 */
export function validateIntentTiming(
  intent: { createdAt: string; expiresAt: string },
  nowMs: number = Date.now(),
  options: TimingOptions = {}
): TimingValidationResult {
  const maxClockSkewMs = options.maxClockSkewMs ?? 30_000;
  const maxValidityWindowMs = options.maxValidityWindowMs ?? 300_000;

  const createdMs = typeof intent.createdAt === "number" ? intent.createdAt : Date.parse(intent.createdAt);
  const expiresMs = typeof intent.expiresAt === "number" ? intent.expiresAt : Date.parse(intent.expiresAt);

  if (Number.isNaN(createdMs) || Number.isNaN(expiresMs)) {
    return {
      valid: false,
      reason: "Invalid timestamp format on intent.",
      reasonCode: "INVALID_TIMESTAMP_FORMAT"
    };
  }

  // 1. Logical ordering check
  if (expiresMs <= createdMs) {
    return {
      valid: false,
      reason: "Intent expiration must be strictly after creation time.",
      reasonCode: "EXPIRY_BEFORE_CREATED_AT"
    };
  }

  // 2. Clock-skew bound: intent cannot be issued in the future beyond allowed drift
  if (createdMs > nowMs + maxClockSkewMs) {
    return {
      valid: false,
      reason: "Intent creation time is in the future beyond allowed clock skew.",
      reasonCode: "ISSUED_IN_FUTURE"
    };
  }

  // 3. Expiration check: must not be expired
  if (nowMs >= expiresMs) {
    return {
      valid: false,
      reason: "Intent has expired.",
      reasonCode: "INTENT_EXPIRED"
    };
  }

  // 4. Maximum validity window: intent cannot live longer than max allowed lifetime
  if (expiresMs - createdMs > maxValidityWindowMs) {
    return {
      valid: false,
      reason: "Intent validity window exceeds maximum allowed 5 minutes.",
      reasonCode: "VALIDITY_WINDOW_EXCEEDED"
    };
  }

  return { valid: true };
}
