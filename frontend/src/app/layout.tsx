import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentShield | AI Payment Verification",
  description: "Verify the agent. Validate the intent. Secure the payment."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><div className="shell">
    <nav className="nav">
      <Link href="/" className="brand">◈ AGENTSHIELD</Link>
      <Link href="/agents">Agents</Link>
      <Link href="/threat-demo">Threat Demo</Link>
      <Link href="/approvals">Approvals</Link>
      <Link href="/audit">Audit</Link>
    </nav>
    {children}
    <footer>AgentShield development starter · PayPal Sandbox is optional until configured · Never use for production payments without a security review.</footer>
  </div></body></html>;
}
