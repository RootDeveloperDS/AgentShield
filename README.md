# AgentShield

> **Verify the agent. Validate the intent. Secure the payment.**

AgentShield is a deterministic security proxy and verification gateway for autonomous AI-to-AI payments. Before any payment is authorized or executed via payment processors (such as PayPal), AgentShield cryptographically verifies agent identity via Ed25519 public keys, validates signed canonical intents, enforces deterministic policy limits, prevents replay attacks, and writes an immutable audit trail.

---

## Architecture Overview

```text
  [ AI Buyer Agent ]                [ Autonomous Seller Agent ]
          │                                      ▲
          │ 1. Signs Intent with Ed25519         │
          ▼                                      │
┌────────────────────────────────────────────────┴───────────────────────┐
│                        AGENTSHIELD PROXY GATEWAY                       │
│                                                                        │
│  ┌───────────────────────┐         ┌────────────────────────────────┐  │
│  │   Agent Registry      │         │     Replay & Expiry Guard      │  │
│  │ (Ed25519 Key Status)  │         │  (Nonces, Timestamps, Skew)    │  │
│  └──────────┬────────────┘         └───────────────┬────────────────┘  │
│             │                                      │                   │
│             ▼                                      ▼                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                  Deterministic Policy Engine                     │  │
│  │  • Integer minor units (cents)    • Permitted recipient checks   │  │
│  │  • Per-transaction limits         • Rolling daily spending caps  │  │
│  │  • Blocked risk flags             • Human buyer approval gating  │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│             ┌───────────────────────┴───────────────────────┐          │
│             ▼                                               ▼          │
│    [ Audit & State Machine ]                   [ Part 2: PayPal Adapter ]
│    (PostgreSQL / Prisma DB)                    • Orders API v2         │
│                                                • Buyer Approval SDK    │
│                                                • Server-side Capture   │
│                                                • Webhook Verification  │
└─────────────────────────────────────────────────────────────┬──────────┘
                                                              │
                                                              ▼
                                                   [ PayPal Sandbox API ]
```

### Security Philosophy: Determinism Over Hallucination
* **Deterministic Security:** Security decisions are made strictly by mathematical rules and cryptographic verification. An LLM is never permitted to evaluate whether a payment is authorized.
* **Fail Closed:** Missing security context, malformed payloads, unverified signatures, or revoked keys result in an immediate `DENY`.
* **Zero Floating-Point Math:** All currency calculations strictly enforce integer minor units (e.g., USD cents: \$25.00 is `2500`).
* **Cryptographic Proof of Intent:** Payment signatures bind all canonical fields (intent ID, recipient, amount, currency, timestamps, nonce).
* **Part 1 -> Part 2 Gating:** Part 2 payment execution occurs only after Part 1 verification and policy checks pass.

---

## Monorepo Project Structure

```
agentshield/
├── backend/                       # Express 5 + TypeScript + Prisma ORM
│   ├── prisma/
│   │   ├── migrations/            # SQL migration history
│   │   └── schema.prisma          # Database schema (Agent, PaymentIntent, AuditEvent, WebhookEvent)
│   ├── src/
│   │   ├── config.ts              # Environment configuration & PayPal readiness checks
│   │   ├── db.ts                  # Shared Prisma client instance
│   │   ├── paypal.ts              # PayPal OAuth token, Orders API v2, and capture service
│   │   ├── policy.ts              # ⭐ Deterministic policy engine
│   │   ├── server.ts              # REST API endpoints & route handlers
│   │   └── crypto/intent.ts       # Ed25519 key generation, canonicalization, and signing
│   └── tests/                     # Automated Vitest test suite
│
├── frontend/                      # Next.js 15 (App Router) + React 19 + TypeScript
│   └── src/app/
│       ├── layout.tsx             # Root layout and theme
│       ├── page.tsx               # Security dashboard & transaction viewer
│       └── globals.css            # Dashboard styling
│
├── docs/                          # Architecture & integration documentation
│   ├── api.md                     # Endpoint quick reference
│   ├── architecture.md            # System design & boundary specifications
│   └── paypal-sandbox-setup.md    # PayPal Developer Sandbox setup guide
│
├── docker-compose.yml             # Local PostgreSQL service definition
├── package.json                   # Root monorepo workspace configuration
├── requirements.txt               # Dependency checklist & runtime boundaries
└── DESIGN.md                      # Foundational system architecture & threat model
```

---

## Quick Start (Local Development)

### Prerequisites
* **Node.js**: v20.x or newer (LTS recommended)
* **npm**: v10.x or newer
* **Docker Desktop**: Running for PostgreSQL

---

### Option A: 1-Click Launch (Recommended)
You can launch the entire stack (PostgreSQL + Backend API + Frontend Dashboard + Browser) with a single command or double-click:

* **From Windows File Explorer:**
  Double-click `start-all.bat`
* **Or from PowerShell / Terminal:**
  ```powershell
  npm start
  ```
  *(or `.\start-all.bat` / `powershell scripts\start-all.ps1`)*

This script automatically:
1. Validates environment configurations (`.env`, `backend/.env`, `frontend/.env.local`).
2. Checks that Docker Desktop is active (and alerts you with clear guidance if it isn't).
3. Starts the PostgreSQL container and synchronizes the Prisma database migrations.
4. Spawns the Backend API (port 4000) and Frontend Dashboard (port 3000) in separate labeled windows.
5. Opens `http://localhost:3000` in your default web browser.

---

### Option B: Manual Step-by-Step Launch

#### 1. Start Database & Apply Migrations
```powershell
powershell -File scripts/start-docker.ps1
```
*(Or manually: `docker compose up -d postgres` followed by `npm run prisma:migrate`)*

#### 2. Start Backend API (Port 4000)
```powershell
npm run dev:backend
```

#### 3. Start Frontend Dashboard (Port 3000)
```powershell
npm run dev:frontend
```

* API Health Check: `http://localhost:4000/health`
* Dashboard: `http://localhost:3000`

#### 4. Run the Automated Test Suite
```powershell
npm test
```

---

## API Quick Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | API operational status and PayPal configuration status |
| `GET` | `/api/agents` | List registered agents and public keys |
| `POST` | `/api/agents` | Register an agent and public key (`{ id, name, publicKey }`) |
| `POST` | `/api/intents/verify` | Verify Ed25519 signature, check replay, and evaluate policy |
| `GET` | `/api/approvals` | List transactions requiring human buyer approval |
| `POST` | `/api/approvals/:intentId`| Approve or reject a flagged transaction (`{ approved: boolean }`) |
| `GET` | `/api/transactions` | Query persisted transaction records and statuses |
| `POST` | `/api/paypal/orders` | Create PayPal Orders v2 order for verified intent |
| `POST` | `/api/paypal/orders/:id/capture` | Capture approved PayPal order on the server |
| `GET` | `/api/audit` | Fetch immutable audit trail events |

### Canonical Payment Intent Format
When signing an intent, agents canonicalize the payload with deterministic key ordering:

```json
{
  "agentId": "agent_buyer_01",
  "intent": {
    "intentId": "intent-2026-001",
    "agentId": "agent_buyer_01",
    "recipient": "agent_cloud_compute_02",
    "service": "gpu_cluster_provision_1hr",
    "amountMinor": 2500,
    "currency": "USD",
    "createdAt": "2026-10-25T12:00:00.000Z",
    "expiresAt": "2026-10-25T12:05:00.000Z",
    "nonce": "nonce_7f8a9c2b4e6d"
  },
  "signatureBase64": "MEUCIQD...="
}
```

---

## Threat Model & Security Controls

| Threat | Security Control | Implementation |
| :--- | :--- | :--- |
| **Agent Impersonation** | Ed25519 Key Cryptography | Public key registered in DB; intent signature validated against active key. |
| **Tampered Intent** | Canonical Field Serialization | Amount, recipient, service, timestamps, and nonce are cryptographically bound. |
| **Replay Attacks** | Nonce Uniqueness & Expiry | Unique constraint on `nonce` + `expiresAt` validation fails duplicate replays. |
| **Runaway Agent Spend** | Deterministic Policy Engine | Strict per-transaction limits and rolling daily spending caps. |
| **Prompt Injection / Rogue Goals** | Blocked Risk Flags | Reject intents containing risk flags (e.g. `PROMPT_INJECTION_SUSPECTED`). |
| **Unauthorized High-Value Spend**| Human Approval Threshold | Transactions exceeding threshold require human review before payment. |
| **Payment Misdirection** | Recipient Allowlisting | Rejects unapproved recipient accounts before order creation. |
| **Double Capture / Race Conditions**| Transaction State Machine | Enforces linear transitions (`READY_FOR_PAYMENT` -> `ORDER_CREATED` -> `COMPLETED`). |

---

## Part 1 & Part 2 Completion Checklist

- [x] Full-stack TypeScript / Node.js monorepo architecture established
- [x] PostgreSQL database schema with Prisma migrations
- [x] Ed25519 canonical intent signing and verification (`intent.ts`)
- [x] Database-backed nonce uniqueness and replay rejection (`server.ts`)
- [x] Automated positive and negative unit tests (`tests/`)
- [ ] Policy engine rolling daily spend enforcement (`dailyLimitMinor`)
- [ ] Challenge-response proof of private key ownership on registration
- [ ] PayPal webhook signature verification (`verify-webhook-signature`)
- [ ] AG Grid interactive audit trail dashboard view
- [ ] Live autonomous AI buyer agent demonstration script
