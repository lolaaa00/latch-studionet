"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useInjectedWallet } from "@/lib/wallet";
import { getCredit, read, write, waitFinal } from "@/lib/latch";
import { loadReveals, finalizeReveal } from "@/lib/reveal";
import { formatGen, short } from "@/lib/format";
import { TxNotice } from "@/components/TxNotice";

export default function Workbench(){
 const wallet=useInjectedWallet(); const [credit,setCredit]=useState("0"); const [reveals,setReveals]=useState<any[]>([]); const [phase,setPhase]=useState(""); const [hash,setHash]=useState("");
 async function refresh(){ setReveals(loadReveals()); if(wallet.address) try{setCredit(await getCredit(wallet.address));}catch{} }
 useEffect(()=>{refresh();},[wallet.address]);
 async function withdraw(){ if(!wallet.address)return toast.error("Connect wallet"); try{setPhase("withdrawing");const tx=await write(wallet.address,"withdraw_credit",[wallet.address]);setHash(tx);await waitFinal(tx);setPhase("finalized");toast.success("Credit withdrawn");refresh();}catch(e:any){toast.error(e.message);setPhase("failed");}}
 async function reveal(rec:any){ if(!wallet.address)return toast.error("Connect wallet"); try{const sid=await read("get_submission_for_commitment",[rec.commitment]) as string;if(!sid)return toast.error("Commitment not finalized yet");setPhase("revealing");const tx=await write(wallet.address,"reveal_candidate",[sid,rec.candidate,rec.evidenceJson,rec.salt]);setHash(tx);await finalizeReveal(rec.commitment,()=>waitFinal(tx));setPhase("finalized");refresh();toast.success("Candidate revealed");}catch(e:any){toast.error(e.message);setPhase("failed");}}
 return <div className="shell"><div className="page-head"><div><div className="eyebrow">your local + on-chain controls</div><h1>Workbench</h1><p>Reveal secrets live only in this browser. On-chain credits are pull payments and can only be withdrawn by the credited address.</p></div></div>
 <div className="detail-grid"><section className="detail-panel"><div className="detail-panel-head"><strong>sealed candidates in this browser</strong><span className="serial">{reveals.length}</span></div><div className="detail-panel-body">{reveals.length?reveals.map(r=><div className="submission" key={r.commitment}><div className="submission-head"><div><span className="serial">{r.bountyId}</span><div className="mono">{short(r.candidate,12,10)}</div></div><span className="status-pill warn">secret retained</span></div><div className="submission-body"><div className="kv"><label>commitment</label><span className="mono">{short(r.commitment,14,12)}</span></div><button className="mini-button" onClick={()=>reveal(r)}>find finalized commit + reveal</button></div></div>):<div className="empty-state"><strong>No pending reveal secrets.</strong>Commit-reveal records appear here before the second transaction.</div>}</div></section>
 <aside><div className="summary-ticket"><small>claimable credit</small><strong>{formatGen(credit)} GEN</strong><p>Refunds, winner payouts and challenge economics are recorded as credits first. Withdrawal zeroes the ledger before transfer.</p><button className="primary" style={{width:"100%"}} onClick={withdraw}>withdraw to connected wallet</button><TxNotice phase={phase} hash={hash}/></div></aside></div>
 </div>;
}
