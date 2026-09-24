# Latch finishing-agent handoff

## Execution goal

Take this repository from its current authored state to a **fully tested, deployed, live, reviewer-verifiable GenLayer Studionet release**. This is an execution task, not a review or planning task. Do not stop after describing what should be changed.

Preserve the product: **Latch is a funded public-software repair market**. A sponsor freezes a repair spec and escrows GEN; contributors commit exact candidate Git SHAs plus public evidence; GenLayer independently verifies the artifact and every frozen acceptance criterion; a qualified patch enters a bonded criterion-specific challenge window; the surviving patch receives the bounty and a repair certificate.

Do not turn Latch back into Monocle, a generic dispute court, a generic AI code reviewer, a prediction market, or an off-chain GitHub bot.

## Hard release constraints

- **Only GenLayer Studionet**.
- Chain ID: **61999**.
- RPC: **https://studio.genlayer.com/api**.
- Use `genlayer network set studionet` and verify `genlayer network info` before deployment.
- Do not deploy the release to any other GenLayer network.
- Frontend wallet integration must remain **generic injected EIP-1193 via `window.ethereum`**.
- No MetaMask Snap APIs, no `wallet_getSnaps`, no `wallet_invokeSnap`, no WalletConnect dependency, no Privy, no embedded wallet, no backend signer.
- The release may remain **one Intelligent Contract**. Do not split it merely for aesthetics. Split only if the real stable GenVM runtime proves a specific one-contract mechanism impossible and document the evidence.
- No backend or privileged operator may decide artifact validity, criterion results, challenge outcomes, winner, or payout.
- Never manufacture a positive demo by weakening criteria, falsifying CI, changing publication facts, or relabeling an inconclusive result.

## 0. Load current official GenLayer context first

Before changing GenLayer-specific code:

1. Install/read the official GenLayer development skills if the environment supports them.
2. Consult the current stable Studionet docs / SDK reference.
3. Confirm the currently supported stable contract runner and CLI/SDK APIs.
4. Do not migrate to a release-candidate runner because it is newer; this repository targets stable Studionet 61999.

Useful official context:

```text
https://skills.genlayer.com/
https://docs.genlayer.com/
https://sdk.genlayer.com/main/_static/ai/api.txt
```

If using Claude Code:

```text
/plugin marketplace add genlayerlabs/skills
/plugin install genlayer-dev@genlayerlabs
claude mcp add genlayer-docs --transport sse https://docs-mcp.genlayer.com/sse
claude mcp add genlayer npx -- -y genlayer-mcp
```

## 1. Read the repository before editing

Read at minimum:

```text
README.md
VERIFICATION_STATUS.md
BUILD_STATUS.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/LIVE_DEMO.md
docs/REVIEW_EVIDENCE.md
contracts/latch.py
tests/direct/*
tests/integration/*
frontend/lib/*
frontend/app/*
deploy/deployScript.ts
```

Preserve the important mechanics:

- frozen `spec_hash`;
- sponsor cannot compete for own bounty;
- commitment binds 61999, contract, bounty, contributor, candidate SHA, evidence packet and salt;
- `COMMIT` + `DIFF`, and exact-SHA `CI` when required;
- candidate reservation / replay protection;
- Stage A artifact-examination consensus;
- Stage B criterion-level repair consensus;
- every criterion exactly once as `SATISFIED | FAILED | NOT_PROVEN`;
- mechanical verdict roll-up;
- `SOURCE_UNAVAILABLE`, `NOT_READY`, `INCONCLUSIVE` as genuine non-decisions;
- first-qualified candidate ordering rather than subjective multi-patch ranking;
- bonded criterion-specific challenge;
- deterministic escrow/credit math;
- repair certificate;
- pull-payment withdrawal;
- accounting invariant;
- no admin settlement override.

## 2. Establish the real stable toolchain

Create the Python environment and install the current compatible stable packages. The checked-in versions are the authored target, not permission to ignore compatibility failures.

Start with:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

If a pinned package is unavailable or incompatible, verify the correct stable Studionet release in official docs before changing it. Do not jump to Studio-dev/preview packages.

Run:

```bash
genvm-lint check contracts/latch.py --json
```

Fix every real lint/schema issue. Re-run after each contract change.

Pay particular attention to runtime-sensitive areas that were not executable in the creation environment:

- stable `gl.message_raw` datetime access;
- `TreeMap`/`DynArray` usage;
- local Python list/dict operations accepted by GenVM;
- `gl.vm.run_nondet_unsafe` return encoding;
- `gl.nondet.web.render` signatures and response behavior;
- `response_format="json"` support on the pinned runner;
- `Address` normalization;
- `_Recipient(...).emit_transfer` on stable Studionet;
- payable method semantics;
- loops over storage arrays and linter bounds;
- `while` use in `find_latest_bounty_by_sponsor`;
- contract schema types for `int`, `bool`, `list`, and JSON-safe returns.

If any of those require a source fix, add a regression test for the exact failure.

## 3. Make Direct Mode genuinely strong

Run:

```bash
pytest tests/direct/ -v
```

Do not merely make the existing tests green by deleting assertions. Fix the implementation or the test harness based on actual GenLayer semantics.

Minimum behavioral coverage before release:

1. bounty creation and immutable spec fields;
2. exact native-value accounting;
3. sponsor cannot compete;
4. commitment changes when contributor / candidate / evidence / salt / contract binding changes;
5. wrong reveal rejected;
6. duplicate candidate reservation blocked;
7. reveal timeout forfeiture;
8. `SOURCE_UNAVAILABLE` refunds contributor and does not reject patch;
9. `NOT_READY` refunds contributor and does not reject patch;
10. artifact `INVALID` forfeits candidate bond to sponsor;
11. artifact validator disagreement on a substantive field causes no accepted result;
12. artifact `VERIFIED` requires repository + candidate + base + commit + diff + reviewability;
13. criterion table must contain every frozen criterion exactly once;
14. any `FAILED` criterion forces `REJECTED`;
15. any `NOT_PROVEN` with no failure forces `INCONCLUSIVE`;
16. scope violation forces `REJECTED`;
17. forbidden change forces `REJECTED`;
18. required CI failure forces `REJECTED`;
19. repair validator disagreement on a criterion or flag causes no accepted result;
20. successful review creates `QUALIFIED_PENDING`, capsule hash and challenge deadline;
21. only one pending candidate owns the challenge slot;
22. contributor cannot challenge own candidate;
23. challenge must name a frozen criterion;
24. challenge exact bond enforced;
25. challenge `UPHELD` reopens bounty and candidate cannot finalize;
26. challenge `REJECTED` moves bond into winner bonus;
27. challenge `SOURCE_UNAVAILABLE` / `INCONCLUSIVE` refunds challenger and preserves qualification;
28. finalization cannot occur before challenge deadline;
29. finalization creates certificate and exact winner credit;
30. other protocol-blocked candidates get fair refunds;
31. expired bounty refunds sponsor and settles active candidate bonds correctly;
32. withdrawal cannot redirect to a different recipient;
33. credit is zeroed before transfer;
34. accounting invariant remains true after every economic path;
35. no admin method can select a winner or edit frozen spec.

Use `direct_vm.run_validator` / mock swapping where useful to prove validators compare substantive fields, not only JSON shape.

## 4. Integration / Studionet behavior

After Direct Mode passes, run the real integration path. First verify the integration-test API against the installed `gltest`; the authored smoke file may need adjustment because the creation environment could not import the package.

Before deployment, use a local or Studio simulation when appropriate to measure nondeterministic and native-value behavior. Then run the canonical Studionet smoke only against the finalized release address:

```bash
LATCH_CONTRACT=0x... gltest tests/integration/ -v -s --network studionet
```

Do not call a configuration-only read test a full consensus test. Add at least one integration test that exercises a real nondeterministic method when the environment permits it.

## 5. Frontend dependency, type and build pass

The creation environment could not complete `npm install`, so the UI source has only been authored, not production-built.

Run:

```bash
cd frontend
npm install
npm run typecheck
npm run build
```

Fix all real issues.

Then manually test desktop and mobile routes:

```text
/
/bounties
/bounties/[id]
/open
/workbench
/certificates
/protocol
```

The current design direction must be preserved unless a real usability problem requires change:

- dark industrial repair bench;
- machined work-order plates;
- ruler rails;
- hard signal orange / mint / ivory;
- cut-corner certificates;
- strong editorial typography;
- no purple gradient AI template;
- no chatbot aesthetic;
- no generic dashboard-card wall.

Polish it further if needed, but do not replace it with a generic component library theme.

Verify the actual browser flows:

- public reads without connecting;
- generic EIP-1193 connect;
- wrong-network detection and switch to 61999;
- bounty creation;
- commitment creation through on-chain `compute_submission_commitment`;
- pending reveal written before the commit transaction can be lost;
- finalized commitment recovered with `get_submission_for_commitment`;
- reveal secret retained until reveal finality;
- artifact examination;
- repair review;
- challenge;
- finalization;
- credit withdrawal;
- explorer links;
- clear errors for failed/reverted finalized transactions.

Search the repository for forbidden wallet integration:

```bash
grep -RniE 'wallet_getSnaps|wallet_invokeSnap|Snaps|WalletConnect|Privy' frontend . --exclude-dir=node_modules
```

There should be no runtime dependency on them.

## 6. Validate current genlayer-js calls

Use the current official GenLayerJS docs and installed types. Do not retain guessed client APIs merely because TypeScript was cast to `any`.

Specifically verify:

- `createClient({ chain: studionet })` for reads;
- provider-backed writes using `account` + injected EIP-1193 `provider`;
- `readContract` finalized variant;
- `estimateTransactionFeesForWrite` return shape;
- passing `distribution`, `messageAllocations`, and `feeValue` to `writeContract`;
- `waitForFinalization`;
- `isSuccessful` / execution result handling.

A transaction reaching consensus finality is not enough if execution finished with error. UI success must require successful execution.

## 7. Deploy exactly one canonical release

From the repository root:

```bash
genlayer network set studionet
genlayer network info
```

Stop if it does not report exactly:

```text
chain id 61999
https://studio.genlayer.com/api
```

Then install the root dependency and deploy using the standard script:

```bash
npm install
genlayer deploy
```

The canonical script is intentionally named:

```text
deploy/deployScript.ts
```

Do not rename it away from the CLI convention unless current official CLI docs require another path.

Wait for **FINALIZED + successful execution**. Record the exact contract address and deployment transaction.

Immediately verify:

```bash
genlayer schema <ADDRESS>
genlayer code <ADDRESS>
genlayer call <ADDRESS> get_stats
```

Compare deployed source to the repository source, not merely method names. Confirm:

```text
chain_id = 61999
rpc = https://studio.genlayer.com/api
accounting_balanced = true
admin_controls = false
```

If deployment or writes fail, inspect receipts/stdout/stderr/trace before changing logic.

## 8. Wire and publish the exact deployment

Use the exact finalized contract written to `frontend/.env.local` / production environment. Rebuild the frontend after the address is final.

Publish the web app and verify that the public production bundle actually uses:

```text
canonical Latch contract address
61999
https://studio.genlayer.com/api
https://explorer-studio.genlayer.com
```

Add a lightweight hosted smoke script or CI check if useful so a stale frontend cannot silently point at a superseded contract.

## 9. Execute the full live repair lifecycle

Follow `docs/LIVE_DEMO.md`.

Prefer an honest public demo fixture with two real Git commits and a real GitHub Actions run bound to the candidate SHA. A small `demo-target` in the eventual public repository is acceptable. Do not use fabricated screenshots or local-only test output as evidence.

Minimum live proof on the **current canonical deployment**:

```text
Wallet A creates funded work order
Wallet B commits candidate
Wallet B reveals exact SHA + public evidence
artifact examiner => ARTIFACT_VERIFIED
repair judge => every frozen criterion SATISFIED
candidate => QUALIFIED_PENDING
challenge window expires (or rejected challenge is resolved)
finalize => QUALIFIED_FINAL / CLOSED
certificate exists
winner credit exists
winner withdraws native GEN
accounting remains balanced
```

Also prove one negative path on the same canonical deployment, ideally `INVALID_CANDIDATE` or `SOURCE_UNAVAILABLE` with the correct bond treatment.

A challenge live path is highly valuable. If you exercise it, use Wallet C and record open/resolve tx hashes and the exact challenge result.

## 10. Final release documentation

Update these files from real evidence:

```text
README.md
VERIFICATION_STATUS.md
BUILD_STATUS.md
docs/LIVE_DEMO.md
docs/REVIEW_EVIDENCE.md
deployments/studionet.json
```

`docs/REVIEW_EVIDENCE.md` must include exact current-release hashes for:

- lint;
- direct tests count;
- integration tests;
- frontend typecheck/build;
- canonical deployment;
- live app;
- work-order create;
- negative candidate path;
- winning commitment;
- reveal;
- artifact examination;
- criterion review;
- challenge if used;
- finalization;
- certificate;
- withdrawal;
- final accounting.

Do not leave stale addresses, old deployments, fake TODO completion, or a claim that a superseded contract proves the current source.

## 11. CI

Create or repair CI so the final default branch runs at minimum:

```text
GenVM lint
Direct Mode tests
frontend install
typecheck
production build
```

Add frontend unit/regression tests if you touch wallet/reveal/client logic. Keep the final main branch green.

## Definition of done

The task is not done until all of these are true:

- stable GenVM lint passes;
- comprehensive direct tests pass;
- Studionet smoke/integration passes;
- Next.js typecheck and production build pass;
- one canonical Latch contract is finalized on 61999;
- deployed code/schema match the repository release;
- public frontend is wired to that exact contract;
- generic injected EIP-1193 wallet flow works;
- full live repair flow reaches a repair certificate and native GEN withdrawal;
- at least one negative live path is recorded;
- accounting is balanced after settlement;
- docs contain current hashes and no unsupported claims;
- no release configuration points to another network.

If an external blocker remains (for example GitHub permissions, Vercel access, unavailable source page or wallet approval), name the exact manual action required and finish every other item. Do not stop early with a recommendation list.
