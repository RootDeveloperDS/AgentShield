import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentShield | Enterprise AI Payment Security Gateway",
  description: "Cryptographic verification proxy for autonomous AI-to-AI transactions."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <nav className="nav">
            <Link href="/" className="brand">
              <span>◈ AGENTSHIELD</span>
              <span className="brand-badge">ENTERPRISE GATEWAY</span>
            </Link>

            <div className="nav-links">
              <Link href="/">Dashboard</Link>
              <Link href="/agent-live" style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>
                🤖 AI Agent Live
              </Link>
              <Link href="/threat-demo">Threat Lab</Link>
              <Link href="/approvals">Approvals</Link>
              <Link href="/audit">Audit Trail</Link>
              <Link href="/agents">Agent Registry</Link>
            </div>

            <div className="nav-status">
              <span className="status-dot online" />
              <span>Gateway Port 4000</span>
            </div>
          </nav>

          {children}

          <footer>
            <div>
              <strong>AgentShield Gateway v1.5.0</strong> · Zero-Trust Financial Firewall for Autonomous AI Agents · Powered by <strong>Groq (openai/gpt-oss-20b)</strong>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <span>Powered by <strong>AG Grid Community</strong></span>
              <span>·</span>
              <span>PayPal REST API v2 Sandbox</span>
              <span>·</span>
              <span>Ed25519 (RFC 8032)</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
