"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function Dashboard() {
  const [health, setHealth] = useState<{ok?: boolean; paypal?: string} | null>(null);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState<Array<{id:string;status:string;recipient:string;currency:string;amountMinor:string|number}>>([]);

  useEffect(() => {
    fetch(`${API}/health`).then(r => r.json()).then(setHealth).catch(() => setError("Backend unavailable. Start the backend on port 4000."));
    fetch(`${API}/api/transactions`).then(r => { if (!r.ok) throw new Error("Could not load transactions"); return r.json(); }).then(setTransactions).catch(() => {});
  }, []);

  return <main>
    <span className="pill">AI-TO-AI PAYMENT SECURITY</span>
    <h1 style={{marginTop:16}}>Verify the agent.<br/>Validate the intent. Secure the payment.</h1>
    <p className="muted">AgentShield checks agent identity, signed transaction intent, replay protection, and policy before a payment can proceed.</p>
    {error && <p role="alert" className="muted">{error}</p>}
    <div className="grid">
      <section className="card"><h2>API status</h2><div className="metric">{health?.ok ? "Online" : "Checking…"}</div><span className="pill">{health?.ok ? "localhost:4000" : "Waiting for backend"}</span></section>
      <section className="card"><h2>PayPal Sandbox</h2><div className="metric">{health?.paypal === "configured" ? "Configured" : "Not configured"}</div><p className="muted">Payment execution remains disabled until valid server-side credentials are configured.</p></section>
      <section className="card"><h2>Recent transactions</h2><div className="metric">{transactions.length}</div><p className="muted">Persisted records returned by the backend.</p></section>
    </div>
    <section className="card">
      <h2>Recent transaction records</h2>
      {transactions.length === 0 ? <p className="muted">No transaction records yet. Register an agent and submit a signed intent to begin testing.</p> :
      transactions.slice(0,8).map(t => <p key={t.id} className="muted">{t.id} · {t.status} · {t.recipient} · {t.currency} {t.amountMinor}</p>)}
    </section>
    <div className="grid">
      <section className="card"><h2>Identity verification</h2><p className="muted">Ed25519 signatures are checked against a registered public key.</p></section>
      <section className="card"><h2>Replay protection</h2><p className="muted">Unique nonces are stored with database uniqueness constraints.</p></section>
      <section className="card"><h2>Deterministic policies</h2><p className="muted">Currency, amount, recipient, and human-review rules are evaluated before payment.</p></section>
    </div>
  </main>;
}
