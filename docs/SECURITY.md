# Security and adversarial notes

## Prompt injection

Repository pages, issue text, diffs, CI output, evidence notes and challenge claims are explicitly treated as untrusted data in every prompt. Validators re-fetch and independently re-reason. A malicious string in a source is not an instruction to the protocol.

## Contributor self-certification

Contributor `note` text never establishes artifact identity or criterion satisfaction by itself. The examiner and judge are instructed to require fetched evidence.

## Wrong SHA / stale CI

The artifact stage must establish `commit_bound=true`. CI is evaluated as exact-SHA evidence rather than generic “the repository has green CI.” The frozen candidate SHA cannot be edited after reveal.

## Moving the goalposts

There is no post-creation mutation method for criteria, base commit, scope, forbidden changes, evidence policy or CI requirement.

## Missing evidence

`NOT_PROVEN` is not `SATISFIED`. `SOURCE_UNAVAILABLE`, `NOT_READY`, and `INCONCLUSIVE` never pay the bounty.

## Sponsor bias

The sponsor cannot submit to their own bounty and cannot directly select a winner. The sponsor may submit public challenge evidence, but a challenge still needs the same GenLayer consensus path and a bond.

## Contributor race / duplicate candidate

Commit-reveal hides the candidate/evidence packet until reveal. After reveal, one active reservation exists per `(bounty, candidate SHA)`. Terminal outcomes release it.

## First-qualified ordering

Latch deliberately does not ask an LLM to rank six patches. The first candidate that reaches `QUALIFIED_PENDING` owns the challenge slot. Other candidates may remain committed/revealed while the pending patch resolves. This makes ordering observable and removes subjective “best patch” ranking.

## Challenge griefing

A challenge requires a deterministic bond. Rejected challenges increase the winner pool. Inconclusive/unavailable challenges are refunded because the protocol did not establish misconduct, and the candidate receives a small challenge-window extension to stop last-second availability griefing.

## Value accounting

The contract exposes an accounting invariant in `get_stats()`. Every native-value path should preserve it. Direct tests cover representative creation, refund, penalty, challenge and finalization paths. The finishing agent must extend tests until every value transition and edge case is covered under the actual installed GenVM runner.

## Pull withdrawals

All payouts become credits first. `withdraw_credit` requires the credited recipient as the transaction sender, clears credit before the transfer, and has no redirect parameter.

## Source redirects and host identity

Current web rendering can follow redirects without giving the contract a cryptographic redirect chain. The submitted URL, frozen evidence policy, fetched content and validator judgment are therefore the practical provenance boundary. Prefer stable first-party Git hosting and CI URLs. Do not claim cryptographic effective-URL verification.

## Git hosting availability

Public Git hosts may rate limit or render dynamic pages differently across validators. The protocol fails closed, but liveness can still suffer. For live proof, choose source URLs that GenVM reliably renders, and document any API/raw URL choice.

## What Latch does not prove

A repair certificate proves only that validators found the exact candidate to satisfy the frozen work order from the submitted public evidence. It does not prove the repository has no other bugs, that every platform was tested, or that the sponsor owns the upstream repository.
