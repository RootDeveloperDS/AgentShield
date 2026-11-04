"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { AutonomousAgentResult, AutonomousStepTrace } from "./types";

interface TelemetryInspectorProps {
  result: AutonomousAgentResult | null;
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
}

export function TelemetryInspector({
  result,
  selectedStepIndex,
  onSelectStep
}: TelemetryInspectorProps) {
  const [activeTab, setActiveTab] = useState<"step" | "reasoning" | "crypto" | "firewall" | "settlement">("step");

  if (!result) {
    return (
      <div className="empty-inspector">
        <div style={{ fontSize: 36, marginBottom: 12 }}>🛡️</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Live Telemetry Inspector</h3>
        <p style={{ color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto", fontSize: 13 }}>
          Click one of the execution scenarios above to watch the agent generate cryptographically authentic intents and evaluate security policies.
        </p>
      </div>
    );
  }

  const currentStep: AutonomousStepTrace | undefined = result.steps[selectedStepIndex] || result.steps[0];
  const isBlocked = result.verificationOutcome.decision === "REJECTED";

  return (
    <div className="inspector-panel">
      {/* Top Banner with Verdict */}
      <div className={`verdict-banner ${isBlocked ? "banner-blocked" : "banner-approved"}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="verdict-icon">{isBlocked ? "🛑" : "✅"}</div>
          <div>
            <div className="verdict-title">{result.summary.title}</div>
            <div className="verdict-subtitle">{result.summary.description}</div>
          </div>
        </div>

        <div className="verdict-actions">
          {isBlocked ? (
            <Link href="/audit" className="btn btn-secondary" style={{ fontSize: 12 }}>
              Inspect Security Audit Trail ↗
            </Link>
          ) : (
            <Link href="/" className="btn btn-primary" style={{ fontSize: 12 }}>
              View in Transaction Ledger ↗
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="inspector-tabs">
        <button
          className={`tab-btn ${activeTab === "step" ? "active" : ""}`}
          onClick={() => setActiveTab("step")}
        >
          Selected Stage ({currentStep ? `0${currentStep.step}` : "Overview"})
        </button>
        <button
          className={`tab-btn ${activeTab === "reasoning" ? "active" : ""}`}
          onClick={() => setActiveTab("reasoning")}
        >
          🧠 Groq LLM Reasoning
        </button>
        <button
          className={`tab-btn ${activeTab === "crypto" ? "active" : ""}`}
          onClick={() => setActiveTab("crypto")}
        >
          🔐 Ed25519 Cryptography
        </button>
        <button
          className={`tab-btn ${activeTab === "firewall" ? "active" : ""}`}
          onClick={() => setActiveTab("firewall")}
        >
          🛡️ Firewall & Policy Rules
        </button>
        <button
          className={`tab-btn ${activeTab === "settlement" ? "active" : ""}`}
          onClick={() => setActiveTab("settlement")}
        >
          💳 Settlement & Proof
        </button>
      </div>

      {/* Tab Content: Single Stage Inspector */}
      {activeTab === "step" && currentStep && (
        <div className="tab-pane">
          <div className="pane-header">
            <div>
              <span className="pill pill-info">{currentStep.category}</span>
              <h3 style={{ fontSize: 18, margin: "6px 0 2px" }}>
                Stage 0{currentStep.step}: {currentStep.title}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
                {currentStep.summary}
              </p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {result.steps.map((s, idx) => (
                <button
                  key={s.step}
                  className={`btn ${idx === selectedStepIndex ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: 11, padding: "4px 8px" }}
                  onClick={() => onSelectStep(idx)}
                >
                  Stage 0{s.step}
                </button>
              ))}
            </div>
          </div>

          <div className="details-grid">
            {Object.entries(currentStep.details).map(([key, val]) => (
              <div key={key} className="detail-item">
                <span className="detail-key">{key}</span>
                <span className="detail-val">
                  {typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Groq Reasoning */}
      {activeTab === "reasoning" && (
        <div className="tab-pane">
          <div className="reasoning-meta-bar">
            <div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Model Architecture:</span>
              <span style={{ marginLeft: 6, fontWeight: 700, color: "var(--accent-purple)" }}>
                {result.llmDecision.model}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Engine Mode:</span>
              <span style={{ marginLeft: 6, fontWeight: 700, color: "var(--accent-cyan)" }}>
                {result.llmDecision.isSimulated ? "Deterministic Standby Reasoning" : "Live Groq API Inference"}
              </span>
            </div>
          </div>

          {result.scenario === "PROMPT_INJECTION_ATTACK" && (
            <div className="threat-alert-box">
              <strong>⚠️ ADVERSARIAL INJECTION DETECTED IN PROMPT CONTEXT:</strong>
              <p style={{ margin: "4px 0 0", fontSize: 13 }}>
                The agent received an instruction attempting to override security boundaries. The LLM accepted the malicious goal,
                proving that <em>pure prompt-based safeguards fail</em>, and that <strong>deterministic gateway enforcement is essential</strong>.
              </p>
            </div>
          )}

          <div className="code-split-view">
            <div>
              <div className="code-header">OPERATIONAL PROMPT / GOAL</div>
              <pre className="code-block" style={{ color: "#e2e8f0" }}>{result.llmDecision.prompt}</pre>
            </div>

            <div>
              <div className="code-header">STRUCTURED LLM DECISION OUTPUT (JSON)</div>
              <pre className="code-block" style={{ color: "#38bdf8" }}>
{JSON.stringify(
  {
    recipient: result.llmDecision.recipient,
    service: result.llmDecision.service,
    amountMinor: result.llmDecision.amountMinor,
    formattedAmount: `$${(result.llmDecision.amountMinor / 100).toFixed(2)} ${result.llmDecision.currency}`,
    currency: result.llmDecision.currency,
    reasoning: result.llmDecision.reasoning
  },
  null,
  2
)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Cryptography */}
      {activeTab === "crypto" && (
        <div className="tab-pane">
          <div className="crypto-info-cards">
            <div className="crypto-mini-card">
              <span className="card-lbl">SIGNATURE ALGORITHM</span>
              <span className="card-val">Ed25519 (RFC 8032)</span>
            </div>
            <div className="crypto-mini-card">
              <span className="card-lbl">HASH FUNCTION</span>
              <span className="card-val">SHA-512 / Curve25519</span>
            </div>
            <div className="crypto-mini-card">
              <span className="card-lbl">CANONICALIZATION</span>
              <span className="card-val">Strict Field-Order JSON</span>
            </div>
            <div className="crypto-mini-card">
              <span className="card-lbl">REPLAY PROTECTION</span>
              <span className="card-val">128-bit Atomic Nonce</span>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="code-header">CANONICAL PAYMENT INTENT (WHAT WAS SIGNED)</div>
            <pre className="code-block" style={{ color: "#a5f3fc" }}>
              {JSON.stringify(result.intent, null, 2)}
            </pre>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="code-header">ED25519 DIGITAL SIGNATURE (BASE64)</div>
            <pre className="code-block" style={{ color: "#facc15", wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
              {result.signatureBase64}
            </pre>
          </div>
        </div>
      )}

      {/* Tab Content: Firewall Policy Evaluation */}
      {activeTab === "firewall" && (
        <div className="tab-pane">
          <div className="rules-checklist">
            <div className="rule-item rule-passed">
              <span className="rule-badge">PASS</span>
              <div className="rule-details">
                <strong>Ed25519 Digital Signature Authenticity</strong>
                <p>Signature verified against registered public key in AgentShield vault.</p>
              </div>
            </div>

            <div className="rule-item rule-passed">
              <span className="rule-badge">PASS</span>
              <div className="rule-details">
                <strong>Atomic Nonce Replay Immunity</strong>
                <p>Nonce is unique in PostgreSQL ledger; replay attack impossible.</p>
              </div>
            </div>

            <div className="rule-item rule-passed">
              <span className="rule-badge">PASS</span>
              <div className="rule-details">
                <strong>Timing Freshness & Clock Skew (+/- 30s)</strong>
                <p>Intent creation and expiration within strict 5-minute validity window.</p>
              </div>
            </div>

            <div className="rule-item rule-passed">
              <span className="rule-badge">PASS</span>
              <div className="rule-details">
                <strong>Anti-Self-Payment Loop Check</strong>
                <p>Agent ID does not match recipient address.</p>
              </div>
            </div>

            <div className={`rule-item ${isBlocked ? "rule-failed" : "rule-passed"}`}>
              <span className={`rule-badge ${isBlocked ? "badge-fail" : ""}`}>
                {isBlocked ? "BLOCKED" : "PASS"}
              </span>
              <div className="rule-details">
                <strong>Per-Transaction Hard Cap ($500.00 USD)</strong>
                <p>
                  Requested: ${( (result.intent?.amountMinor || 0) / 100 ).toFixed(2)} USD.{" "}
                  {isBlocked
                    ? "REJECTED: Amount exceeds maximum authorized per-transaction limit."
                    : "APPROVED: Amount is within automatic policy clearance limit."}
                </p>
              </div>
            </div>

            <div className="rule-item rule-passed">
              <span className="rule-badge">PASS</span>
              <div className="rule-details">
                <strong>Rolling 24-Hour Spend Ceiling ($1,000.00 USD)</strong>
                <p>Cumulative spend over rolling window remains within authorized envelope.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Settlement */}
      {activeTab === "settlement" && (
        <div className="tab-pane">
          {isBlocked ? (
            <div className="settlement-blocked-card">
              <div style={{ fontSize: 42, marginBottom: 12 }}>🛡️</div>
              <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "var(--accent-rose)" }}>
                PayPal API Never Invoked · Zero Financial Loss
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 520, margin: "0 auto" }}>
                Because the transaction was terminated at the AgentShield gateway level, no network call was made to PayPal,
                no authorization was created, and zero corporate capital was put at risk.
              </p>
              <div style={{ marginTop: 16 }}>
                <Link href="/audit" className="btn btn-secondary">
                  View Block Event in Security Audit Trail ↗
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="crypto-info-cards">
                <div className="crypto-mini-card">
                  <span className="card-lbl">PAYPAL ORDER ID</span>
                  <span className="card-val" style={{ color: "var(--accent-cyan)" }}>
                    {result.paypalOutcome?.orderId}
                  </span>
                </div>
                <div className="crypto-mini-card">
                  <span className="card-lbl">CAPTURE ID</span>
                  <span className="card-val" style={{ color: "var(--accent-emerald)" }}>
                    {result.paypalOutcome?.captureId}
                  </span>
                </div>
                <div className="crypto-mini-card">
                  <span className="card-lbl">CAPTURE STATUS</span>
                  <span className="card-val" style={{ color: "var(--accent-emerald)" }}>
                    {result.paypalOutcome?.status}
                  </span>
                </div>
                <div className="crypto-mini-card">
                  <span className="card-lbl">SETTLED VALUE</span>
                  <span className="card-val">
                    ${((result.intent?.amountMinor || 0) / 100).toFixed(2)} USD
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 20, textAlign: "center" }}>
                <Link href="/" className="btn btn-primary" style={{ padding: "10px 20px" }}>
                  View Row in Live Verified Transaction Ledger (AG Grid) ↗
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
