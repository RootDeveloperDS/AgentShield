# Changelog — AgentShield

All notable technical updates, architecture milestones, and releases for the **AgentShield** project are documented here following semantic versioning.

---

## [v1.5.0] — November 04, 2026

### 🧠 Autonomous AI Architecture (Groq LLM)
* **Groq Inference Engine (`backend/src/ai/groqClient.ts`):** Integrated Groq Cloud API utilizing `openai/gpt-oss-20b` in structured JSON mode for autonomous procurement goal formulation.
* **Autonomous Buyer Agent Lifecycle (`backend/src/ai/buyerAgent.ts`):** Engineered full 5-stage procurement cycle (Groq reasoning ➔ Ed25519 key handshake ➔ RFC 8032 canonical signing ➔ Zero-trust firewall bounds ➔ PayPal Sandbox settlement / attack quarantine).
* **Deterministic Fallback Engine:** Built zero-latency deterministic simulation mode for offline test suites, air-gapped evaluation, and CI pipelines.

### 🖥️ Live Observatory & Frontend Telemetry (`/agent-live`)
* **Interactive 5-Stage Timeline (`StageTimeline.tsx`):** Engineered animated real-time execution pipeline with glowing pulse nodes, live elapsed counters, and status badges (`ACTIVE`, `PASSED`, `BLOCKED`).
* **Telemetry Deep-Dive Inspector (`TelemetryInspector.tsx`):** Four tabbed inspection panels displaying live Groq prompt context, RFC 8032 canonical payloads, base64 digital signatures, policy evaluation checklists, and PayPal settlement receipts.
* **Dual Execution Scenarios (`ScenarioControls.tsx`):** One-click demonstration cards for **Scenario A (Legitimate \$25.00 Procurement)** and **Scenario B (Adversarial \$600.00 Prompt Injection Attack)** with custom prompt override panel.
* **Top Navigation Integration (`layout.tsx`):** Added prominent `🤖 AI Agent Live` navigation link in application header.

### ⚡ Terminal Telemetry & Automated Verification
* **Terminal CLI Showcase (`demo/ai_buyer_agent.ts`):** Added interactive terminal showcase script with formatted ANSI color banners, step-by-step progress, and summary digests (`npm run demo:ai`).
* **Automated Unit Tests (`backend/tests/buyerAgent.test.ts`):** Added 4 comprehensive tests verifying legitimate settlement, prompt-injection hard drops, and reasoning structure (all 45 tests across 5 test suites passing).
* **Technical Specification (`docs/ai-buyer-agent.md`):** Published complete specification covering Groq integration, cryptographic handshake proofs, and fail-closed threat mitigation.

---

## [v1.4.0] — November 04, 2026

### 📊 Enterprise AG Grid Frontend Dashboard
* **AG Grid Community v36 Integration:** Installed and configured `@ag-grid-community/client-side-row-model` and `@ag-grid-community/react` v36 with custom Quartz dark theme overrides.
* **Live Verified Transaction Ledger (`TransactionGrid.tsx`):** Implemented high-contrast data grid with minor-unit currency conversion, status badges, quick text filtering, and one-click CSV export.
* **Security Audit Trail (`AuditGrid.tsx`):** Built cryptographic audit grid with event category filtering (`AGENT_REGISTERED`, `INTENT_VERIFIED`, `INTENT_REJECTED`, `WEBHOOK_VERIFIED`).
* **Interactive Threat Simulation Lab (`threat-demo/page.tsx`):** Connected 5 attack vectors (Tampered Payload, Replay Nonce, Exceeded Hard Cap, Expired Intent, Unregistered Agent) to real `POST /api/intents/verify` endpoint.
* **Inspection Modals:** Engineered `TransactionDetailModal.tsx` and `HumanApprovalModal.tsx` for drill-down investigation and human-in-the-loop governance.

---

## [v1.3.0] — November 03, 2026

### 💳 PayPal Webhook Cryptographic Verification & Reconciliation
* **Webhook Signature Verification (`paypal.ts`):** Engineered PayPal webhook signature verification calling PayPal REST API `/v1/notifications/verify-webhook-signature` validating transmission ID, timestamp, certificate URL, and auth algorithm.
* **Idempotent Reconciliation Engine:** Added `WebhookEvent` database model with unique constraint to prevent double-processing replay attacks.
* **Tunnel & Testing Infrastructure:** Configured ngrok webhook tunnel integration and verified live webhook ingestion in local development.

---

## [v1.2.0] — November 01, 2026

### 🔐 Cryptographic Handshake & Timing Bounds
* **Proof of Key Possession (`POST /api/agents/challenge`):** Engineered challenge-response handshake requiring agents to sign a 32-byte cryptographic nonce token before public key registration.
* **Domain-Separated Challenge Signing:** Implemented domain separation prefix `AgentShield-Registration-Challenge:` to prevent cross-protocol signature reuse.
* **Clock-Skew & Expiration Boundaries:** Enforced +/- 30s clock drift tolerance and 5-minute strict lifetime validity window (`validateIntentTiming`).
* **Developer Documentation Suite:** Authored `architecture.md`, `security-model.md`, `getting-started.md`, and `api.md`.

---

## [v1.1.0] — October 31, 2026

### 🛡️ Deterministic Policy Engine
* **Rule Engine Architecture (`policy.ts`):** Established fail-closed deterministic policy evaluator (zero floating-point arithmetic, strict integer minor units).
* **Rolling 24-Hour Spend Aggregator (`calculateAgentDailySpend`):** Implemented rolling 24-hour spend aggregation directly from PostgreSQL database to eliminate daily limit bypass bugs.
* **Automated Policy Tests:** Added comprehensive positive and negative test cases covering boundary limits, self-payment prevention, and unsupported currencies.

---

## [v1.0.0] — October 25, 2026

### 🚀 Monorepo Architecture & 1-Click Launch
* **Full-Stack Monorepo:** Established npm workspace monorepo uniting Express 5 TypeScript backend and Next.js 15 App Router frontend.
* **Database & Persistence:** Configured PostgreSQL container via Docker Compose and established Prisma ORM models (`Agent`, `PaymentIntent`, `AuditEvent`).
* **1-Click Launch Scripts:** Created `scripts/start-all.ps1`, `start-all.bat`, and health check automation.
