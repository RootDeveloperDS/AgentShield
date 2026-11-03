# REST API Reference

The AgentShield API operates on HTTP/JSON. All monetary amounts are represented as **integer minor units** (e.g. cents for USD: `100` = $1.00 USD).

* **Default Base URL:** `http://localhost:4000`
* **Default Port:** `4000`
* **Content-Type:** `application/json`

---

## Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | API service health check and PayPal configuration status |
| `POST` | `/api/agents/challenge` | Request a cryptographic registration challenge token |
| `POST` | `/api/agents` | Register a new agent (supports verified challenge proof) |
| `GET` | `/api/agents` | List all registered agents and their statuses |
| `POST` | `/api/intents/verify` | Verify Ed25519 intent signature and evaluate policy rules |
| `GET` | `/api/approvals` | List transactions awaiting human buyer approval |
| `POST` | `/api/approvals/:intentId` | Approve or reject a flagged transaction |
| `GET` | `/api/transactions` | Query recent transaction records and execution states |
| `GET` | `/api/audit` | Query immutable audit log events |
| `POST` | `/api/paypal/orders` | Create a PayPal Orders v2 order for an approved intent |
| `POST` | `/api/paypal/orders/:orderId/capture` | Capture an approved PayPal order on the server |

---

## 1. System Health

### `GET /health`
Returns the operational readiness of the API and indicates whether PayPal Sandbox credentials are configured.

#### Response (`200 OK`)
```json
{
  "ok": true,
  "service": "agentshield-api",
  "paypal": "not_configured"
}
```

---

## 2. Agent Registration & Key Lifecycle

### `POST /api/agents/challenge`
Generates a short-lived (60-second) cryptographic challenge token. The agent must sign this token using its Ed25519 private key to prove key ownership.

#### Request Body
```json
{
  "agentId": "agent_alpha_01"
}
```

#### Response (`201 Created`)
```json
{
  "challenge": "4f9b8c2e1a7d6e5f8a0b3c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
  "agentId": "agent_alpha_01",
  "expiresAt": "2026-11-01T12:01:00.000Z",
  "instructions": "Sign this challenge with your private key and supply signatureBase64 to POST /api/agents to prove key ownership."
}
```

---

### `POST /api/agents`
Registers an agent ID with its public key. If `challenge` and `signatureBase64` are provided, the server cryptographically verifies private key ownership before registration.

#### Request Body
```json
{
  "id": "agent_alpha_01",
  "name": "Alpha Research Agent",
  "publicKey": "MCowBQYDK2VwAyEAGb9ECWPuFvAQWQ4wnONSdf5leUk2ZSG2KuDdUmTzA6M=",
  "challenge": "4f9b8c2e1a7d6e5f8a0b3c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
  "signatureBase64": "MEUCIQD..."
}
```

#### Response (`201 Created`)
```json
{
  "id": "agent_alpha_01",
  "name": "Alpha Research Agent",
  "status": "ACTIVE",
  "createdAt": "2026-11-01T12:00:30.000Z",
  "updatedAt": "2026-11-01T12:00:30.000Z",
  "verifiedOwnership": true
}
```

#### Error Responses
* `400 Bad Request`: `CHALLENGE_EXPIRED` (Challenge TTL exceeded).
* `403 Forbidden`: `INVALID_CHALLENGE_SIGNATURE` (Signature does not correspond to public key).
* `409 Conflict`: Agent ID already registered.

---

### `GET /api/agents`
Lists all registered agents, omitting raw private metadata.

#### Response (`200 OK`)
```json
[
  {
    "id": "agent_alpha_01",
    "name": "Alpha Research Agent",
    "status": "ACTIVE",
    "createdAt": "2026-11-01T12:00:30.000Z",
    "updatedAt": "2026-11-01T12:00:30.000Z"
  }
]
```

---

## 3. Intent Verification & Policy Evaluation

### `POST /api/intents/verify`
The core security gateway endpoint. Validates Ed25519 signature, checks nonce uniqueness, enforces timing boundaries, and evaluates deterministic policy rules.

#### Request Body
```json
{
  "intent": {
    "intentId": "intent-sample-101",
    "agentId": "agent_alpha_01",
    "recipient": "agent_cloud_compute",
    "service": "gpu_cluster_provision_1hr",
    "amountMinor": 2500,
    "currency": "USD",
    "createdAt": "2026-11-01T12:00:00.000Z",
    "expiresAt": "2026-11-01T12:05:00.000Z",
    "nonce": "nonce_random_987654321012"
  },
  "signatureBase64": "MEUCIQ..."
}
```

#### Response (`200 OK` — Approved)
```json
{
  "intentId": "intent-sample-101",
  "decision": "APPROVED",
  "reason": "Transaction passed deterministic policy checks.",
  "reasonCode": "POLICY_PASSED"
}
```

#### Response (`200 OK` — Requires Human Approval)
```json
{
  "intentId": "intent-sample-101",
  "decision": "REQUIRES_HUMAN_APPROVAL",
  "reason": "Transaction requires human approval.",
  "reasonCode": "HUMAN_APPROVAL_REQUIRED"
}
```

#### Error Responses
* `400 Bad Request`: Expired intent, clock skew violation, or invalid timestamp ordering.
* `403 Forbidden`: Invalid signature, revoked agent key, or policy denial (e.g. daily limit exceeded).
* `409 Conflict`: Replay attack detected (duplicate nonce or intent ID).

---

## 4. Human Approval Workflow

### `GET /api/approvals`
Lists all transactions currently held in the `AWAITING_APPROVAL` queue.

#### Response (`200 OK`)
```json
[
  {
    "id": "intent-sample-202",
    "agentId": "agent_alpha_01",
    "recipient": "agent_dataset_provider",
    "amountMinor": "65000",
    "currency": "USD",
    "status": "AWAITING_APPROVAL",
    "decisionReason": "Transaction requires human approval."
  }
]
```

---

### `POST /api/approvals/:intentId`
Human buyer approves or rejects a queued transaction.

#### Request Body
```json
{
  "approved": true
}
```

#### Response (`200 OK`)
```json
{
  "id": "intent-sample-202",
  "status": "READY_FOR_PAYMENT",
  "decisionReason": "Human approved."
}
```

---

## 5. Audit & State Queries

### `GET /api/transactions`
Returns the 100 most recent transaction records.

#### Response (`200 OK`)
```json
[
  {
    "id": "intent-sample-101",
    "agentId": "agent_alpha_01",
    "recipient": "agent_cloud_compute",
    "amountMinor": "2500",
    "currency": "USD",
    "status": "READY_FOR_PAYMENT",
    "decisionReason": "Transaction passed deterministic policy checks.",
    "createdRecordAt": "2026-11-01T12:00:05.123Z"
  }
]
```

---

### `GET /api/audit`
Returns immutable audit events recorded by the system.

#### Response (`200 OK`)
```json
[
  {
    "id": "cuid_audit_01",
    "eventType": "INTENT_VERIFIED",
    "entityId": "intent-sample-101",
    "message": "Transaction passed deterministic policy checks.",
    "createdAt": "2026-11-01T12:00:05.125Z"
  }
]
```
