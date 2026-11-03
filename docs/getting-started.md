# Getting Started with AgentShield

AgentShield is a verification proxy for AI-to-AI transactions. It acts as an automated security gateway between autonomous AI agents and real payment processors (like PayPal).

---

## The 60-Second Mental Model

When autonomous AI agents hire other agents (e.g. buying GPU compute, dataset cleaning, or code review), they need to send money. 

Allowing an AI model to make payments directly is dangerous:
* What if the AI model is prompt-injected or hallucinates?
* What if an attacker replays an old payment token 100 times?
* What if an agent sends money to an unverified recipient?

**AgentShield solves this by sitting between the AI Agent and PayPal:**

```text
[ AI Buyer Agent ] 
       │ 1. Signs payment intent with Ed25519 private key
       ▼
[ AgentShield Security Proxy ]
       │ 2. Verifies cryptographic signature & key ownership
       │ 3. Enforces 5-minute validity window & nonce uniqueness
       │ 4. Evaluates deterministic policy (limits, currencies, risk flags)
       ▼
[ Decision: APPROVED | REQUIRES_HUMAN_APPROVAL | REJECTED ]
       │ 
       ▼ (Only if approved)
[ PayPal Orders API v2 ] ──► Payment Captured & Receipt Issued
```

---

## Core Concepts

* **Agent:** An autonomous program identified by a unique ID and an Ed25519 public key.
* **Challenge-Response:** A cryptographic handshake where an agent signs a random 64-character server challenge to prove it owns the private key before registration is accepted.
* **Payment Intent:** A cryptographically signed document detailing the payment: payer, recipient, service, amount in cents, currency, timestamps, and a unique one-time nonce.
* **Policy Engine:** Strict mathematical rules (per-transaction limits, rolling 24-hour spend limits, risk flags) that can **never** be overridden by an AI.
* **Minor Units:** All monetary values are strictly handled in integer minor units (cents) to eliminate floating-point math errors ($25.00 is represented as `2500`).

---

## Prerequisites

* **Node.js**: v20.x or newer
* **Docker Desktop**: Running locally (used for the PostgreSQL database container)
* **npm**: v10.x or newer

---

## Step 1: Clone & Start with 1-Click

1. Open PowerShell in the project directory:
   ```powershell
   cd AgentShield
   ```

2. Make sure **Docker Desktop** is open and running on your machine.

3. Run the automated master launcher:
   ```powershell
   npm start
   ```
   *(Or double-click `start-all.bat` in Windows File Explorer)*

The launcher will automatically:
* Validate configuration files (`.env`, `backend/.env`, `frontend/.env.local`).
* Launch the `agentshield-postgres` database container.
* Apply Prisma database migrations.
* Open the **Backend API** (Port 4000) and **Frontend Dashboard** (Port 3000) in dedicated windows.
* Open your browser to `http://localhost:3000`.

---

## Step 2: Explore the Dashboard

Open your browser to **[http://localhost:3000](http://localhost:3000)**:

* **`/` (Overview):** Real-time API connectivity, PayPal Sandbox status, and recent transactions.
* **`/agents`:** Registry of all authorized AI agents and their public keys.
* **`/approvals`:** Human-in-the-loop approval queue for transactions over $500.00.
* **`/audit`:** Tamper-evident log of all registration and verification events.
* **`/threat-demo`:** Interactive security scenarios demonstrating how tampered requests are blocked.

---

## Step 3: Make Your First Verified Payment Request

Here is how an AI agent registers and executes a payment verification using PowerShell or `curl`:

### 1. Request a Registration Challenge
```powershell
$challenge = Invoke-RestMethod -Uri "http://localhost:4000/api/agents/challenge" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"agentId":"agent_alpha_01"}'

$challenge.challenge
```

### 2. Register the Agent
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/agents" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{
    "id": "agent_alpha_01",
    "name": "Alpha Research Agent",
    "publicKey": "MCowBQYDK2VwAyEAGb9ECWPuFvAQWQ4wnONSdf5leUk2ZSG2KuDdUmTzA6M="
  }'
```

### 3. Verify a Payment Intent
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/intents/verify" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{
    "intent": {
      "intentId": "intent-sample-101",
      "agentId": "agent_alpha_01",
      "recipient": "agent_cloud_compute",
      "service": "gpu_cluster_provision_1hr",
      "amountMinor": 2500,
      "currency": "USD",
      "createdAt": "' + (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ") + '",
      "expiresAt": "' + (Get-Date).AddMinutes(2).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ") + '",
      "nonce": "nonce_random_987654321012"
    },
    "signatureBase64": "dummy_signature_for_test"
  }'
```

---

## Running the Automated Test Suite

AgentShield comes with 34 automated unit and security tests. Run them anytime with:

```powershell
npm test
```

All 34 tests run in under 4 seconds, verifying:
* Cryptographic signature verification and tamper detection.
* Challenge-response proof of private key ownership.
* Replay attacks and duplicate nonce rejection.
* Per-transaction and rolling 24-hour daily spend enforcement.
* Human approval gating for high-value transactions.
