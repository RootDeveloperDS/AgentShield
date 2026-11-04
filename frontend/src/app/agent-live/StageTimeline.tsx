"use client";

import React from "react";
import type { AutonomousStepTrace } from "./types";

interface StageTimelineProps {
  currentStage: number; // 0 = idle, 1..5 = running or completed
  isRunning: boolean;
  steps: AutonomousStepTrace[];
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
}

const STAGE_DEFINITIONS = [
  {
    step: 1,
    name: "Groq Reasoning",
    category: "REASONING",
    icon: "🧠",
    desc: "Autonomous LLM reasoning & structured JSON intent extraction"
  },
  {
    step: 2,
    name: "Ed25519 Handshake",
    category: "CRYPTO",
    icon: "🔐",
    desc: "Proof-of-possession challenge-response key verification"
  },
  {
    step: 3,
    name: "Canonical Signing",
    category: "CRYPTO",
    icon: "✍️",
    desc: "RFC 8032 Curve25519 digital signature with atomic nonce"
  },
  {
    step: 4,
    name: "Policy Firewall",
    category: "FIREWALL",
    icon: "🛡️",
    desc: "Zero-trust deterministic limits & spending rule checks"
  },
  {
    step: 5,
    name: "PayPal Settlement",
    category: "SETTLEMENT",
    icon: "💳",
    desc: "PayPal Sandbox order capture or deterministic attack drop"
  }
];

export function StageTimeline({
  currentStage,
  isRunning,
  steps,
  selectedStepIndex,
  onSelectStep
}: StageTimelineProps) {
  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="live-pulse-dot" />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.8, color: "var(--accent-cyan)" }}>
            ZERO-TRUST EXECUTION PIPELINE
          </span>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {isRunning ? "Pipeline active · executing steps..." : steps.length > 0 ? "Execution complete · click any stage to inspect" : "Awaiting scenario trigger"}
        </span>
      </div>

      <div className="stages-row">
        {STAGE_DEFINITIONS.map((def, idx) => {
          const stepData = steps.find((s) => s.step === def.step);
          const isCurrent = isRunning && currentStage === def.step;
          const isDone = Boolean(stepData);
          const isBlocked = stepData?.status === "BLOCKED";
          const isSelected = selectedStepIndex === idx;

          let nodeClass = "stage-node pending";
          if (isCurrent) nodeClass = "stage-node active";
          else if (isBlocked) nodeClass = "stage-node blocked";
          else if (isDone) nodeClass = "stage-node success";

          return (
            <React.Fragment key={def.step}>
              <div
                className={`stage-card ${nodeClass} ${isSelected ? "selected" : ""}`}
                onClick={() => isDone && onSelectStep(idx)}
                style={{ cursor: isDone ? "pointer" : "default" }}
              >
                <div className="stage-top">
                  <span className="stage-icon">{def.icon}</span>
                  <span className="stage-step-num">STAGE 0{def.step}</span>
                  <span className={`status-chip ${isBlocked ? "chip-blocked" : isDone ? "chip-success" : isCurrent ? "chip-running" : "chip-idle"}`}>
                    {isBlocked ? "BLOCKED" : isDone ? "PASSED" : isCurrent ? "ACTIVE" : "QUEUED"}
                  </span>
                </div>

                <div className="stage-name">{def.name}</div>
                <div className="stage-desc">{stepData ? stepData.title : def.desc}</div>

                {stepData && (
                  <div className="stage-footer">
                    <span className="timestamp-text">
                      {new Date(stepData.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="inspect-link">
                      {isSelected ? "Inspecting ▼" : "Inspect ↗"}
                    </span>
                  </div>
                )}
              </div>

              {idx < STAGE_DEFINITIONS.length - 1 && (
                <div className={`stage-connector ${isDone ? (steps[idx + 1] ? "connector-passed" : isBlocked ? "connector-blocked" : "") : ""}`}>
                  <div className="connector-line" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
