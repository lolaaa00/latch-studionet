# Review evidence map

This is a release checklist, not a self-awarded score.

| Review area | Repository evidence | Live evidence required before submission |
|---|---|---|
| Consequential GenLayer use | Native GEN bounty settlement depends on public-source semantic consensus | Full current-deployment winner lifecycle and withdrawal |
| Conflicting incentives | Sponsor funds job; contributors compete; challenger bonds evidence | Separate sponsor/contributor wallets; optional challenger |
| Current external facts | GenVM fetches repository, commit, diff and CI evidence | Explorer-backed artifact examination on public sources |
| Substantive validation | Artifact validators compare 9 substantive fields; repair validators compare every criterion + flags | Current deployment criterion vector from live candidate |
| Fail-closed behavior | SOURCE_UNAVAILABLE, NOT_READY, INVALID, REJECTED, INCONCLUSIVE | At least one honest negative live path |
| Non-trivial architecture | Frozen spec, commit/reveal, two semantic stages, bonded challenge, certificate, escrow ledger | Source/schema verified against current deployment |
| Accounting | Exposed conservation invariant and pull withdrawals | `accounting_balanced=true` before and after payout withdrawal |
| Frontend integration | Multi-page read/write flows and reveal recovery | Public build wired to current finalized contract, tested with injected EIP-1193 wallet |
| Network handling | Code/config locked to 61999 / stable RPC | Live txs and frontend runtime all on 61999 |
| Engineering | Direct tests, integration smoke, docs, deployment script, typed frontend | lint/tests/build/CI outputs recorded below |

## Final command evidence

Fill only after running:

```text
GENVM_VERSION=v0.2.16 genvm-lint check contracts/latch.py --json: PASS (24 methods; 12 view, 12 write)
pytest tests/direct/ -v: PASS (68)
gltest tests/integration/ -v -s --network studionet: PASS (2 against canonical address)
cd frontend && npm test: PASS (21)
cd frontend && npm run typecheck: PASS
cd frontend && npm run build: PASS locally and on Vercel
```

## Canonical deployment

```text
Contract: 0xEa11d7d97c73a3A1EF9365B6dfa919355f17BE28
Deployment tx: 0x179d4c0b8395a1dcb0fd2a9f294028de61712c543008dcbf54aa5c1f3382f102
Source SHA-256: 5b9f0a03ddd7f9f05873e8e3d615347aec022c42897fc4188c7e2a8e8cef6bb6
Contract source commit: ba368a28aa03a118a815d34f8d52ef3a091c7043 (the committed contract hashes to the same SHA-256)
Schema/source match: PASS; deployed code is byte-identical and schema contains the expected 24 methods
Frontend: https://latch-studionet.vercel.app (Vercel deployment dpl_H7UewJQU8U8kdK53AJndtw2VmPVC)
Repository: https://github.com/lolaaa00/latch-studionet
```

## Live demonstration

```text
Bounty: lt-b-1 (0.01 GEN; spec hash 61a38089413b739fc9ca961c6b627d2c9ab8d0127ee4f4d8b2b551a804dc6803)
Create tx: 0xe2a22400d2c355445605aeb9c5a85e740bc8e4864b8074d4c8cec5c968996ef6
Negative path: wrong reveal rejected in 0x3bc64974467bc4c66429ea51ae9aa9e9dcf8d0076a84eb09a0ecd0d3d9cef53f; two wrong-SHA artifact results received unanimous validator disagreement and made no state change
Winning candidate SHA: 82dc3af6f112798c9f05952a911a4130036742f2
Commit tx: 0x5a0fce374ed77897d92658368dfb61f55fd55977d5c0424b231dd8e2cbad6fbd
Reveal tx: 0x932b44e5a240fb73183a94b69df86afeb95e8d99d68dad2fc054a95aa1a9db0e
Artifact result: ARTIFACT_VERIFIED, tx 0x8fdd0a9c129835d46b3d6d3ad18c7a5f9000ee7d934ae47aed9973761337bd9b
Review result: QUALIFIED_PENDING with C1-C5 SATISFIED, tx 0xf3bb36fccd07ea0bbe14202f228ba40c7593c6764722815b91b5632b55248ced
Challenge: no challenge opened; the bonded 15-minute window elapsed normally
Finalization tx: 0xebdcf541d93dfd80450506a95cfba92bbe8cf7bfd229af159355ee8bbdeb0458
Certificate hash: 058b45debcc2a765fba578411f89093723b76b77c65f6f83210bb7a5b68f3111
Winner credit: 10200000000000000 attoGEN before withdrawal; 0 after withdrawal
Withdrawal tx: 0x4affce24de7905eb34f4d6dea17e7ae580343070f8dd65c9e992f3ea69c68957
Final accounting: balanced; bounty/submission/challenge escrow 0; withdrawn_atto 10200000000000000; remaining claimable_atto 100000000000000 sponsor credit from the expired unrevealed submission
```
