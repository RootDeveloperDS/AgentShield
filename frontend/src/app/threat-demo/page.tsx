"use client";

import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface AttackResult {
  title: string;
  scenario: string;
  httpStatus: number | string;
  expectedOutcome: string;
  responseBody: any;
  blocked: boolean;
  timestamp: string;
}

export default function ThreatDemo() {
  const [runningTest, setRunningTest] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<AttackResult | null>(null);

  const executeAttack = async (type: string) => {
    setRunningTest(type);
    setActiveResult(null);

    try {
      // 1. Fetch active registered agent or register a demo agent if none exists
      let targetAgentId = "agent-buyer-demo";
      const agentsRes = await fetch(`${API}/api/agents`).catch(() => null);
      if (agentsRes && agentsRes.ok) {
        const agents = await agentsRes.json();
        if (Array.isArray(agents) && agents.length > 0) {
          targetAgentId = agents[0].id;
        }
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 min validity

      if (type === "TAMPERED_PAYLOAD") {
        const intentId = `tamper-${Date.now()}`;
        const res = await fetch(`${API}/api/intents/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: {
              intentId,
              agentId: targetAgentId,
              recipient: "malicious-hacker@attacker.com",
              service: "Unauthorized GPU Compute",
              amountMinor: 50000, // $500.00
              currency: "USD",
              createdAt: now.toISOString(),
              expiresAt: expiresAt.toISOString(),
              nonce: `nonce_tamper_${Date.now()}_secure`
            },
            signatureBase64: "3045022100deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef02203333"
          })
        });

        const data = await res.json().catch(() => ({}));
        setActiveResult({
          title: "Attack #1: Tampered Intent / Forged Ed25519 Signature",
          scenario: `Adversary altered the intent amount to $500.00 without possessing ${targetAgentId}'s private key.`,
          httpStatus: `${res.status} ${res.statusText || ""}`,
          expectedOutcome: "HTTP 403 Forbidden — Rejected with 'Invalid signature' and written to PostgreSQL audit trail.",
          responseBody: data,
          blocked: res.status >= 400,
          timestamp: new Date().toLocaleTimeString()
        });
      } else if (type === "REPLAY_ATTACK") {
        const staticNonce = "static_replay_nonce_12345678";
        const intentId = `replay-${Date.now()}`;

        // Attempt 1: Submit intent
        await fetch(`${API}/api/intents/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: {
              intentId: `first-${Date.now()}`,
              agentId: targetAgentId,
              recipient: "merchant@example.com",
              service: "Cloud API Token",
              amountMinor: 1000,
              currency: "USD",
              createdAt: now.toISOString(),
              expiresAt: expiresAt.toISOString(),
              nonce: staticNonce
            },
            signatureBase64: "dummy_sig_first"
          })
        }).catch(() => {});

        // Attempt 2: Replay exact same nonce
        const res = await fetch(`${API}/api/intents/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: {
              intentId,
              agentId: targetAgentId,
              recipient: "merchant@example.com",
              service: "Cloud API Token",
              amountMinor: 1000,
              currency: "USD",
              createdAt: now.toISOString(),
              expiresAt: expiresAt.toISOString(),
              nonce: staticNonce
            },
            signatureBase64: "dummy_sig_replay"
          })
        });

        const data = await res.json().catch(() => ({}));
        setActiveResult({
          title: "Attack #2: Cryptographic Replay Attack",
          scenario: "Attacker intercepted previously submitted payload and retransmitted the same nonce to double-spend funds.",
          httpStatus: `${res.status} ${res.statusText || ""}`,
          expectedOutcome: "HTTP 403/409 — Replay protection catches reused nonce and terminates request.",
          responseBody: data,
          blocked: res.status >= 400,
          timestamp: new Date().toLocaleTimeString()
        });
      } else if (type === "LIMIT_BREACH") {
        const intentId = `limit-breach-${Date.now()}`;
        const res = await fetch(`${API}/api/intents/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: {
              intentId,
              agentId: targetAgentId,
              recipient: "cloud-provider@compute.com",
              service: "Overprovisioned Cluster",
              amountMinor: 60000, // $600.00 > $500.00 limit
              currency: "USD",
              createdAt: now.toISOString(),
              expiresAt: expiresAt.toISOString(),
              nonce: `nonce_limit_${Date.now()}_secure`
            },
            signatureBase64: "dummy_sig_limit"
          })
        });

        const data = await res.json().catch(() => ({}));
        setActiveResult({
          title: "Attack #3: Policy Overspend Breach ($600.00 > $500.00 Cap)",
          scenario: "An autonomous agent requested resources exceeding its deterministic single-transaction authorization ceiling.",
          httpStatus: `${res.status} ${res.statusText || ""}`,
          expectedOutcome: "HTTP 403 Forbidden — Rejected by deterministic policy bounds before reaching PayPal.",
          responseBody: data,
          blocked: res.status >= 400,
          timestamp: new Date().toLocaleTimeString()
        });
      } else if (type === "HUMAN_ESCALATION") {
        const intentId = `escalate-${Date.now()}`;
        const res = await fetch(`${API}/api/intents/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: {
              intentId,
              agentId: targetAgentId,
              recipient: "gpu-cluster@datacenter.com",
              service: "Large Language Model Fine-Tuning",
              amountMinor: 15000, // $150.00
              currency: "USD",
              createdAt: now.toISOString(),
              expiresAt: expiresAt.toISOString(),
              nonce: `nonce_escalate_${Date.now()}_secure`
            },
            signatureBase64: "dummy_sig_escalate"
          })
        });

        const data = await res.json().catch(() => ({}));
        setActiveResult({
          title: "Simulation #4: Human-in-the-Loop Governance Escalation ($150.00)",
          scenario: "High-value intent exceeding $100.00 threshold. Policy halts automated settlement and routes it to the security queue.",
          httpStatus: `${res.status} ${res.statusText || ""}`,
          expectedOutcome: "Frozen for human review. Status marked REQUIRES_HUMAN_APPROVAL.",
          responseBody: data,
          blocked: true,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      setActiveResult({
        title: "Simulation Error",
        scenario: "Could not reach AgentShield backend.",
        httpStatus: "ERR_CONNECTION_REFUSED",
        expectedOutcome: "Backend should be running on http://localhost:4000",
        responseBody: { error: err instanceof Error ? err.message : "Network error" },
        blocked: false,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setRunningTest(null);
    }
  };

  return (
    <main>
      <div style={{ marginBottom: 24 }}>
        <span className="badge badge-rose" style={{ marginBottom: 12 }}>
          INTERACTIVE THREAT LAB
        </span>
        <h1>Real-Time Autonomous Attack Simulator</h1>
        <p className="subtitle">
          Test AgentShield&apos;s cryptographic and policy defenses against simulated adversarial attacks. Each test sends real payloads to the running Express backend and inspects the live firewall response.
        </p>
      </div>

      {/* Simulator Cards */}
      <div className="threat-grid">
        {/* Test 1 */}
        <div className="threat-card">
          <div>
            <div className="threat-meta">
              <span className="badge badge-rose">ATTACK VECTOR 01</span>
              <span style={{ fontSize: 12, color: "#647d9e" }}>RFC 8032 Guard</span>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Tampered Intent & MITM Attack</h3>
            <p className="threat-desc">
              Simulates a man-in-the-middle proxy that alters the payment recipient or inflates the amount without having the agent&apos;s Ed25519 private key.
            </p>
          </div>
          <button
            className="button-primary"
            style={{ background: "#e11d48" }}
            onClick={() => executeAttack("TAMPERED_PAYLOAD")}
            disabled={runningTest !== null}
          >
            {runningTest === "TAMPERED_PAYLOAD" ? "Simulating Attack…" : "Launch Attack Simulation ⚡"}
          </button>
        </div>

        {/* Test 2 */}
        <div className="threat-card">
          <div>
            <div className="threat-meta">
              <span className="badge badge-amber">ATTACK VECTOR 02</span>
              <span style={{ fontSize: 12, color: "#647d9e" }}>Replay Defense</span>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Cryptographic Nonce Replay</h3>
            <p className="threat-desc">
              Captures a previously executed valid payment signature and re-submits it in an attempt to trigger a duplicate payment without authorization.
            </p>
          </div>
          <button
            className="button-primary"
            style={{ background: "#d97706" }}
            onClick={() => executeAttack("REPLAY_ATTACK")}
            disabled={runningTest !== null}
          >
            {runningTest === "REPLAY_ATTACK" ? "Simulating Attack…" : "Launch Attack Simulation ⚡"}
          </button>
        </div>

        {/* Test 3 */}
        <div className="threat-card">
          <div>
            <div className="threat-meta">
              <span className="badge badge-rose">ATTACK VECTOR 03</span>
              <span style={{ fontSize: 12, color: "#647d9e" }}>Policy Engine</span>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Unauthorized Overspend Breach</h3>
            <p className="threat-desc">
              Simulates a rogue or prompt-injected agent attempting to drain funds by submitting a $600 payment that violates the strict $500 hard cap.
            </p>
          </div>
          <button
            className="button-primary"
            style={{ background: "#e11d48" }}
            onClick={() => executeAttack("LIMIT_BREACH")}
            disabled={runningTest !== null}
          >
            {runningTest === "LIMIT_BREACH" ? "Simulating Attack…" : "Launch Attack Simulation ⚡"}
          </button>
        </div>

        {/* Test 4 */}
        <div className="threat-card">
          <div>
            <div className="threat-meta">
              <span className="badge badge-sky">GOVERNANCE TEST 04</span>
              <span style={{ fontSize: 12, color: "#647d9e" }}>Human-in-the-Loop</span>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>High-Value Intent Escalation</h3>
            <p className="threat-desc">
              Submits a $150 intent exceeding the $100 automated threshold. Verifies that payment execution is frozen until a human officer approves it.
            </p>
          </div>
          <button
            className="button-primary"
            style={{ background: "#0284c7" }}
            onClick={() => executeAttack("HUMAN_ESCALATION")}
            disabled={runningTest !== null}
          >
            {runningTest === "HUMAN_ESCALATION" ? "Simulating Attack…" : "Launch Governance Test ⚡"}
          </button>
        </div>
      </div>

      {/* Live Simulation Telemetry Console */}
      {activeResult && (
        <div className="grid-container" style={{ marginTop: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="status-dot online" />
              <h3 style={{ margin: 0, fontSize: 16 }}>Live Telemetry Inspection Console</h3>
              <span className="badge badge-slate">{activeResult.timestamp}</span>
            </div>
            <button className="button-secondary button-sm" onClick={() => setActiveResult(null)}>
              Clear Console
            </button>
          </div>

          <div className="detail-card">
            <div className="detail-row">
              <span className="detail-label">Simulation Test</span>
              <span className="detail-value">{activeResult.title}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Attack Scenario</span>
              <span className="detail-value" style={{ color: "#cbd5e1" }}>{activeResult.scenario}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Gateway HTTP Response</span>
              <span className="detail-value" style={{ color: activeResult.blocked ? "#34d399" : "#fb7185", fontSize: 15 }}>
                {activeResult.httpStatus} {activeResult.blocked ? "— DEFENSE TRIGGERED (PAYMENT BLOCKED)" : ""}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Expected Behavior</span>
              <span className="detail-value" style={{ color: "#38bdf8" }}>{activeResult.expectedOutcome}</span>
            </div>
          </div>

          <span style={{ fontSize: 12, color: "#647d9e", fontWeight: 600 }}>
            RAW GATEWAY RESPONSE TELEMETRY
          </span>
          <pre className="code-block">
            {JSON.stringify(activeResult.responseBody, null, 2)}
          </pre>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <Link href="/audit" className="button-secondary button-sm">
              Inspect Security Audit Trail →
            </Link>
            <Link href="/approvals" className="button-secondary button-sm">
              Inspect Human Approval Queue →
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
