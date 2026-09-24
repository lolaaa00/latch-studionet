# Canonical live demo — Studionet 61999

The demo should prove the actual trust model, not merely that methods can be called.

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
