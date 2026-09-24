# Latch architecture

## Trust boundary

```text
sponsor wallet                         contributor wallet
     │                                        │
     │ create_bounty + native GEN             │ commit_candidate + bond
     │                                        │ reveal exact SHA + evidence
     └────────────────┐              ┌─────────┘
                      ▼              ▼
                 ┌─────────────────────────┐
                 │       LATCH 61999       │
                 │                         │
                 │ frozen spec + escrow    │
                 │ commit/reveal binding   │
                 │ candidate reservations  │
                 │ pull-credit ledger      │
                 └────────────┬────────────┘
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
     ARTIFACT EXAMINER                REPAIR JUDGE
     fetch public URLs                re-fetch public URLs
     verify exact artifact            assess every criterion
     compare substantive fields       compare substantive fields
              │                                │
              └───────────────┬────────────────┘
                              ▼
                    QUALIFIED_PENDING
                              │
                   optional bonded challenge
                              │
                              ▼
                    deterministic finalize
                              │
                  winner credit + certificate
```

No backend can write a verdict. No admin can replace a decision. Repository maintainers can merge or ignore a certified patch, but their merge action is not the oracle for bounty settlement.

## Frozen bounty specification

The `spec_hash` covers the fields that define the job:

```text
network 61999
repository URL
issue URL
base commit
branch
problem statement
acceptance criteria
allowed scope
forbidden changes
evidence policy
CI requirement
```

Funding and freezing happen together. There is no setter for those fields.

## Commit / reveal binding

The commitment covers:

```text
"latch-v1"
chain 61999
contract address
bounty id
contributor address
candidate commit SHA
evidence bundle
32-byte salt
```

A candidate SHA is reserved per bounty after reveal. Terminal non-decisions and rejections release the reservation so a contributor can retry with better evidence.

## Stage A — artifact examination

Every evidence URL is fetched inside the nondeterministic execution boundary. The result contains these substantive fields:

```text
status
repository_matches
candidate_exists
base_relationship_supported
commit_bound
diff_available
ci_completed
ci_passed
scope_review_possible
```

Validators independently fetch and re-evaluate the same fields. They do not approve merely because the leader emitted valid JSON.

Status semantics:

- `VERIFIED`: identity and reviewability established.
- `SOURCE_UNAVAILABLE`: at least one submitted source could not be fetched; contributor bond is refunded.
- `NOT_READY`: artifact is legitimate but required evidence such as CI is not complete; bond refunded.
- `INVALID`: wrong/missing artifact binding or unusable evidence; bond goes to sponsor.

## Stage B — repair judgment

The judge re-fetches the evidence. Each frozen criterion must be returned exactly once as:

- `SATISFIED`
- `FAILED`
- `NOT_PROVEN`

It separately returns scope violation, forbidden-change and CI flags. `_normalize_review` derives the only valid overall verdict from those fields. A model cannot label a candidate `QUALIFIED` when the criterion table says otherwise.

Validators independently reproduce the criterion vector and flags. Reasoning prose is deliberately excluded from equivalence.

## Stage C — challenge

A challenge is not “I prefer another patch.” It names one frozen criterion and one public evidence URL.

The challenge result reproduces:

```text
outcome
evidence_valid
criterion_still_satisfied
scope_violation_found
ci_regression_found
```

`UPHELD` removes qualification and reopens the bounty. `REJECTED` makes the challenge bond part of the winner pool. `SOURCE_UNAVAILABLE` and `INCONCLUSIVE` refund the challenger and preserve the candidate's pending state with a small anti-last-second extension.

## Settlement boundary

Nondeterministic functions never transfer GEN.

They return status. Deterministic code then mutates:

```text
bounty_escrow
submission_escrow
challenge_escrow
credits
total_withdrawn
```

Withdrawals are pull payments: ledger is zeroed before `emit_transfer`.

## Liveness

- commit must leave the full reveal window before bounty close;
- unrevealed commitments can be expired;
- terminal artifact/review outcomes release reservations;
- an open bounty can expire after deadline if there is no pending qualified patch;
- a patch that qualified before the bounty deadline is allowed to finish its challenge window;
- finalization refunds protocol-blocked competing candidates rather than confiscating their bonds.

## Repair certificate

The certificate binds the settlement outcome to the immutable spec and evidence assessment capsule. It is a protocol attestation that the patch satisfied this work order under GenLayer consensus, not a universal security guarantee for the repository.
