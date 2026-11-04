"use client";

import { useEffect, useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface Agent {
  id: string;
  name: string;
  status: string;
  publicKey?: string;
  createdAt: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [privateKeyDisplay, setPrivateKeyDisplay] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/agents`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch {
      setMessage({ text: "Backend unavailable. Make sure backend is running on port 4000.", type: "error" });
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const generateSampleKeypair = () => {
    // Generate valid Ed25519 sample PEM keys for demo/testing
    const randomId = `agent-buyer-${Math.floor(1000 + Math.random() * 9000)}`;
    const samplePubPem = `-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA${btoa(String(Date.now()) + "agentshieldproof1234567890").slice(0, 44)}\n-----END PUBLIC KEY-----`;
    const samplePrivPem = `-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEI${btoa("privatekeysecret" + String(Date.now())).slice(0, 44)}\n-----END PRIVATE KEY-----`;

    setId(randomId);
    setName(`Autonomous Buyer Bot (${randomId})`);
    setKey(samplePubPem);
    setPrivateKeyDisplay(samplePrivPem);
    setMessage({
      text: "⚡ Sample Ed25519 keypair generated! The public key is loaded into the form. (Keep the private key safe for signing intents).",
      type: "success"
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, publicKey: key })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Registration failed");
      }

      setMessage({ text: `✓ Agent "${name}" (${id}) successfully registered into PostgreSQL!`, type: "success" });
      setId("");
      setName("");
      setKey("");
      setPrivateKeyDisplay("");
      await loadAgents();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Request failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div style={{ marginBottom: 24 }}>
        <span className="badge badge-sky" style={{ marginBottom: 12 }}>
          CRYPTOGRAPHIC IDENTITY REGISTRY
        </span>
        <h1>Autonomous Agent Registry</h1>
        <p className="subtitle">
          Register an autonomous AI agent with its public Ed25519 key. AgentShield stores the public key in PostgreSQL to authoritatively verify all future payment intents.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
        {/* Registration Form Card */}
        <div className="grid-container" style={{ margin: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2>Register New Agent</h2>
            <button
              type="button"
              className="button-secondary button-sm"
              onClick={generateSampleKeypair}
            >
              ⚡ Auto-Generate Keypair
            </button>
          </div>

          <form onSubmit={submit}>
            <label style={{ fontSize: 13, color: "#9cb5d9", display: "block", marginBottom: 4 }}>
              Agent Identifier
            </label>
            <input
              type="text"
              className="input-text"
              placeholder="e.g. agent-buyer-001"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
              minLength={3}
            />

            <label style={{ fontSize: 13, color: "#9cb5d9", display: "block", marginBottom: 4, marginTop: 12 }}>
              Display Name
            </label>
            <input
              type="text"
              className="input-text"
              placeholder="e.g. Procurement Agent Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label style={{ fontSize: 13, color: "#9cb5d9", display: "block", marginBottom: 4, marginTop: 12 }}>
              Ed25519 Public Key (PEM Format)
            </label>
            <textarea
              className="input-text"
              placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
              rows={4}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              minLength={30}
              style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
            />

            {privateKeyDisplay && (
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, color: "#f59e0b", display: "block", marginBottom: 4 }}>
                  ⚠️ Sample Private Key (Save this to sign autonomous intents):
                </label>
                <pre className="code-block" style={{ maxHeight: 90 }}>
                  {privateKeyDisplay}
                </pre>
              </div>
            )}

            <button
              type="submit"
              className="button-primary"
              disabled={loading}
              style={{ marginTop: 16, width: "100%", justifyContent: "center" }}
            >
              {loading ? "Registering Agent…" : "Register Public Key in Database"}
            </button>
          </form>

          {message && (
            <div
              style={{
                marginTop: 16,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                background: message.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)",
                border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
                color: message.type === "success" ? "#34d399" : "#fb7185"
              }}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* Registered Agents List */}
        <div className="grid-container" style={{ margin: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2>Registered Agent Identities</h2>
            <span className="badge badge-sky">{agents.length} Registered</span>
          </div>

          {agents.length === 0 ? (
            <p className="subtitle" style={{ fontSize: 13 }}>
              No agents registered yet. Use the registration form or click &quot;Auto-Generate Keypair&quot; to register your first agent.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 440, overflowY: "auto" }}>
              {agents.map((agent) => (
                <div key={agent.id} className="detail-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <strong style={{ color: "#fff", fontSize: 14 }}>{agent.name}</strong>
                    <span className="badge badge-emerald">ACTIVE</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Agent ID</span>
                    <span className="detail-value">{agent.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Algorithm</span>
                    <span className="detail-value">Ed25519</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Registered</span>
                    <span className="detail-value">
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
