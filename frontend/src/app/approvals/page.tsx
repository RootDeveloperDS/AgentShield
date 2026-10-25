"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
type Approval = {id:string;recipient:string;currency:string;amountMinor:string;decisionReason?:string};
export default function ApprovalsPage(){
 const [items,setItems]=useState<Approval[]>([]); const [message,setMessage]=useState("");
 async function load(){try{const r=await fetch(`${API}/api/approvals`);setItems(await r.json());}catch{setMessage("Backend unavailable.");}}
 useEffect(()=>{void load();},[]);
 async function decide(id:string,approved:boolean){try{const r=await fetch(`${API}/api/approvals/${encodeURIComponent(id)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({approved})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Decision failed");setMessage(`${id}: ${d.status}`);await load();}catch(e){setMessage(e instanceof Error?e.message:"Request failed");}}
 return <main><h1>Human Approval Queue</h1><p className="muted">Review intents that exceed the configured human-review threshold.</p>{message&&<p className="muted">{message}</p>}
 {items.length===0?<section className="card"><p className="muted">No pending approvals.</p></section>:items.map(i=><section className="card" key={i.id} style={{marginBottom:12}}><h2>{i.id}</h2><p className="muted">{i.recipient} · {i.currency} {i.amountMinor} · {i.decisionReason}</p><button className="button" onClick={()=>decide(i.id,true)}>Approve</button> <button className="button" style={{background:"#9f3030"}} onClick={()=>decide(i.id,false)}>Reject</button></section>)}
 </main>;
}
