"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listBounties } from "@/lib/latch";
import { WorkOrderCard } from "@/components/WorkOrderCard";

export default function BountiesPage() {
  const [items, setItems] = useState<any[]>([]); const [q,setQ]=useState(""); const [status,setStatus]=useState("ALL"); const [error,setError]=useState("");
  useEffect(()=>{ listBounties(0,24).then((r:any)=>setItems((r?.items||[]).slice().reverse())).catch(e=>setError(e.message)); },[]);
  const filtered=useMemo(()=>items.filter(x=>{ const hit=!q||`${x.title} ${x.repository_url} ${x.id}`.toLowerCase().includes(q.toLowerCase()); return hit&&(status==="ALL"||x.status===status);}),[items,q,status]);
  return <div className="shell">
    <div className="page-head"><div><div className="eyebrow">public repair market</div><h1>Work orders</h1><p>Every card is finalized contract state. No server-side market mirror and no simulated bounty data.</p></div><div className="toolbar"><Link href="/open" className="primary"><Plus size={14}/> new work order</Link></div></div>
    <div className="toolbar" style={{marginBottom:20}}><input className="input" placeholder="search repository, title or id" value={q} onChange={e=>setQ(e.target.value)}/><select className="select" style={{maxWidth:220}} value={status} onChange={e=>setStatus(e.target.value)}><option>ALL</option><option>OPEN</option><option>QUALIFIED_PENDING</option><option>CLOSED</option><option>EXPIRED</option></select></div>
    {error?<div className="error-box">{error}</div>:filtered.length?<div className="work-grid">{filtered.map(x=><WorkOrderCard key={x.id} bounty={x}/>)}</div>:<div className="empty-state"><strong>Nothing matches.</strong>Change the filter or open a new work order.</div>}
  </div>;
}
