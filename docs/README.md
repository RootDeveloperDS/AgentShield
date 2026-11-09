# AgentShield Documentation

Welcome to the AgentShield developer documentation.

AgentShield is a deterministic security proxy for autonomous AI-to-AI transactions. Before any money moves through payment rails (such as PayPal), AgentShield cryptographically verifies agent identity, enforces strict mathematical spending rules, prevents replay attacks, and writes an immutable audit trail.

---

## Documentation Guides

### 🚀 [Getting Started Guide](./getting-started.md)
* The 60-second mental model of AI payments.
* Prerequisites and local setup in 3 minutes.
* 1-Click launcher instructions.
* How to register an agent and submit your first verified payment intent.

---

### 🏛️ [System Architecture & Lifecycle](./architecture.md)
* High-level architectural diagram.
* Core security boundaries and zero-trust philosophy.
* Complete transaction lifecycle and state machine diagram (`PENDING_VERIFICATION` ➔ `COMPLETED`).

---

### 🛡️ [Security Model & Threat Mitigation](./security-model.md)
* Ed25519 identity and Challenge-Response handshake proof.
* Canonical intent JSON serialization.
* Timing bounds, clock-skew tolerance, and 5-minute validity window.
* Replay protection with atomic database nonce constraints.
* Deterministic policy engine rules (integer cents, rolling 24h spend limit, risk flags).
* Comprehensive Threat Model matrix.

---

### 📡 [REST API Reference](./api.md)
* Full endpoint documentation with request bodies, responses, and status codes.
* Agent registration with challenge proof (`POST /api/agents/challenge` and `POST /api/agents`).
* Intent verification and policy evaluation (`POST /api/intents/verify`).
* Human approval workflow (`/api/approvals`).
* Audit and transaction logs (`/api/transactions`, `/api/audit`).

---

### 💳 [PayPal Sandbox Setup Guide](./paypal-sandbox-setup.md)
* Step-by-step developer portal setup for PayPal Sandbox credentials.
* Order creation and capture testing guidelines.

---

### 📊 [Frontend Dashboard & AG Grid Bounty](./frontend-dashboard.md)
* Enterprise dark-mode fintech interface built with AG Grid Community v36.
* Live Transaction Ledger with custom cell renderers, sorting, and CSV export.
* Interactive Threat Simulation Lab, Cryptographic Drawer, and Human Approval Queue.

---

### 🤖 [Autonomous AI Buyer Agent & Zero-Trust Observatory](./ai-buyer-agent.md)
* Autonomous procurement engine powered by **Groq (`openai/gpt-oss-20b`)**.
* Dual-scenario demonstration: Legitimate \$25.00 procurement vs. Adversarial \$600.00 prompt injection.
* Visual 5-stage real-time execution timeline and telemetry inspector.
* Terminal CLI showcase (`npm run demo:ai`) and automated testing guide.

---

### 🌐 [Production Deployment Guide (0 to 100)](./deployment-guide.md)
* Complete end-to-end cloud deployment: Neon PostgreSQL + Render (Backend) + Vercel (Frontend).
* PayPal Sandbox live HTTPS webhook registration without tunnels.
* Environment variables checklist, build commands, and live smoke test verification.
