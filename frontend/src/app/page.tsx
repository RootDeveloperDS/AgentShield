"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TransactionGrid } from "../components/TransactionGrid";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface HealthData {
  ok?: boolean;
  service?: string;
  paypal?: string;
  timestamp?: string;
}

export default function Dashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/health`).then((r) => r.json()).catch(() => null),
      fetch(`${API}/api/transactions`).then((r) => r.json()).catch(() => [])
    ]).then(([healthData, txData]) => {
      if (healthData) setHealth(healthData);
      if (Array.isArray(txData)) setTransactions(txData);
      setLoading(false);
    });
  }, []);

  const totalVolumeMinor = transactions.reduce((sum, tx) => {
    if (tx.status === "COMPLETED") return sum + Number(tx.amountMinor || 0);
    return sum;
  }, 0);

  const completedCount = transactions.filter((t) => t.status === "COMPLETED").length;
  const reviewCount = transactions.filter((t) => t.status === "FLAGGED_HUMAN_REVIEW").length;
  const rejectedCount = transactions.filter((t) => t.status === "REJECTED_POLICY" || t.status === "FAILED").length;

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span className="badge badge-sky" style={{ marginBottom: 12 }}>
            ENTERPRISE AI-TO-AI PAYMENT GATEWAY
          </span>
          <h1>Autonomous Agent Financial Firewall</h1>
          <p className="subtitle">
            Zero-trust verification proxy enforcing Ed25519 digital signatures, deterministic policy limits, replay protection, and PayPal Sandbox settlement.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/threat-demo" className="button-secondary">
            ⚡ Threat Simulator
          </Link>
          <Link href="/agents" className="button-primary">
            + Register Agent
          </Link>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span>Security Engine</span>
            <span className={`status-dot ${health?.ok ? "online" : ""}`} />
          </div>
          <div className="metric-value">
            {health?.ok ? "Online" : "Connecting…"}
          </div>
          <div className="metric-sub">
            <span>Ed25519 + Nonce + Rate Limits Active</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>PayPal Gateway</span>
            <span className={`status-dot ${health?.paypal === "configured" ? "online" : ""}`} />
          </div>
          <div className="metric-value">
            {health?.paypal === "configured" ? "Sandbox Live" : "Unconfigured"}
          </div>
          <div className="metric-sub">
            <span>Webhook Reconciliation Verified</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Protected Volume</span>
            <span style={{ fontSize: 13 }}>💰</span>
          </div>
          <div className="metric-value" style={{ color: "#38bdf8" }}>
            ${(totalVolumeMinor / 100).toFixed(2)} USD
          </div>
          <div className="metric-sub">
            <span>{completedCount} Completed Transactions</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Policy Governance</span>
            <span style={{ fontSize: 13 }}>🛡️</span>
          </div>
          <div className="metric-value" style={{ color: reviewCount > 0 ? "#fbbf24" : "#10b981" }}>
            {reviewCount} Pending Review
          </div>
          <div className="metric-sub">
            <span>{rejectedCount} Threat Intent Rejections</span>
          </div>
        </div>
      </div>

      {/* AG Grid Transaction Ledger (Sponsor Bounty Implementation) */}
      <TransactionGrid initialData={transactions} apiBaseUrl={API} />

      {/* Architecture Highlights */}
      <div className="metrics-grid" style={{ marginTop: 24 }}>
        <div className="metric-card">
          <div className="metric-header">
            <span>01 · Identity Verification</span>
          </div>
          <h3 style={{ margin: "10px 0 6px", fontSize: 15 }}>RFC 8032 Cryptography</h3>
          <p className="subtitle" style={{ fontSize: 13, margin: 0 }}>
            Every intent must be cryptographically signed by an agent&apos;s registered Ed25519 private key. Forged and altered payloads fail closed.
          </p>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>02 · Replay Immunity</span>
          </div>
          <h3 style={{ margin: "10px 0 6px", fontSize: 15 }}>Atomic Nonce Database</h3>
          <p className="subtitle" style={{ fontSize: 13, margin: 0 }}>
            High-entropy cryptographic nonces with atomic database constraints guarantee no payment intent can ever be re-executed twice.
          </p>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>03 · Policy Bounds</span>
          </div>
          <h3 style={{ margin: "10px 0 6px", fontSize: 15 }}>Deterministic Limits</h3>
          <p className="subtitle" style={{ fontSize: 13, margin: 0 }}>
            Hard $500 per-transaction cap, $1,000 daily spend ceiling, strict self-payment blocking, and $100 human-in-the-loop escalation.
          </p>
        </div>
      </div>
    </main>
  );
}
