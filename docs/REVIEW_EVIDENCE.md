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
genvm-lint check contracts/latch.py --json: TODO
pytest tests/direct/ -v: TODO
gltest tests/integration/ -v -s --network studionet: TODO
cd frontend && npm run typecheck: TODO
cd frontend && npm run build: TODO
```

## Canonical deployment

```text
Contract: TODO
Deployment tx: TODO
Source commit: TODO
Schema/source match: TODO
Frontend: TODO
```

## Live demonstration

```text
Bounty: TODO
Create tx: TODO
Negative candidate: TODO
Winning candidate SHA: TODO
Commit tx: TODO
Reveal tx: TODO
Artifact result: TODO
Review result: TODO
Challenge tx/result: TODO or explicitly not exercised
Finalization tx: TODO
Certificate hash: TODO
Withdrawal tx: TODO
Final accounting: TODO
```
