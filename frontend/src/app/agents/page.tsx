"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
type Agent = {id:string;name:string;status:string;createdAt:string};
export default function AgentsPage() {
  const [agents,setAgents] = useState<Agent[]>([]);
  const [id,setId] = useState(""); const [name,setName] = useState(""); const [key,setKey] = useState("");
  const [message,setMessage] = useState("");
  async function load(){ try { const r=await fetch(`${API}/api/agents`); setAgents(await r.json()); } catch { setMessage("Backend unavailable."); } }
  useEffect(()=>{ void load(); },[]);
  async function submit(e:React.FormEvent){ e.preventDefault(); setMessage(""); try {
    const r=await fetch(`${API}/api/agents`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,name,publicKey:key})});
    const data=await r.json(); if(!r.ok) throw new Error(data.message || data.error || "Registration failed");
    setMessage("Agent registered."); setId("");setName("");setKey("");await load();
  } catch(err){setMessage(err instanceof Error?err.message:"Request failed");}}
  return <main><h1>Agent Registry</h1><p className="muted">Register an agent's Ed25519 public key. Never enter a private key here.</p>
    <div className="grid"><section className="card"><h2>Register agent</h2><form onSubmit={submit}>
      <label>Agent ID<input value={id} onChange={e=>setId(e.target.value)} required minLength={3}/></label>
      <label>Display name<input value={name} onChange={e=>setName(e.target.value)} required/></label>
      <label>Public key (PEM)<input value={key} onChange={e=>setKey(e.target.value)} required minLength={40}/></label>
      <button className="button">Register</button></form>{message && <p className="muted" role="status">{message}</p>}</section>
    <section className="card"><h2>Registered agents</h2>{agents.length===0?<p className="muted">No agents registered.</p>:agents.map(a=><p key={a.id} className="muted"><strong>{a.name}</strong> · {a.id} · {a.status}</p>)}</section></div>
  </main>;
}
