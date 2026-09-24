"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useInjectedWallet } from "@/lib/wallet";
import { write, waitFinal, read } from "@/lib/latch";
import { parseGen } from "@/lib/format";
import { EXPLORER_URL } from "@/lib/config";
import { TxNotice } from "@/components/TxNotice";

export default function OpenPage(){
  const wallet=useInjectedWallet(); const router=useRouter(); const [busy,setBusy]=useState(false); const [phase,setPhase]=useState(""); const [hash,setHash]=useState("");
  const [title,setTitle]=useState(""); const [repo,setRepo]=useState(""); const [issue,setIssue]=useState(""); const [base,setBase]=useState(""); const [branch,setBranch]=useState("main"); const [problem,setProblem]=useState("");
  const [scope,setScope]=useState(""); const [forbidden,setForbidden]=useState(""); const [policy,setPolicy]=useState(""); const [bounty,setBounty]=useState(""); const [hours,setHours]=useState("72"); const [challenge,setChallenge]=useState("60"); const [ci,setCi]=useState(true);
  const [criteria,setCriteria]=useState([{id:"C1",text:"",evidence_hint:""},{id:"C2",text:"",evidence_hint:""}]);
  async function submit(){
    if(!wallet.address) return toast.error("Connect an injected wallet first");
    if(!wallet.correctNetwork) { try{await wallet.switchNetwork();}catch(e:any){return toast.error(e.message);} }
    if(!title||!repo.startsWith("https://")||!issue.startsWith("https://")||!/^[0-9a-fA-F]{40}$/.test(base)||!problem||!scope||!forbidden||!policy||criteria.some(x=>x.text.trim().length<8)) return toast.error("Complete the sealed work order first");
    let value:bigint; try{value=parseGen(bounty);}catch(e:any){return toast.error(e.message);}
    const closes=Math.floor(Date.now()/1000)+Math.round(Number(hours)*3600); const challengeSeconds=Math.round(Number(challenge)*60);
    setBusy(true);
    try{
      setPhase("estimate + submit");
      const tx=await write(wallet.address,"create_bounty",[title,repo,issue,base.toLowerCase(),branch,problem,JSON.stringify(criteria),scope,forbidden,policy,ci,closes,challengeSeconds],value);
      setHash(tx); setPhase("consensus / finality"); await waitFinal(tx); setPhase("finalized");
      const latest = await read("find_latest_bounty_by_sponsor",[wallet.address]) as string;
      toast.success("Work order finalized"); if(latest) router.push(`/bounties/${latest}`); else router.push("/bounties");
    }catch(e:any){toast.error(e?.message||"Create failed"); setPhase("failed");}finally{setBusy(false);}
  }
  return <div className="shell">
    <div className="page-head"><div><div className="eyebrow">seal the job before the race</div><h1>Open a work order</h1><p>A repair spec cannot be edited after funding. Write criteria that another engineer could verify from the exact patch and public CI evidence.</p></div></div>
    <div className="form-grid"><div className="form-stack">
      <section className="form-panel"><h2>01 · identify the artifact</h2><div className="two-col"><div className="field"><label>work order title</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Repair multiline CSV parsing"/></div><div className="field"><label>target branch</label><input className="input" value={branch} onChange={e=>setBranch(e.target.value)}/></div></div><div className="field" style={{marginTop:14}}><label>repository URL</label><input className="input" value={repo} onChange={e=>setRepo(e.target.value)} placeholder="https://github.com/org/repo"/></div><div className="field" style={{marginTop:14}}><label>issue URL</label><input className="input" value={issue} onChange={e=>setIssue(e.target.value)} placeholder="https://github.com/org/repo/issues/418"/></div><div className="field" style={{marginTop:14}}><label>frozen base commit · 40 hex</label><input className="input mono" value={base} onChange={e=>setBase(e.target.value)} placeholder="8a95c7…"/></div></section>
      <section className="form-panel"><h2>02 · define the repair</h2><div className="field"><label>problem statement</label><textarea className="textarea" value={problem} onChange={e=>setProblem(e.target.value)} placeholder="Describe the observable failure and what the patch must correct."/></div></section>
      <section className="form-panel"><h2>03 · acceptance gauge</h2><div className="form-stack">{criteria.map((c,i)=><div key={i} className="two-col"><div className="field"><label>criterion id</label><input className="input mono" value={c.id} onChange={e=>setCriteria(xs=>xs.map((x,j)=>j===i?{...x,id:e.target.value.toUpperCase()}:x))}/></div><div className="field"><label>required behaviour</label><input className="input" value={c.text} onChange={e=>setCriteria(xs=>xs.map((x,j)=>j===i?{...x,text:e.target.value}:x))} placeholder="CRLF quoted fields round-trip without data loss"/></div></div>)}</div><div className="action-row"><button className="mini-button" onClick={()=>criteria.length<8&&setCriteria([...criteria,{id:`C${criteria.length+1}`,text:"",evidence_hint:""}])}>+ criterion</button><button className="mini-button danger" onClick={()=>criteria.length>1&&setCriteria(criteria.slice(0,-1))}>remove last</button></div></section>
      <section className="form-panel"><h2>04 · lock the boundary</h2><div className="field"><label>allowed scope</label><textarea className="textarea" value={scope} onChange={e=>setScope(e.target.value)} placeholder="Changes may touch src/csv/** and tests/csv/** only."/></div><div className="field" style={{marginTop:14}}><label>forbidden changes</label><textarea className="textarea" value={forbidden} onChange={e=>setForbidden(e.target.value)} placeholder="No dependency replacement, API removal, or unrelated refactor."/></div><div className="field" style={{marginTop:14}}><label>evidence policy</label><textarea className="textarea" value={policy} onChange={e=>setPolicy(e.target.value)} placeholder="Use upstream repository pages and official CI bound to the exact candidate SHA."/></div><label style={{display:"flex",gap:9,alignItems:"center",marginTop:14,fontSize:12}}><input type="checkbox" checked={ci} onChange={e=>setCi(e.target.checked)}/> exact-SHA CI evidence required</label></section>
      <section className="form-panel"><h2>05 · fund + timebox</h2><div className="three-col"><div className="field"><label>bounty · GEN</label><input className="input" inputMode="decimal" value={bounty} onChange={e=>setBounty(e.target.value)} placeholder="5"/></div><div className="field"><label>open window · hours</label><input className="input" inputMode="decimal" value={hours} onChange={e=>setHours(e.target.value)}/></div><div className="field"><label>challenge window · minutes</label><input className="input" inputMode="numeric" value={challenge} onChange={e=>setChallenge(e.target.value)}/></div></div></section>
    </div><aside className="form-aside"><div className="summary-ticket"><small>sealed capital</small><strong>{bounty||"—"} GEN</strong><p>The bounty, spec and evidence boundary lock in the same transaction. The sponsor cannot submit to their own job and cannot pick the winner.</p><button className="primary" onClick={submit} disabled={busy}>{busy?"working…":"fund + seal work order"}</button><TxNotice phase={phase} hash={hash}/>{hash?<a style={{display:"block",font:"10px monospace",marginTop:10}} href={`${EXPLORER_URL}/tx/${hash}`} target="_blank">open transaction ↗</a>:null}</div><div className="rule-note" style={{marginTop:18}}>Submission bond = 1% of bounty with a 0.0001 GEN floor. Challenge bond = 2% with a 0.0002 GEN floor. Money paths are deterministic; AI only decides evidence-backed status.</div></aside></div>
  </div>;
}
