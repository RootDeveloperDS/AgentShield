"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "../../components/StatusBadge";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface ApprovalItem {
  id: string;
  agentId?: string;
  recipient: string;
  currency: string;
  amountMinor: string | number;
  status: string;
  decisionReason?: string;
  createdAt: string;
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; msg: string; type: "success" | "error" } | null>(null);

  const loadApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/approvals`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch {
      // Backend unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleDecision = async (id: string, approved: boolean) => {
    try {
      setActionFeedback(null);
      const res = await fetch(`${API}/api/approvals/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Decision submission failed");
      }
      setActionFeedback({
        id,
        msg: approved
          ? `✓ Payment intent ${id} authorized and executed via PayPal.`
          : `✕ Payment intent ${id} rejected. Status marked as REJECTED_POLICY.`,
        type: approved ? "success" : "error"
      });
      await loadApprovals();
    } catch (err) {
      setActionFeedback({
        id,
        msg: err instanceof Error ? err.message : "Request failed",
        type: "error"
      });
    }
  };

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <span className="badge badge-amber" style={{ marginBottom: 12 }}>
            HUMAN-IN-THE-LOOP GOVERNANCE
          </span>
          <h1>Human Approval Escalation Queue</h1>
          <p className="subtitle">
            Autonomous agent transactions exceeding the $100.00 automated threshold are halted here. A human security officer must inspect and authorize execution before settlement.
          </p>
        </div>

        <button className="button-secondary" onClick={loadApprovals} disabled={loading}>
          {loading ? "⟳ Loading…" : "⟳ Refresh Queue"}
        </button>
      </div>

      {actionFeedback && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
            background: actionFeedback.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)",
            border: `1px solid ${actionFeedback.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
            color: actionFeedback.type === "success" ? "#34d399" : "#fb7185"
          }}
        >
          {actionFeedback.msg}
        </div>
      )}

      {items.length === 0 ? (
        <div className="grid-container" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛡️</div>
          <h3 style={{ margin: "0 0 8px" }}>No Pending Approvals</h3>
          <p className="subtitle" style={{ maxWidth: 460, margin: "0 auto 18px" }}>
            All incoming autonomous intents are either within automated policy limits or have already been reviewed.
          </p>
          <Link href="/threat-demo" className="button-primary button-sm">
            Simulate a High-Value Intent ($150) in Threat Demo →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map((item) => {
            const amountNum = Number(item.amountMinor) / 100;
            const formatted = `$${amountNum.toFixed(2)} ${item.currency || "USD"}`;

            return (
              <div key={item.id} className="detail-card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: "#38bdf8" }}>
                        {item.id}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <span style={{ fontSize: 12.5, color: "#8da6c7" }}>
                      Created: {new Date(item.createdAt).toLocaleString()} · Origin: {item.agentId || "registered-agent"}
                    </span>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 24, fontWeight: 750, color: "#fbbf24" }}>
                      {formatted}
                    </div>
                    <span style={{ fontSize: 12, color: "#8da6c7" }}>To: {item.recipient}</span>
                  </div>
                </div>

                <div style={{ background: "#0c1626", border: "1px solid #1c2e44", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                  <strong style={{ color: "#f59e0b" }}>Policy Trigger Reason:</strong>{" "}
                  <span style={{ color: "#cbd5e1" }}>
                    {item.decisionReason || "Exceeds automated transaction limit ($100.00 USD)."}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    className="button-danger"
                    onClick={() => handleDecision(item.id, false)}
                  >
                    Reject Intent
                  </button>
                  <button
                    className="button-primary"
                    onClick={() => handleDecision(item.id, true)}
                  >
                    Authorize & Execute Payment (PayPal Sandbox)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
