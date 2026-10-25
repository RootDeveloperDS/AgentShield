"use client";
import { useState } from "react";
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
export default function ThreatDemo() {
  const [result,setResult] = useState("");
  async function check(){ try { const r=await fetch(`${API}/health`); const d=await r.json(); setResult(JSON.stringify({api:d, note:"This starter exposes real verification endpoints. To test attacks, submit signed intents with altered fields or reused nonces; no fake payment is performed."},null,2)); } catch { setResult("Backend unavailable. Start npm run dev:backend."); } }
  return <main><h1>Threat Demonstration</h1><p className="muted">Use this page to check API readiness. Security decisions are made by the backend; this page does not fabricate attack outcomes.</p>
    <section className="card"><h2>Backend readiness</h2><button className="button" onClick={check}>Check API</button>{result && <pre>{result}</pre>}</section>
    <div className="grid">{["Forged signature","Tampered amount","Expired intent","Replayed nonce"].map(name=><section className="card" key={name}><h2>{name}</h2><p className="muted">Expected outcome: reject the request before payment execution.</p></section>)}</div>
  </main>;
}
