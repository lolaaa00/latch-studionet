import Link from "next/link";
import { ArrowRight, ShieldCheck, Wrench, GitCommitHorizontal, Scale } from "lucide-react";
import { LatestBounties } from "@/components/LatestBounties";

export default function Home() {
  return <>
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow">public software repair / genlayer 61999</div>
        <h1>Fund the fix.<br/><span>Make the patch prove it.</span></h1>
        <p>Latch turns a public issue into a sealed work order. Contributors submit exact commit SHAs. GenLayer verifies the artifact, judges every frozen acceptance criterion, and only a patch that survives the challenge window earns the bounty.</p>
        <div className="hero-actions"><Link href="/open" className="primary">open a work order <ArrowRight size={16}/></Link><Link href="/bounties" className="secondary">browse repairs</Link></div>
        <div className="hero-stamp">NO MERGE BUTTON ORACLE / NO BACKEND VERDICT</div>
      </div>
      <div className="hero-machine">
        <div className="machine-ruler"/>
        <div className="repair-plate">
          <div className="plate-screws"><i className="screw"/><i className="screw"/></div>
          <div className="plate-header"><div><small>ILLUSTRATIVE WORK ORDER</small><strong> LT-B-042</strong></div><span className="pass">SEALED SPEC</span></div>
          <h2 className="plate-title">Repair multiline CSV parsing</h2>
          <div className="plate-row"><label>repository</label><span className="mono">dataforge/parser</span></div>
          <div className="plate-row"><label>base</label><span className="mono">8a95c7…0c73</span></div>
          <div className="plate-row"><label>candidate</label><span className="mono">41bd7e…17ea</span></div>
          <div className="divider-label">acceptance gauge</div>
          <div className="check-row"><span>C1 · multiline LF</span><span className="pass">SATISFIED</span></div>
          <div className="check-row"><span>C2 · multiline CRLF</span><span className="pass">SATISFIED</span></div>
          <div className="check-row"><span>C3 · API compatibility</span><span className="pass">SATISFIED</span></div>
          <div className="check-row"><span>challenge window</span><span className="pending">27:16</span></div>
          <div className="plate-footer"><div><small>BOUNTY</small><strong> 5.00 GEN</strong></div><i className="barcode"/></div>
        </div>
      </div>
    </section>
    <section className="home-strip">
      <div className="strip-cell"><label>identity</label><strong>exact git commit</strong></div>
      <div className="strip-cell"><label>judgment</label><strong>criterion by criterion</strong></div>
      <div className="strip-cell"><label>challenge</label><strong>bonded regression evidence</strong></div>
      <div className="strip-cell"><label>settlement</label><strong>native GEN / deterministic</strong></div>
    </section>
    <section className="section">
      <div className="section-head"><div><div className="eyebrow">the mechanism</div><h2>Work, not opinions.</h2></div><p>The sponsor freezes the job before seeing candidates. The evaluator never receives contributor identity or payout preference. The code either clears the work order or it does not.</p></div>
      <div className="mechanics">
        <div className="mechanic"><b>01 / SEAL</b><Wrench size={25}/><h3>Freeze the repair contract.</h3><p>Repository, base SHA, issue, acceptance criteria, allowed scope, forbidden changes and evidence policy become immutable.</p></div>
        <div className="mechanic"><b>02 / BIND</b><GitCommitHorizontal size={25}/><h3>Submit an exact artifact.</h3><p>Commit-reveal binds contributor, candidate SHA, evidence bundle, chain and contract before the patch enters review.</p></div>
        <div className="mechanic"><b>03 / PROVE</b><ShieldCheck size={25}/><h3>Replay the evidence.</h3><p>Validators independently fetch commit, diff and CI sources, then reproduce each criterion result. Missing proof stays missing.</p></div>
        <div className="mechanic"><b>04 / LATCH</b><Scale size={25}/><h3>Challenge, then settle.</h3><p>A qualified patch waits behind a bonded regression challenge. Survive it and the bounty becomes claimable with a repair certificate.</p></div>
      </div>
    </section>
    <section className="section">
      <div className="section-head"><div><div className="eyebrow">live work orders</div><h2>On the bench.</h2></div><Link href="/bounties" className="secondary">all work orders <ArrowRight size={14}/></Link></div>
      <LatestBounties/>
    </section>
  </>;
}
