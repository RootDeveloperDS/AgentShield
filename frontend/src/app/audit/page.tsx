"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
type Event = {id:string;eventType:string;entityId?:string|null;message:string;createdAt:string};
export default function AuditPage(){
 const [events,setEvents]=useState<Event[]>([]); const [error,setError]=useState("");
 useEffect(()=>{fetch(`${API}/api/audit`).then(r=>r.json()).then(setEvents).catch(()=>setError("Backend unavailable."));},[]);
 return <main><h1>Audit Log</h1><p className="muted">Security-relevant events recorded by the backend.</p>{error&&<p className="muted">{error}</p>}
 <section className="card">{events.length===0?<p className="muted">No audit events yet.</p>:events.map(e=><p key={e.id} className="muted">{new Date(e.createdAt).toLocaleString()} · <strong>{e.eventType}</strong> · {e.entityId??"—"} · {e.message}</p>)}</section></main>;
}
