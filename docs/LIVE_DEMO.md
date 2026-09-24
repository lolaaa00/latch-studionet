# Canonical live demo — Studionet 61999

The demo should prove the actual trust model, not merely that methods can be called.

## Executed release record

This procedure was executed on 2026-09-24 against the source-verified contract `0xEa11d7d97c73a3A1EF9365B6dfa919355f17BE28`.

- Public fixture: `https://github.com/lolaaa00/latch-repair-fixture`
- Frozen issue: `https://github.com/lolaaa00/latch-repair-fixture/issues/1`
- Base SHA: `860a4ff35af8437ea9da38123e9a53441560d115`
- Winning SHA: `82dc3af6f112798c9f05952a911a4130036742f2`
- Failed base CI: run `36028109210`
- Passing exact-candidate CI: run `36028467663`
- Bounty: `lt-b-1`, 0.01 GEN; submission bond: 0.0001 GEN; challenge bond: 0.0002 GEN
- Create transaction: `0xe2a22400d2c355445605aeb9c5a85e740bc8e4864b8074d4c8cec5c968996ef6`
- Winning commitment: `a2ae5e613942fc0049a4e30d08d08b891dc961b6d561110eb45c76c4e81ef43b`
- Commit transaction: `0x5a0fce374ed77897d92658368dfb61f55fd55977d5c0424b231dd8e2cbad6fbd`
- Reveal transaction: `0x932b44e5a240fb73183a94b69df86afeb95e8d99d68dad2fc054a95aa1a9db0e`
- Artifact transaction: `0x8fdd0a9c129835d46b3d6d3ad18c7a5f9000ee7d934ae47aed9973761337bd9b`, result `ARTIFACT_VERIFIED`
- Review transaction: `0xf3bb36fccd07ea0bbe14202f228ba40c7593c6764722815b91b5632b55248ced`, result `QUALIFIED_PENDING`
- Criterion vector: `C1 SATISFIED`, `C2 SATISFIED`, `C3 SATISFIED`, `C4 SATISFIED`, `C5 SATISFIED`
- Assessment capsule: `d0d73f889cef33159a57dd3a9763c59fb1edde6614a130090c43b5c5b98affcf`
- Finalization transaction: `0xebdcf541d93dfd80450506a95cfba92bbe8cf7bfd229af159355ee8bbdeb0458`
- Repair certificate: `058b45debcc2a765fba578411f89093723b76b77c65f6f83210bb7a5b68f3111`
- Winner credit before withdrawal: `10200000000000000` attoGEN (0.0102 GEN)
- Winner withdrawal transaction: `0x4affce24de7905eb34f4d6dea17e7ae580343070f8dd65c9e992f3ea69c68957`
- Post-withdrawal winner credit: `0`; `withdrawn_atto=10200000000000000`; `accounting_balanced=true`

Honest negative evidence was also executed. Transaction `0x3bc64974467bc4c66429ea51ae9aa9e9dcf8d0076a84eb09a0ecd0d3d9cef53f` rejected a reveal whose packet did not match its commitment. Submission `lt-s-2` then used the base SHA while presenting evidence for the repaired SHA. Its two artifact-examination transactions, `0x7313c89ffd6dea1c367062f8f28b5c6b9c3064157054c167b72a11bbebd40339` and `0x44e1d1d0748714a9dd2b99ae651222aedcbbe25228f051c9ddf85ce5516801b4`, produced leader results that all participating validators disputed. Neither result mutated state; the candidate remained `REVEALED`. This is recorded as validator-disagreement fail-closed behavior, not as an accepted `INVALID_CANDIDATE` judgment.

Raw finalized receipts, vote sets, state reads and accounting snapshots are checked in under `release-evidence/`.

## Recommended demo target

Use a small public fixture with a real Git history and CI. The easiest trustworthy path is a `demo-target/` fixture in the eventual public Latch GitHub repository or a tiny separate public repository controlled by the builder.

Create two immutable Git states:

1. **base commit** — contains a deliberately failing CSV parser/test fixture;
2. **candidate commit** — fixes multiline LF + CRLF behavior, adds regression tests, and produces a green public GitHub Actions run for that exact candidate SHA.

Create a public issue describing the bug before opening the Latch bounty. Never fabricate CI, backdate evidence, or weaken the criteria just to obtain a positive result.

## Work order

Suggested frozen criteria:

```text
C1  quoted CSV fields containing LF round-trip without data loss
C2  quoted CSV fields containing CRLF round-trip without data loss
C3  public parser function signature remains unchanged
C4  regression tests cover both LF and CRLF
C5  official CI for the exact candidate SHA passes
```

Suggested scope:

```text
demo-target/parser.py
demo-target/test_parser.py
.github/workflows/demo-target.yml
```

Suggested forbidden changes:

```text
no dependency replacement
no deletion of the failing fixture
no public API removal
no changes outside the demo target and its CI job
```

Use `ci_required=true` and a 15-minute challenge window for the live demonstration.

## Wallets

- Wallet A: sponsor
- Wallet B: patch contributor
- Wallet C: optional challenger

All wallets must be on chain `61999`.

## Positive lifecycle

1. Wallet A creates the bounty with native GEN and records the creation tx.
2. Confirm `get_bounty` returns the expected `spec_hash` and accounting remains balanced.
3. Wallet B creates a local 32-byte salt and calls `compute_submission_commitment` with the exact candidate and evidence JSON.
4. Wallet B commits with the exact submission bond.
5. Wait for finality and recover the submission id through `get_submission_for_commitment`.
6. Wallet B reveals the exact candidate SHA + evidence + salt.
7. Trigger `examine_candidate` and wait for a finalized `ARTIFACT_VERIFIED` result. Record the substantive artifact fields.
8. Trigger `review_candidate`. A successful demo must show every frozen criterion as `SATISFIED` and status `QUALIFIED_PENDING`.
9. Optional but valuable: Wallet C opens a deliberately invalid challenge using public evidence that does not defeat the criterion. Resolve it and record `REJECTED`; verify its bond becomes `bonus_atto`.
10. Wait until the challenge deadline.
11. Call `finalize_submission` and record the returned certificate hash.
12. Confirm `get_certificate` returns the exact candidate commit and criterion vector.
13. Confirm Wallet B's credit includes bounty + submission bond + any rejected-challenge bonus.
14. Wallet B calls `withdraw_credit` and record the explorer hash.
15. Confirm `get_stats.accounting_balanced == true` after withdrawal.

## Negative path

Before the winning patch, submit one clearly wrong candidate or wrong-SHA evidence packet. The preferred negative proof is `INVALID_CANDIDATE` from artifact examination, because it demonstrates that the protocol does not jump directly to the LLM repair judgment.

Alternative negative proof: use an intentionally unreachable source and show `SOURCE_UNAVAILABLE` plus contributor bond refund. Do not mislabel an infrastructure failure as patch failure.

## Evidence to record

Update `deployments/studionet.json` and `docs/REVIEW_EVIDENCE.md` with:

- canonical contract address + deployment tx;
- source commit hash;
- public frontend URL;
- bounty create tx;
- bad candidate commit/reveal/examine txs and terminal state;
- winning candidate commitment;
- commit tx;
- reveal tx;
- artifact-examination tx/result;
- criterion-review tx/result;
- optional challenge open + resolve txs;
- finalization tx + certificate hash;
- withdrawal tx;
- final accounting stats.

If any step is not completed, say so. Historical or superseded deployment evidence must never be presented as proof of the current source.
