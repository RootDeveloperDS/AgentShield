import {
  createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify
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

export function canonicalizeIntent(intent: SignedIntent): string {
  // Fixed field order is part of the signature protocol. Do not change without versioning.
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

export function generateEd25519KeyPair() {
  const pair = generateKeyPairSync("ed25519");
  return {
    publicKeyPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKeyPem: pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString()
  };
}

export function signIntent(intent: SignedIntent, privateKeyPem: string): string {
  const key = createPrivateKey(privateKeyPem);
  return sign(null, Buffer.from(canonicalizeIntent(intent)), key).toString("base64");
}

export function verifyIntentSignature(intent: SignedIntent, signatureBase64: string, publicKeyPem: string): boolean {
  try {
    const key = createPublicKey(publicKeyPem);
    return verify(null, Buffer.from(canonicalizeIntent(intent)), key, Buffer.from(signatureBase64, "base64"));
  } catch {
    return false;
  }
}
