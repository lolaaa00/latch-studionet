export default function Protocol(){
 return <div className="shell"><div className="page-head"><div><div className="eyebrow">trust boundary / 61999</div><h1>Protocol anatomy</h1><p>Latch keeps semantic judgment narrow and makes money movement deterministic. No operator, repository maintainer or backend gets a settlement override.</p></div></div>
 <div className="protocol-grid">
  <div className="protocol-block"><b>01 / FROZEN SPEC</b><h3>No moving the goalposts.</h3><p>Repository, issue, base SHA, acceptance criteria, scope, forbidden changes and evidence policy are hashed when bounty capital enters escrow.</p></div>
  <div className="protocol-block"><b>02 / SEALED CANDIDATE</b><h3>Commit before reveal.</h3><p>The commitment binds chain 61999, this contract, bounty id, contributor, exact candidate SHA, evidence bundle and a 32-byte salt.</p></div>
  <div className="protocol-block"><b>03 / ARTIFACT EXAMINER</b><h3>Is this even the claimed patch?</h3><p>Validators re-fetch public sources and reproduce repository match, candidate identity, base relationship, exact-SHA CI and diff availability.</p></div>
  <div className="protocol-block"><b>04 / REPAIR JUDGE</b><h3>Every requirement gets a result.</h3><p>Each criterion is SATISFIED, FAILED or NOT_PROVEN. Missing proof never becomes satisfaction. The overall verdict is mechanically derived from those fields.</p></div>
  <div className="protocol-block"><b>05 / BONDED CHALLENGE</b><h3>Attack one criterion with evidence.</h3><p>A challenger must name a frozen criterion and public regression source. UPHELD removes qualification. REJECTED adds the bond to the eventual winner pool.</p></div>
  <div className="protocol-block"><b>06 / DETERMINISTIC SETTLEMENT</b><h3>Consensus decides status, code decides money.</h3><p>Only a QUALIFIED candidate that survives its window can close the bounty. Payout, refunds and forfeitures are ledger math, never LLM-generated amounts.</p></div>
 </div>
 <div className="code-panel">{`total_deposited = bounty_escrow + submission_escrow + challenge_escrow + claimable + withdrawn\n\nSOURCE_UNAVAILABLE != REJECTED\nNOT_PROVEN != SATISFIED\nINCONCLUSIVE != QUALIFIED\n\nfinal repair certificate = SHA256(spec_hash + candidate + capsule_hash + winner + finalization)`}</div>
 <div className="section-head" style={{marginTop:60}}><div><div className="eyebrow">what GenLayer is deciding</div><h2>Meaning, not arithmetic.</h2></div><p>The nondeterministic boundary answers whether fetched public evidence establishes the artifact and whether the patch satisfies the frozen natural-language criteria. Validators independently re-fetch and re-reason. Settlement remains deterministic.</p></div>
 </div>;
}
