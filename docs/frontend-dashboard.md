# Enterprise Frontend Dashboard & AG Grid Bounty

AgentShield features an enterprise dark-mode fintech dashboard built with Next.js 15, React 19, and **AG Grid Community v36**. It provides real-time security observability and human-in-the-loop governance for autonomous agent transactions.

---

## 1. AG Grid Bounty Qualifications ($5,000 Prize)

AgentShield utilizes **AG Grid Community** as the foundational data grid for two mission-critical financial interfaces:

1. **Live Transaction Ledger (`/`):**
   * **Custom Cell Renderers:** Status pill renderer (`COMPLETED`, `FLAGGED_HUMAN_REVIEW`, `REJECTED_POLICY`, `PENDING`, `CANCELLED`), amount minor-unit currency converter (`amountMinor` ➔ `$XX.XX USD`), and interactive Action buttons (`Inspect` and `Review`).
   * **Quick Filtering & Search:** Real-time text search across agent ID, recipient, intent ID, and status badges.
   * **Category Filter Tabs:** Fast switching between "All", "Completed", "Review", and "Rejected" records.
   * **Server Pagination:** 10, 20, 50 rows per page with responsive page selector.
   * **Export to CSV:** Direct CSV data export using `gridApi.exportDataAsCsv()`.
   * **Live 5s Polling:** Automatic telemetry synchronization with the backend API.

2. **Immutable Security Audit Trail (`/audit`):**
   * **Event Categorization:** Category filtering for "Cryptographic", "Policy Engine", and "PayPal Webhooks".
   * **Telemetry Rendering:** Color-coded event pills for security denials, cryptographic verifications, and PayPal capture state transitions.
   * **Sortable Columns:** Descending chronological sorting by event timestamp.

---

## 2. Interactive Features

### ◈ Cryptographic Inspection Drawer
Clicking on any transaction in the AG Grid opens the **Cryptographic Audit Drawer**:
* **RFC 8032 Proof:** Displays Ed25519 public key and signature validation status.
* **Nonce Validation:** Displays the cryptographic replay nonce and timing window.
* **Policy Breakdown:** Details policy evaluation results against the $500 hard cap and $100 human threshold.
* **PayPal Settlement Details:** Displays PayPal Order ID, Capture ID, and webhook reconciliation status.
* **Canonical JSON:** Syntax-highlighted raw payload inspection.

### ◈ Interactive Threat Lab (`/threat-demo`)
Provides security engineers and hackathon judges with a live, 1-click attack simulation console:
1. **Attack 01 (Tampered MITM Intent):** Sends an altered payload with forged Ed25519 signature ➔ Fails closed with `401 INVALID_SIGNATURE`.
2. **Attack 02 (Cryptographic Nonce Replay):** Submits an already-used nonce ➔ Fails closed with `409 NONCE_REPLAY_DETECTED`.
3. **Attack 03 (Policy Overspend Cap):** Submits a $600 intent exceeding the $500 max cap ➔ Rejected by policy engine.
4. **Governance Test 04 (High-Value Escalation):** Submits a $150 intent ➔ Frozen for human approval in the queue.

### ◈ Human-in-the-Loop Approval Queue (`/approvals`)
* Holds transactions exceeding the $100 automated limit.
* Human security officers can review policy escalation reasons and click **"Authorize & Execute"** to trigger PayPal settlement or **"Reject Intent"**.

### ◈ One-Click Agent Keypair Generator (`/agents`)
* Includes an in-browser Ed25519 sample keypair generator so evaluators can register test agents without needing OpenSSL or command-line cryptography tools.
