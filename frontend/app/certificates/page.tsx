"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { listCertificates } from "@/lib/latch";
import { short } from "@/lib/format";
export default function Certificates(){
 const [items,setItems]=useState<any[]>([]);const[error,setError]=useState("");useEffect(()=>{listCertificates(0,24).then((r:any)=>setItems((r?.items||[]).slice().reverse())).catch(e=>setError(e.message));},[]);
 return <div className="shell"><div className="page-head"><div><div className="eyebrow">finalized repairs</div><h1>Certificates</h1><p>A Latch certificate binds the frozen work order, exact candidate SHA and final assessment capsule. It is an output, not a claim that the entire software package is universally safe.</p></div></div>{error?<div className="error-box">{error}</div>:items.length?<div className="work-grid">{items.map(c=><Link href={`/bounties/${c.bounty_id}`} className="certificate" key={c.bounty_id}><small>{c.bounty_id} / repair certificate</small><h3>{c.title}</h3><code>{c.candidate_commit}</code><div className="certificate-foot"><div><small>winner</small><div className="mono">{short(c.winner,9,7)}</div></div><div className="certificate-seal"><CheckCircle2 size={17}/>LATCH</div></div></Link>)}</div>:<div className="empty-state"><strong>No finalized repair certificate yet.</strong>The first surviving qualified patch will appear here.</div>}</div>;
}
