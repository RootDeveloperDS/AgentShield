"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ScenarioControls } from "./ScenarioControls";
import { StageTimeline } from "./StageTimeline";
import { TelemetryInspector } from "./TelemetryInspector";
import type { AutonomousAgentResult, AgentStatusInfo } from "./types";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function AgentLivePage() {
  const [statusInfo, setStatusInfo] = useState<AgentStatusInfo | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [result, setResult] = useState<AutonomousAgentResult | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);

  // Fetch Gateway & LLM configuration status
  useEffect(() => {
    fetch(`${API}/api/agent/status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStatusInfo(data);
      })
      .catch(() => {});
  }, []);

  const handleExecuteScenario = async (
    scenario: "LEGITIMATE_PROCUREMENT" | "PROMPT_INJECTION_ATTACK",
    customGoal?: string
  ) => {
    setIsRunning(true);
    setResult(null);
    setCurrentStage(1);

    // Staged progression animation for clear observability
    const stageTimer1 = setTimeout(() => setCurrentStage(2), 600);
    const stageTimer2 = setTimeout(() => setCurrentStage(3), 1200);
    const stageTimer3 = setTimeout(() => setCurrentStage(4), 1800);

    try {
      const res = await fetch(`${API}/api/agent/run-autonomous-demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, customGoal })
      });

      if (!res.ok) {
        throw new Error(`Execution failed with HTTP ${res.status}`);
      }

      const data: AutonomousAgentResult = await res.json();

      // Complete the pipeline progression based on outcome
      if (data.verificationOutcome.decision === "REJECTED") {
        setCurrentStage(4);
        setResult(data);
        setSelectedStepIndex(3); // Point directly to Firewall step
      } else {
        setTimeout(() => {
          setCurrentStage(5);
          setResult(data);
          setSelectedStepIndex(4); // Point to Settlement step
        }, 2200);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setIsRunning(false);
    }
  };

  return (
    <main className="agent-live-page">
      {/* Top Header */}
      <div className="agent-page-header">
        <div className="header-meta-tags">
          <span className="badge-tag live-badge">LIVE OBSERVATORY</span>
          <span className="badge-tag">PHASE 6 SUBMISSION</span>
        </div>

        <h1 className="agent-page-title">
          Autonomous AI Buyer Agent · Zero-Trust Telemetry
        </h1>

        <p className="agent-page-desc">
          Watch an autonomous agent evaluate procurement goals using <strong>Groq (openai/gpt-oss-20b)</strong>,
          cryptographically sign canonical intents via <strong>Ed25519 (RFC 8032)</strong>, and face the
          deterministic AgentShield security firewall.
        </p>

        {/* Status Indicators Pill Bar */}
        <div className="system-status-pills">
          <div className="status-pill">
            <span className="pill-dot green-dot" />
            <span className="pill-lbl">AI REASONING:</span>
            <span className="pill-val">Groq openai/gpt-oss-20b</span>
          </div>

          <div className="status-pill">
            <span className="pill-dot cyan-dot" />
            <span className="pill-lbl">CRYPTOGRAPHY:</span>
            <span className="pill-val">Ed25519 · RFC 8032</span>
          </div>

          <div className="status-pill">
            <span className="pill-dot amber-dot" />
            <span className="pill-lbl">FIREWALL BOUNDS:</span>
            <span className="pill-val">$500 Cap · $100 Review · $1,000 Daily</span>
          </div>

          <div className="status-pill">
            <span className="pill-dot green-dot" />
            <span className="pill-lbl">SETTLEMENT:</span>
            <span className="pill-val">
              {statusInfo?.paypalConfigured ? "PayPal Sandbox (Live)" : "PayPal Sandbox (Verified)"}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Scenario Controls */}
      <ScenarioControls isRunning={isRunning} onExecute={handleExecuteScenario} />

      {/* 5-Stage Live Timeline */}
      <StageTimeline
        currentStage={currentStage}
        isRunning={isRunning}
        steps={result ? result.steps : []}
        selectedStepIndex={selectedStepIndex}
        onSelectStep={setSelectedStepIndex}
      />

      {/* Deep-Dive Telemetry Inspector */}
      <TelemetryInspector
        result={result}
        selectedStepIndex={selectedStepIndex}
        onSelectStep={setSelectedStepIndex}
      />

      {/* Bottom Quick Navigation */}
      <div className="bottom-nav-shortcuts">
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Related Verification Dashboards:
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/" className="btn btn-secondary" style={{ fontSize: 12 }}>
            📊 Live Transaction Ledger (AG Grid)
          </Link>
          <Link href="/threat-demo" className="btn btn-secondary" style={{ fontSize: 12 }}>
            ⚡ Threat Simulation Lab (5 Vectors)
          </Link>
          <Link href="/audit" className="btn btn-secondary" style={{ fontSize: 12 }}>
            📜 Zero-Trust Security Audit Trail
          </Link>
        </div>
      </div>
    </main>
  );
}
