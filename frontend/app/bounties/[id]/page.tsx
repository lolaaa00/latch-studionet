"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, ShieldAlert, Wrench, CheckCircle2, RotateCw } from "lucide-react";
import { getBounty, listSubmissions, read, write, waitFinal } from "@/lib/latch";
import { useInjectedWallet } from "@/lib/wallet";
import { makeSaltHex, saveReveal, loadReveals, finalizeReveal } from "@/lib/reveal";
import { EXPLORER_URL } from "@/lib/config";
import { formatGen, short, timeLeft, when } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";
import { TxNotice } from "@/components/TxNotice";

const baseEvidence = () => [
  { kind:"COMMIT", url:"", note:"exact candidate commit page" },
  { kind:"DIFF", url:"", note:"candidate diff / patch" },
  { kind:"CI", url:"", note:"official CI bound to candidate SHA" },
];

export default function BountyDetail(){
  const params=useParams<{id:string}>(); const id=params.id; const wallet=useInjectedWallet();
  const [bounty,setBounty]=useState<any>(null); const [subs,setSubs]=useState<any[]>([]); const [error,setError]=useState(""); const [busy,setBusy]=useState(""); const [phase,setPhase]=useState(""); const [hash,setHash]=useState("");
  const [candidate,setCandidate]=useState(""); const [evidence,setEvidence]=useState(baseEvidence());
  const [challenge,setChallenge]=useState({submissionId:"",criterionId:"C1",url:"",claim:""});
  const refresh=async()=>{ try{const [b,s]=await Promise.all([getBounty(id),listSubmissions(id)]);setBounty(b);setSubs(s);}catch(e:any){setError(e.message);} };
  useEffect(()=>{refresh();},[id]);
  const pending=useMemo(()=>subs.find(x=>x.id===bounty?.pending_submission),[subs,bounty]);

  async function run(label:string,fn:()=>Promise<string|void>){
    if(!wallet.address) return toast.error("Connect an injected wallet first"); if(!wallet.correctNetwork){try{await wallet.switchNetwork();}catch(e:any){return toast.error(e.message);}}
    setBusy(label); setHash(""); setPhase("wallet"); try{const tx=await fn(); if(typeof tx==="string"&&tx.startsWith("0x")){setHash(tx);setPhase("consensus / finality");await waitFinal(tx);} setPhase("finalized");await refresh();toast.success(`${label} finalized`);return true;}catch(e:any){setPhase("failed");toast.error(e?.message||`${label} failed`);return false;}finally{setBusy("");}
  }

  async function commit(){
    if(!wallet.address) return toast.error("Connect a wallet"); if(!/^[0-9a-fA-F]{40}$/.test(candidate)) return toast.error("Candidate must be the full 40-character commit SHA");
    if(evidence.some(x=>!x.url.startsWith("https://")||x.note.trim().length<4)) return toast.error("Complete every evidence source");
    const evidenceJson=JSON.stringify(evidence); const salt=makeSaltHex();
    const commitment=await read("compute_submission_commitment",[id,wallet.address,candidate.toLowerCase(),evidenceJson,salt]) as string;
    saveReveal({bountyId:id,commitment,candidate:candidate.toLowerCase(),evidenceJson,salt,createdAt:Date.now()});
    await run("commit candidate",async()=>write(wallet.address!,"commit_candidate",[id,commitment],BigInt(bounty.submission_bond_atto)));
  }

  async function revealStored(commitment:string){
    const rec=loadReveals().find(x=>x.commitment===commitment); if(!rec||!wallet.address) return toast.error("Reveal secret is not available in this browser");
    const sid=await read("get_submission_for_commitment",[commitment]) as string; if(!sid) return toast.error("Commitment is not finalized on-chain yet");
    await run("reveal candidate",async()=>{
      const tx=await write(wallet.address!,"reveal_candidate",[sid,rec.candidate,rec.evidenceJson,rec.salt]);
      setHash(tx);setPhase("consensus / finality");
      await finalizeReveal(commitment,()=>waitFinal(tx));
    });
  }

  if(error) return <div className="shell"><div className="error-box">{error}</div></div>;
  if(!bounty) return <div className="shell"><div className="loading">reading finalized work order…</div></div>;
  const repo=String(bounty.repository_url).replace("https://github.com/","");
  return <div className="shell">
    <div className="page-head"><div><div className="eyebrow">{bounty.id} / {repo}</div><h1>{bounty.title}</h1><p>{bounty.problem_statement}</p></div><div className="toolbar"><StatusPill status={bounty.status}/></div></div>
    <div className="home-strip" style={{borderTop:"1px solid var(--line)",marginBottom:24}}><div className="strip-cell"><label>bounty</label><strong>{formatGen(bounty.bounty_atto)} GEN</strong></div><div className="strip-cell"><label>candidate bond</label><strong>{formatGen(bounty.submission_bond_atto)} GEN</strong></div><div className="strip-cell"><label>deadline</label><strong>{timeLeft(bounty.closes_at)}</strong></div><div className="strip-cell"><label>pending</label><strong>{short(bounty.pending_submission)}</strong></div></div>
    <div className="detail-grid">
      <div>
        <section className="detail-panel"><div className="detail-panel-head"><strong>sealed repair specification</strong><a href={bounty.issue_url} target="_blank" className="mini-button">issue <ExternalLink size={11}/></a></div><div className="detail-panel-body">
          <div className="kv"><label>repository</label><a href={bounty.repository_url} target="_blank" className="mono">{bounty.repository_url}</a></div><div className="kv"><label>base commit</label><span className="mono">{bounty.base_commit}</span></div><div className="kv"><label>target branch</label><span>{bounty.target_branch}</span></div><div className="kv"><label>spec hash</label><span className="mono">{bounty.spec_hash}</span></div><div className="kv"><label>CI required</label><span>{String(bounty.ci_required)}</span></div>
          <div className="divider-label">acceptance criteria</div><div className="spec-list">{(bounty.criteria||[]).map((c:any)=><div className="spec-item" key={c.id}><div className="spec-id">{c.id}</div><p>{c.text}</p></div>)}</div>
          <div className="divider-label">boundaries</div><div className="rule-note"><strong>allowed scope</strong><br/>{bounty.scope_policy}<br/><br/><strong>forbidden</strong><br/>{bounty.forbidden_changes}<br/><br/><strong>evidence policy</strong><br/>{bounty.evidence_policy}</div>
        </div></section>

        <section className="detail-panel" style={{marginTop:24}}><div className="detail-panel-head"><strong>candidate ledger</strong><span className="serial">{subs.length} submitted</span></div><div className="detail-panel-body">
          {!subs.length?<div className="empty-state"><strong>No candidate has entered the bench.</strong>The first qualifying patch still has the full race ahead.</div>:subs.map((s:any)=><div className="submission" key={s.id}>
            <div className="submission-head"><div><span className="serial">{s.id}</span><div className="mono" style={{marginTop:4}}>{s.candidate_commit?short(s.candidate_commit,10,8):"sealed commitment"}</div></div><StatusPill status={s.status}/></div>
            <div className="submission-body">
              {s.artifact&&Object.keys(s.artifact).length?<><div className="divider-label">artifact examiner</div><div className="criterion-row"><span>SHA</span><span>exact candidate binding</span><strong>{s.artifact.commit_bound?"PASS":"NO"}</strong></div><div className="criterion-row"><span>BASE</span><span>relationship supported</span><strong>{s.artifact.base_relationship_supported?"PASS":"NO"}</strong></div><div className="criterion-row"><span>CI</span><span>exact-SHA pipeline</span><strong>{s.artifact.ci_passed?"PASS":"NO"}</strong></div></>:null}
              {s.review?.criteria?.length?<><div className="divider-label">repair judge</div>{s.review.criteria.map((c:any)=><div className="criterion-row" key={c.id}><span>{c.id}</span><span>{(bounty.criteria||[]).find((x:any)=>x.id===c.id)?.text}</span><strong>{c.result}</strong></div>)}</>:null}
              {s.capsule_hash?<div className="kv"><label>capsule</label><span className="mono">{short(s.capsule_hash,14,12)}</span></div>:null}
              <div className="action-row">
                {s.status==="COMMITTED"&&s.contributor?.toLowerCase()===wallet.address?.toLowerCase()?<button className="mini-button" onClick={()=>revealStored(s.commitment||loadReveals().find(x=>x.bountyId===id)?.commitment||"")}>reveal from this browser</button>:null}
                {s.status==="CHALLENGED"?<button className="mini-button" disabled={!!busy} onClick={()=>run("resolve challenge",async()=>write(wallet.address!,"resolve_challenge",[s.challenge_id]))}>resolve challenge</button>:null}
                {s.status==="REVEALED"?<button className="mini-button" onClick={()=>run("artifact examination",async()=>write(wallet.address!,"examine_candidate",[s.id]))}>examine artifact</button>:null}
                {s.status==="ARTIFACT_VERIFIED"&&!bounty.pending_submission?<button className="mini-button" onClick={()=>run("criterion review",async()=>write(wallet.address!,"review_candidate",[s.id]))}>run criterion review</button>:null}
                {s.status==="QUALIFIED_PENDING"&&Date.now()/1000>=Number(s.challenge_deadline)?<button className="mini-button" onClick={()=>run("finalize repair",async()=>write(wallet.address!,"finalize_submission",[s.id]))}>finalize + latch payout</button>:null}
              </div>
            </div>
          </div>)}
        </div></section>
      </div>

      <aside>
        {bounty.status==="OPEN"?<section className="detail-panel"><div className="detail-panel-head"><strong>submit exact patch</strong><Wrench size={16}/></div><div className="detail-panel-body"><div className="field"><label>candidate commit · 40 hex</label><input className="input mono" value={candidate} onChange={e=>setCandidate(e.target.value)} placeholder="41bd7e…"/></div><div className="divider-label">public evidence</div>{evidence.map((x,i)=><div className="form-stack" key={i} style={{marginBottom:12}}><div className="two-col"><div className="field"><label>kind</label><select className="select" value={x.kind} onChange={e=>setEvidence(xs=>xs.map((v,j)=>j===i?{...v,kind:e.target.value}:v))}><option>COMMIT</option><option>DIFF</option><option>CI</option><option>TEST</option><option>ISSUE</option><option>DOC</option></select></div><div className="field"><label>note</label><input className="input" value={x.note} onChange={e=>setEvidence(xs=>xs.map((v,j)=>j===i?{...v,note:e.target.value}:v))}/></div></div><div className="field"><label>https source</label><input className="input" value={x.url} onChange={e=>setEvidence(xs=>xs.map((v,j)=>j===i?{...v,url:e.target.value}:v))} placeholder="https://github.com/…"/></div></div>)}<div className="action-row"><button className="mini-button" onClick={()=>evidence.length<6&&setEvidence([...evidence,{kind:"TEST",url:"",note:"additional public evidence"}])}>+ evidence</button></div><div className="rule-note" style={{marginTop:16}}>The commitment binds your wallet, this work order, candidate SHA, full evidence bundle and a local 32-byte salt. Keep browser storage until reveal finalizes.</div><button className="primary" style={{width:"100%",marginTop:16}} onClick={commit} disabled={!!busy}>commit candidate · {formatGen(bounty.submission_bond_atto)} GEN</button><TxNotice phase={phase} hash={hash}/></div></section>:null}

        {pending?.status==="QUALIFIED_PENDING"?<section className="detail-panel" style={{marginTop:24}}><div className="detail-panel-head"><strong>challenge port</strong><ShieldAlert size={16}/></div><div className="detail-panel-body"><p style={{fontSize:12,color:"#a9b2ae",lineHeight:1.5}}>Challenge a concrete frozen criterion with public regression evidence. Uncertainty alone does not overturn a qualification.</p><div className="field"><label>criterion</label><select className="select" value={challenge.criterionId} onChange={e=>setChallenge({...challenge,criterionId:e.target.value})}>{(bounty.criteria||[]).map((c:any)=><option key={c.id}>{c.id}</option>)}</select></div><div className="field" style={{marginTop:10}}><label>evidence URL</label><input className="input" value={challenge.url} onChange={e=>setChallenge({...challenge,url:e.target.value})}/></div><div className="field" style={{marginTop:10}}><label>regression claim</label><textarea className="textarea" value={challenge.claim} onChange={e=>setChallenge({...challenge,claim:e.target.value})}/></div><button className="secondary" style={{width:"100%",marginTop:12}} onClick={()=>run("open challenge",async()=>write(wallet.address!,"open_challenge",[pending.id,challenge.criterionId,challenge.url,challenge.claim],BigInt(bounty.challenge_bond_atto)))}>bond challenge · {formatGen(bounty.challenge_bond_atto)} GEN</button></div></section>:null}

        <section className="detail-panel" style={{marginTop:24}}><div className="detail-panel-head"><strong>work order telemetry</strong><RotateCw size={15}/></div><div className="detail-panel-body"><div className="kv"><label>opened</label><span>{when(bounty.created_at_unix)}</span></div><div className="kv"><label>closes</label><span>{when(bounty.closes_at)}</span></div><div className="kv"><label>challenge</label><span>{Math.round(Number(bounty.challenge_window_seconds)/60)} minutes</span></div><div className="kv"><label>winner</label><span className="mono">{short(bounty.winner,10,8)}</span></div>{bounty.certificate_hash?<div className="kv"><label>certificate</label><span className="mono">{short(bounty.certificate_hash,10,8)}</span></div>:null}<button className="mini-button" style={{marginTop:14}} onClick={refresh}>refresh finalized state</button>{hash?<a className="mini-button" style={{marginLeft:8}} href={`${EXPLORER_URL}/tx/${hash}`} target="_blank">last tx ↗</a>:null}</div></section>
      </aside>
    </div>
  </div>;
}
