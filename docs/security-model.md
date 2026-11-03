# Security Model & Threat Mitigation

AgentShield enforces a zero-trust security architecture designed specifically for autonomous AI agents. This document explains the primary security controls and threat mitigations.

---

## 1. Cryptographic Identity & Key Proof

Every agent in AgentShield operates with an asymmetric **Ed25519** public/private key pair.

### Why Ed25519?
* High performance (fast signature generation and verification).
* Constant-time execution prevents timing side-channel attacks.
* Compact 32-byte public keys and 64-byte signatures.

### Challenge-Response Handshake
To prevent **identity squatting** (an impostor registering an agent name using someone else's public key), AgentShield enforces a two-step challenge-response handshake:

```text
  [ AI Agent ]                                     [ AgentShield Server ]
       │                                                     │
       │ 1. POST /api/agents/challenge { agentId }           │
       │────────────────────────────────────────────────────►│
       │                                                     │ Generates 64-char
       │ 2. Returns { challenge, expiresAt } (60s TTL)       │ random token
       │◄────────────────────────────────────────────────────│
       │                                                     │
       │ Signs token with private key:                       │
       │ signature = sign("AgentShield-Registration-Challenge:" + token)
       │                                                     │
       │ 3. POST /api/agents { id, name, publicKey, challenge, signatureBase64 }
       │────────────────────────────────────────────────────►│
       │                                                     │ 4. Verifies signature
       │                                                     │    against publicKey
       │ 5. Agent Registered (verifiedOwnership: true)       │    Consumes token
       │◄────────────────────────────────────────────────────│
```

---

## 2. Canonical Intent Serialization

When an agent requests a payment, it signs a canonical JSON representation of the payment intent.

### Deterministic Field Ordering
JSON object key order can vary across programming languages and JSON parsers. AgentShield defines a strict canonical representation:

```json
{
  "intentId": "intent-sample-101",
  "agentId": "agent_alpha_01",
  "recipient": "agent_cloud_compute",
  "service": "gpu_cluster_provision_1hr",
  "amountMinor": 2500,
  "currency": "USD",
  "createdAt": "2026-11-01T12:00:00.000Z",
  "expiresAt": "2026-11-01T12:05:00.000Z",
  "nonce": "nonce_random_987654321012"
}
```

* If an attacker alters the `amountMinor` (e.g. changing 2,500 cents to 250,000 cents), the signature verification fails.
* If an attacker redirects the payment by changing the `recipient`, the signature verification fails.

---

## 3. Timing Bounds & Clock-Skew Protection

Every payment intent includes `createdAt` and `expiresAt` timestamps. AgentShield enforces three mathematical boundaries:

1. **Logical Ordering:** `expiresAt` must be strictly greater than `createdAt`.
2. **Clock-Skew Tolerance:** `createdAt` cannot be in the future by more than **30 seconds** (accommodating minor NTP server clock drift while blocking time-travel attacks).
3. **Maximum Validity Window:** An intent cannot have a lifetime exceeding **5 minutes (300,000 ms)**. This prevents attackers from holding signed "zombie" payment intents indefinitely.

---

## 4. Replay Resistance (Atomic Nonce Consumption)

A **replay attack** occurs when an attacker copies a legitimate signed payment intent and submits it multiple times to drain an account.

### Mitigation:
* Every intent must include a cryptographically random, unique `nonce` (minimum 12 characters).
* When a verified intent is recorded in PostgreSQL, Prisma enforces a **unique database constraint** on the `nonce` column.
* If a duplicate nonce is received, the database rejects the insertion with a unique constraint violation (`P2002`), immediately returning `409 Conflict: Intent ID or nonce already consumed; replay rejected.`

---

## 5. Deterministic Policy Engine

The policy engine is **100% deterministic code** with zero LLM decision-making.

| Policy Rule | Limit / Behavior | Reason for Rule |
| :--- | :--- | :--- |
| **Integer Minor Units** | Strict positive safe integer (cents) | Eliminates binary floating-point rounding bugs ($25.50 must be `2550`). |
| **Currency Allowlist** | Allowed: `["USD"]` | Blocks volatile or unsupported currencies. |
| **Recipient Allowlist** | Verified merchant IDs only | Prevents payments to unverified or unauthorized accounts. |
| **Self-Payment Prevention**| `agentId !== recipient` | Blocks cyclic payment loops where an agent sends funds to itself. |
| **Single Transaction Limit**| $1,000.00 max (`100,000` cents) | Caps the maximum exposure of any individual transaction. |
| **Rolling 24-Hour Limit** | $2,500.00 max (`250,000` cents) | Aggregates all approved spend over rolling 24 hours to prevent budget drain. |
| **Human Review Threshold** | $\ge \$500.00$ (`50,000` cents) | High-value payments require human buyer confirmation via dashboard. |
| **Security Risk Flags** | Rejects `PROMPT_INJECTION_SUSPECTED`, `SANCTIONED_ENTITY`, etc. | Allows upstream filters to flag anomalous behavior before money moves. |

---

## Threat Matrix

| Threat | Attack Scenario | AgentShield Mitigation |
| :--- | :--- | :--- |
| **Agent Impersonation** | Attacker registers an agent using a target's public key | **Challenge-Response:** Server requires signing a short-lived random token before registration. |
| **Intent Tampering** | Attacker alters amount from $10 to $1,000 in transit | **Ed25519 Canonical Signature:** Signature binds all intent fields; alteration breaks signature check. |
| **Replay Attack** | Attacker resends a valid $10 payment 50 times | **Unique Nonce Constraint:** Database uniqueness constraint rejects duplicate nonces atomically. |
| **Zombie Intents** | Attacker holds a signed intent and submits it 6 months later | **5-Minute Validity Window:** Rejects any intent with a lifetime exceeding 300,000 ms. |
| **Time Travel Manipulation** | Attacker issues intents dated in the future | **Clock-Skew Guard:** Rejects intents created more than 30 seconds into the future. |
| **Runaway Agent Spend** | A compromised or looping agent sends 500 small transactions | **Rolling 24-Hour Limit:** Enforces hard $2,500.00 daily spend limit across active transactions. |
| **Prompt Injection Hijack** | An LLM is tricked into approving a rogue payment | **Deterministic Engine:** Hardcoded mathematical rules evaluate limits; LLMs cannot override. |
| **Forged Payment Success** | Attacker claims PayPal completed without proof | **Authoritative Capture Evidence:** Receipts are only issued when PayPal returns `COMPLETED`. |
