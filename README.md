# Latch

**Public software repair bounties settled against exact patches, exact evidence, and a frozen work order.**

Latch is a GenLayer-native repair market. A sponsor escrows native GEN against a public repository issue and freezes the acceptance criteria before contributors compete. Contributors commit and reveal exact Git commit SHAs plus public artifact evidence. GenLayer validators independently fetch that evidence twice: first to establish that the candidate is the claimed artifact, then to judge every frozen repair criterion. A qualifying patch enters a bonded challenge window. The first candidate that survives becomes a repair certificate and receives the bounty.

Latch is not a generic dispute wrapper, a GitHub merge bot, or an AI code reviewer. The semantic result directly controls escrowed value, but the LLM never chooses payout amounts.

## Canonical release network

This repository is intentionally locked to **GenLayer Studionet only**.

- Chain ID: `61999`
- GenLayer RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Browser wallet: generic injected EIP-1193 `window.ethereum`
- No Snaps
- No WalletConnect
- No embedded key
- No backend signer

Do not deploy the release build to any other network.

Canonical release:

- Contract: [`0xEa11d7d97c73a3A1EF9365B6dfa919355f17BE28`](https://explorer-studio.genlayer.com/address/0xEa11d7d97c73a3A1EF9365B6dfa919355f17BE28)
- Deployment transaction: [`0x179d4c0b8395a1dcb0fd2a9f294028de61712c543008dcbf54aa5c1f3382f102`](https://explorer-studio.genlayer.com/tx/0x179d4c0b8395a1dcb0fd2a9f294028de61712c543008dcbf54aa5c1f3382f102)
- Deployed source SHA-256: `5b9f0a03ddd7f9f05873e8e3d615347aec022c42897fc4188c7e2a8e8cef6bb6`
- Application: [latch-studionet.vercel.app](https://latch-studionet.vercel.app)
- Live fixture: [lolaaa00/latch-repair-fixture](https://github.com/lolaaa00/latch-repair-fixture)

## Why GenLayer is necessary

The contested question is deliberately narrow but semantic:

> Does this exact candidate commit, evidenced by the public repository/diff/CI bundle, satisfy every repair criterion that was frozen before contributors competed?

A sponsor should not be able to pick a favored contributor after seeing submissions. A contributor should not be able to self-certify a patch. A centralized AI service should not control settlement. Validators therefore re-fetch the public evidence and independently reproduce the substantive result.

The protocol separates three questions:

1. **Artifact examination** — is this actually the claimed repository, exact candidate SHA, diff and exact-SHA CI evidence, and is the bundle ready to assess?
2. **Criterion-level repair judgment** — for each frozen requirement, is it `SATISFIED`, `FAILED`, or `NOT_PROVEN`?
3. **Bonded challenge** — does new public regression evidence actually defeat a specific frozen criterion or qualification condition?

Only the resulting status crosses into deterministic settlement.

## State machine

```text
OPEN BOUNTY
   │
   ├── contributor commits sealed candidate + evidence digest
   │
   ▼
COMMITTED ── reveal timeout ──► UNREVEALED / bond to sponsor
   │
   ▼
REVEALED
   │
   ▼
ARTIFACT EXAMINATION
   ├── SOURCE_UNAVAILABLE ──► bond refund, retry with new commitment
   ├── NOT_READY ───────────► bond refund, retry after CI finishes
   ├── INVALID_CANDIDATE ──► bond to sponsor
   ▼
ARTIFACT_VERIFIED
   │
   ▼
CRITERION REVIEW
   ├── REJECTED ───────────► bond to sponsor
   ├── INCONCLUSIVE ───────► bond refund
   ▼
QUALIFIED_PENDING
   │
   ├── bonded challenge
   │      ├── UPHELD ──────► candidate rejected; challenger rewarded
   │      ├── REJECTED ────► challenge bond joins winner pool
   │      └── INCONCLUSIVE / SOURCE_UNAVAILABLE ─► challenge bond refund
   │
   └── challenge window survives
          ▼
QUALIFIED_FINAL
          ▼
REPAIR CERTIFICATE + WINNER CREDIT
```

`SOURCE_UNAVAILABLE`, `NOT_READY`, and `INCONCLUSIVE` are explicit non-decisions. They never silently become rejection or qualification.

## Contract architecture

The release uses one advanced Intelligent Contract: [`contracts/latch.py`](contracts/latch.py).

The single address contains separate internal domains:

- immutable bounty specification and spec hash;
- native GEN bounty escrow;
- commit/reveal candidate binding;
- candidate SHA reservation and replay protection;
- artifact-examination consensus;
- criterion-level repair consensus;
- bonded criterion challenge consensus;
- deterministic challenge economics;
- deterministic winner settlement;
- repair certificates;
- bounded liveness and expiry;
- pull-payment credits;
- global accounting invariant.

The single-address design avoids asynchronous cross-contract settlement wiring while retaining non-trivial protocol architecture.

## Evidence bundle

A revealed candidate submits 2–6 HTTPS evidence entries. `COMMIT` and `DIFF` are mandatory. `CI` is mandatory when the sponsor freezes `ci_required=true`.

Supported evidence kinds:

```text
COMMIT
DIFF
CI
TEST
ISSUE
DOC
```

The contract does not trust contributor notes as facts. Validators must establish identity and criterion results from fetched evidence.

## Criterion roll-up

Every frozen criterion must appear exactly once:

```text
SATISFIED
FAILED
NOT_PROVEN
```

The overall verdict is not free-form:

```text
any FAILED
or scope violation
or forbidden change
or required CI failure
    => REJECTED

otherwise any NOT_PROVEN
    => INCONCLUSIVE

otherwise
    => QUALIFIED
```

This mechanical roll-up prevents a leader from returning `QUALIFIED` while one required criterion is missing or failed.

## Money model

At bounty creation:

- native `gl.message.value` is the bounty;
- submission bond = max(0.0001 GEN, 1% of bounty);
- challenge bond = max(0.0002 GEN, 2% of bounty).

Semantic consensus never calculates money. Deterministic code applies the result.

A rejected challenge bond moves into the bounty escrow as winner bonus. An upheld challenge refunds the challenger bond and splits the candidate's bond between challenger reward and sponsor compensation. A finalized candidate receives bounty + rejected-challenge bonus + its own submission bond as claimable credit.

The exposed accounting invariant is:

```text
total_deposited =
    bounty_escrow
  + submission_escrow
  + challenge_escrow
  + total_claimable
  + total_withdrawn
```

## Repair certificate

Finalization creates a certificate hash over:

- network and contract;
- bounty id;
- frozen spec hash;
- exact candidate SHA;
- assessment capsule hash;
- winner;
- finalization time.

`get_certificate(bounty_id)` returns the public repair certificate and the final criterion statuses.

## Frontend

`frontend/` is a multi-page Next.js App Router application with no backend state mirror.

Routes:

- `/` — hero-first product page and live work orders
- `/bounties` — finalized on-chain market browse/search
- `/bounties/[id]` — sealed spec, candidates, artifact review, criterion review, challenge and finalization
- `/open` — funded work-order creation
- `/workbench` — browser reveal recovery + on-chain credit withdrawal
- `/certificates` — finalized repair certificates
- `/protocol` — trust model and settlement boundary

The visual system is intentionally not a generic crypto/dashboard template: a dark repair-bench shell, machined work-order plates, ruler rails, cut-corner certificates, industrial microtype and hard signal colors.

## Browser wallet

The wallet layer uses only standard injected EIP-1193 calls:

```text
eth_accounts
eth_requestAccounts
eth_chainId
wallet_switchEthereumChain
wallet_addEthereumChain
```

There are no wallet-vendor checks or Snap APIs.

## Local checks

Python:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

genvm-lint check contracts/latch.py --json
pytest tests/direct/ -v
```

Studionet smoke after deployment:

```bash
LATCH_CONTRACT=0xEa11d7d97c73a3A1EF9365B6dfa919355f17BE28 gltest tests/integration/ -v -s --network studionet
```

Frontend:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run typecheck
npm run build
npm run dev
```

## Deploy

Use the built-in stable network preset:

```bash
genlayer network set studionet
genlayer network info
npm install
genlayer deploy
```

`deploy/deployScript.ts` refuses a client whose chain id is not `61999`. On success it waits for finalization, confirms successful execution, reads the deployed schema/stats, writes `deployments/studionet.json`, and writes the exact address into `frontend/.env.local`.

Then verify the immutable deployment:

```bash
genlayer schema <ADDRESS>
genlayer code <ADDRESS>
genlayer call <ADDRESS> get_stats
```

Do not claim the release is live until the deployed source matches this repository and the live flow in [`docs/LIVE_DEMO.md`](docs/LIVE_DEMO.md) has actually completed.

## Quality evidence

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/SECURITY.md`](docs/SECURITY.md)
- [`docs/LIVE_DEMO.md`](docs/LIVE_DEMO.md)
- [`docs/REVIEW_EVIDENCE.md`](docs/REVIEW_EVIDENCE.md)
- [`VERIFICATION_STATUS.md`](VERIFICATION_STATUS.md)
- [`AGENT_HANDOFF.md`](AGENT_HANDOFF.md)

## Honest limitations

GenLayer consensus judges the supplied public evidence; it does not create objective truth. Git hosting pages can be unavailable, dynamic CI pages can change, redirects are not cryptographic provenance, and natural-language criteria can be written badly. Latch reduces those risks with frozen criteria, exact SHA binding, criterion-level results, fail-closed states, independent replay and a challenge window. It does not eliminate them.
