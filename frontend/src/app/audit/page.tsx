"use client";

import { AuditGrid } from "../../components/AuditGrid";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function AuditPage() {
  return (
    <main>
      <div style={{ marginBottom: 20 }}>
        <span className="badge badge-sky" style={{ marginBottom: 12 }}>
          COMPLIANCE & EVENT TELEMETRY
        </span>
        <h1>Security Audit Trail</h1>
        <p className="subtitle">
          Authoritative, immutable event log capturing cryptographic handshake verifications, policy rule evaluations, replay attack blocks, and asynchronous PayPal webhook state transitions.
        </p>
      </div>

      {/* AG Grid Audit Trail */}
      <AuditGrid apiBaseUrl={API} />
    </main>
  );
}
