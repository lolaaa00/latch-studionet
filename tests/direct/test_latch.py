import json
import pytest

from tests.direct.conftest import (
    BOUNTY, CANDIDATE, SALT, NOW, NOW_UNIX, addr_hex, create_bounty,
    evidence_json, mock_verified_artifact, mock_qualified_review,
)

CONTRACT = "contracts/latch.py"


def setup_submission(vm, contract, sponsor, contributor):
    bid = create_bounty(contract, vm, sponsor)
    vm.sender = contributor
    contributor_hex = addr_hex(contributor)
    commitment = contract.compute_submission_commitment(bid, contributor_hex, CANDIDATE, evidence_json(), SALT)
    bounty = contract.get_bounty(bid)
    vm.value = int(bounty["submission_bond_atto"])
    sid = contract.commit_candidate(bid, commitment)
    vm.value = 0
    contract.reveal_candidate(sid, CANDIDATE, evidence_json(), SALT)
    return bid, sid


def test_create_bounty_freezes_spec_and_accounts(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    bid = create_bounty(contract, direct_vm, direct_alice)
    bounty = contract.get_bounty(bid)
    stats = contract.get_stats()
    assert bounty["status"] == "OPEN"
    assert bounty["base_commit"].startswith("8a95")
    assert len(bounty["criteria"]) == 3
    assert int(stats["bounty_escrow_atto"]) == BOUNTY
    assert stats["accounting_balanced"] is True
    assert stats["chain_id"] == "61999"


def test_sponsor_cannot_submit_to_own_bounty(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    bid = create_bounty(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.value = int(contract.get_bounty(bid)["submission_bond_atto"])
    with direct_vm.expect_revert("sponsor cannot compete"):
        contract.commit_candidate(bid, "22" * 32)


def test_commitment_binds_candidate_evidence_and_contributor(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid = create_bounty(contract, direct_vm, direct_alice)
    bob = addr_hex(direct_bob)
    a = contract.compute_submission_commitment(bid, bob, CANDIDATE, evidence_json(), SALT)
    other_evidence = json.loads(evidence_json())
    other_evidence[0]["note"] = "changed note changes commitment"
    b = contract.compute_submission_commitment(bid, bob, CANDIDATE, json.dumps(other_evidence), SALT)
    assert a != b


def test_wrong_reveal_is_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid = create_bounty(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    commitment = contract.compute_submission_commitment(bid, addr_hex(direct_bob), CANDIDATE, evidence_json(), SALT)
    direct_vm.value = int(contract.get_bounty(bid)["submission_bond_atto"])
    sid = contract.commit_candidate(bid, commitment)
    direct_vm.value = 0
    with direct_vm.expect_revert("does not match commitment"):
        contract.reveal_candidate(sid, CANDIDATE, evidence_json(), "33" * 32)


def test_verified_artifact_advances(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    mock_verified_artifact(direct_vm)
    assert contract.examine_candidate(sid) == "ARTIFACT_VERIFIED"
    item = contract.get_submission(sid)
    assert item["artifact"]["commit_bound"] is True
    assert contract.get_stats()["accounting_balanced"] is True


def test_invalid_artifact_forfeits_bond_to_sponsor(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    direct_vm.mock_web(r"github\.com/example/dataforge/.*", {"status": 200, "body": "wrong repository and wrong sha"})
    direct_vm.mock_llm(r"LATCH_ARTIFACT_EXAMINER_V1.*", json.dumps({
        "status": "INVALID", "repository_matches": False, "candidate_exists": True,
        "base_relationship_supported": False, "commit_bound": False, "diff_available": True,
        "ci_completed": True, "ci_passed": False, "scope_review_possible": True,
        "basis": "Evidence does not bind this patch to the frozen repository and base.",
    }))
    assert contract.examine_candidate(sid) == "INVALID_CANDIDATE"
    sponsor_credit = int(contract.get_credit(addr_hex(direct_alice)))
    assert sponsor_credit == int(contract.get_bounty(bid)["submission_bond_atto"])


def test_source_unavailable_is_non_decision_and_refund(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    # No web mock means fetch is unavailable in direct mode.
    assert contract.examine_candidate(sid) == "SOURCE_UNAVAILABLE"
    assert int(contract.get_credit(addr_hex(direct_bob))) == int(contract.get_bounty(bid)["submission_bond_atto"])
    assert contract.get_bounty(bid)["status"] == "OPEN"


def test_all_criteria_must_be_assessed(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    mock_verified_artifact(direct_vm)
    contract.examine_candidate(sid)
    direct_vm.mock_llm(r"LATCH_REPAIR_JUDGE_V1.*", json.dumps({
        "criteria": [{"id": "C1", "result": "SATISFIED"}],
        "scope_violation": False, "forbidden_change": False, "ci_passed": True,
        "verdict": "QUALIFIED", "basis": "incomplete",
    }))
    with pytest.raises(Exception):
        contract.review_candidate(sid)


def test_qualified_candidate_enters_challenge_window(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    mock_verified_artifact(direct_vm)
    contract.examine_candidate(sid)
    mock_qualified_review(direct_vm)
    assert contract.review_candidate(sid) == "QUALIFIED_PENDING"
    assert contract.get_bounty(bid)["status"] == "QUALIFIED_PENDING"
    assert contract.get_submission(sid)["capsule_hash"]


def test_failed_criterion_rejects_candidate(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    mock_verified_artifact(direct_vm)
    contract.examine_candidate(sid)
    direct_vm.mock_llm(r"LATCH_REPAIR_JUDGE_V1.*", json.dumps({
        "criteria": [
            {"id": "C1", "result": "SATISFIED"}, {"id": "C2", "result": "FAILED"}, {"id": "C3", "result": "SATISFIED"}
        ],
        "scope_violation": False, "forbidden_change": False, "ci_passed": True,
        "verdict": "REJECTED", "basis": "CRLF regression remains.",
    }))
    assert contract.review_candidate(sid) == "REJECTED"
    assert contract.get_bounty(bid)["status"] == "OPEN"


def test_not_proven_is_inconclusive_not_qualified(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    mock_verified_artifact(direct_vm)
    contract.examine_candidate(sid)
    direct_vm.mock_llm(r"LATCH_REPAIR_JUDGE_V1.*", json.dumps({
        "criteria": [
            {"id": "C1", "result": "SATISFIED"}, {"id": "C2", "result": "NOT_PROVEN"}, {"id": "C3", "result": "SATISFIED"}
        ],
        "scope_violation": False, "forbidden_change": False, "ci_passed": True,
        "verdict": "INCONCLUSIVE", "basis": "Windows behavior is not proven.",
    }))
    assert contract.review_candidate(sid) == "INCONCLUSIVE"
    assert int(contract.get_credit(addr_hex(direct_bob))) == int(contract.get_bounty(bid)["submission_bond_atto"])


def qualified_setup(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    mock_verified_artifact(direct_vm)
    contract.examine_candidate(sid)
    mock_qualified_review(direct_vm)
    contract.review_candidate(sid)
    return contract, bid, sid


def test_upheld_challenge_reopens_bounty(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract, bid, sid = qualified_setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.sender = direct_charlie
    direct_vm.value = int(contract.get_bounty(bid)["challenge_bond_atto"])
    cid = contract.open_challenge(sid, "C2", "https://github.com/example/dataforge/actions/runs/419", "Windows CI for the exact candidate fails the CRLF regression test.")
    direct_vm.value = 0
    direct_vm.mock_web(r"github\.com/example/dataforge/.*", {"status": 200, "body": "candidate CI fails Windows CRLF test"})
    direct_vm.mock_llm(r"LATCH_CHALLENGE_JUDGE_V1.*", json.dumps({
        "outcome": "UPHELD", "evidence_valid": True, "criterion_still_satisfied": False,
        "scope_violation_found": False, "ci_regression_found": True,
        "basis": "Official CI for the candidate SHA demonstrates the regression.",
    }))
    assert contract.resolve_challenge(cid) == "UPHELD"
    assert contract.get_bounty(bid)["status"] == "OPEN"
    assert contract.get_submission(sid)["status"] == "REJECTED_CHALLENGE"


def test_rejected_challenge_adds_bond_to_winner_pool(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract, bid, sid = qualified_setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.sender = direct_charlie
    challenge_bond = int(contract.get_bounty(bid)["challenge_bond_atto"])
    direct_vm.value = challenge_bond
    cid = contract.open_challenge(sid, "C1", "https://github.com/example/dataforge/actions/runs/420", "Claimed failure is unrelated to the candidate.")
    direct_vm.value = 0
    direct_vm.mock_web(r"github\.com/example/dataforge/.*", {"status": 200, "body": "all exact-SHA tests pass; challenge references unrelated job"})
    direct_vm.mock_llm(r"LATCH_CHALLENGE_JUDGE_V1.*", json.dumps({
        "outcome": "REJECTED", "evidence_valid": True, "criterion_still_satisfied": True,
        "scope_violation_found": False, "ci_regression_found": False,
        "basis": "The challenge does not defeat the frozen criterion.",
    }))
    assert contract.resolve_challenge(cid) == "REJECTED"
    assert int(contract.get_bounty(bid)["bonus_atto"]) == challenge_bond


def test_finalize_creates_certificate_and_credits_winner(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, bid, sid = qualified_setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    deadline = int(contract.get_submission(sid)["challenge_deadline"])
    direct_vm.warp(datetime_from_unix(deadline + 1))
    certificate = contract.finalize_submission(sid)
    cert = contract.get_certificate(bid)
    assert certificate == cert["certificate_hash"]
    assert cert["candidate_commit"] == CANDIDATE
    assert contract.get_bounty(bid)["status"] == "CLOSED"
    assert int(contract.get_credit(addr_hex(direct_bob))) > BOUNTY
    assert contract.get_stats()["accounting_balanced"] is True


def datetime_from_unix(value):
    from datetime import datetime, timezone
    return datetime.fromtimestamp(value, tz=timezone.utc).isoformat().replace("+00:00", "Z")


def test_unrevealed_commit_forfeits_after_deadline(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid = create_bounty(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    direct_vm.value = int(contract.get_bounty(bid)["submission_bond_atto"])
    sid = contract.commit_candidate(bid, "44" * 32)
    reveal_deadline = int(contract.get_submission(sid)["reveal_deadline"])
    direct_vm.warp(datetime_from_unix(reveal_deadline + 1))
    direct_vm.value = 0
    contract.expire_submission(sid)
    assert contract.get_submission(sid)["status"] == "UNREVEALED"
    assert int(contract.get_credit(addr_hex(direct_alice))) > 0


def test_accounting_invariant_survives_refund_paths(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    assert contract.examine_candidate(sid) == "SOURCE_UNAVAILABLE"
    assert contract.get_stats()["accounting_balanced"] is True


def test_exact_submission_bond_is_enforced(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid = create_bounty(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    commitment = contract.compute_submission_commitment(bid, addr_hex(direct_bob), CANDIDATE, evidence_json(), SALT)
    direct_vm.value = int(contract.get_bounty(bid)["submission_bond_atto"]) - 1
    with direct_vm.expect_revert("exact submission bond"):
        contract.commit_candidate(bid, commitment)


def test_duplicate_commitment_is_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid = create_bounty(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    commitment = contract.compute_submission_commitment(bid, addr_hex(direct_bob), CANDIDATE, evidence_json(), SALT)
    direct_vm.value = int(contract.get_bounty(bid)["submission_bond_atto"])
    contract.commit_candidate(bid, commitment)
    with direct_vm.expect_revert("commitment already used"):
        contract.commit_candidate(bid, commitment)


def test_duplicate_active_candidate_sha_is_reserved(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy(CONTRACT)
    bid = create_bounty(contract, direct_vm, direct_alice)
    # Bob reveals first.
    direct_vm.sender = direct_bob
    c1 = contract.compute_submission_commitment(bid, addr_hex(direct_bob), CANDIDATE, evidence_json(), SALT)
    direct_vm.value = int(contract.get_bounty(bid)["submission_bond_atto"])
    s1 = contract.commit_candidate(bid, c1)
    direct_vm.value = 0
    contract.reveal_candidate(s1, CANDIDATE, evidence_json(), SALT)
    # Charlie can commit but cannot reserve the same candidate on reveal.
    direct_vm.sender = direct_charlie
    salt2 = "55" * 32
    c2 = contract.compute_submission_commitment(bid, addr_hex(direct_charlie), CANDIDATE, evidence_json(), salt2)
    direct_vm.value = int(contract.get_bounty(bid)["submission_bond_atto"])
    s2 = contract.commit_candidate(bid, c2)
    direct_vm.value = 0
    with direct_vm.expect_revert("already active"):
        contract.reveal_candidate(s2, CANDIDATE, evidence_json(), salt2)


def test_scope_violation_mechanically_rejects(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    mock_verified_artifact(direct_vm)
    contract.examine_candidate(sid)
    direct_vm.mock_llm(r"LATCH_REPAIR_JUDGE_V1.*", json.dumps({
        "criteria": [
            {"id": "C1", "result": "SATISFIED"}, {"id": "C2", "result": "SATISFIED"}, {"id": "C3", "result": "SATISFIED"}
        ],
        "scope_violation": True, "forbidden_change": False, "ci_passed": True,
        "verdict": "REJECTED", "basis": "The diff changes files outside the frozen scope.",
    }))
    assert contract.review_candidate(sid) == "REJECTED"


def test_required_ci_failure_mechanically_rejects(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    mock_verified_artifact(direct_vm)
    contract.examine_candidate(sid)
    direct_vm.mock_llm(r"LATCH_REPAIR_JUDGE_V1.*", json.dumps({
        "criteria": [
            {"id": "C1", "result": "SATISFIED"}, {"id": "C2", "result": "SATISFIED"}, {"id": "C3", "result": "SATISFIED"}
        ],
        "scope_violation": False, "forbidden_change": False, "ci_passed": False,
        "verdict": "REJECTED", "basis": "Required exact-SHA CI did not pass.",
    }))
    assert contract.review_candidate(sid) == "REJECTED"


def test_cannot_finalize_before_challenge_deadline(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, bid, sid = qualified_setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    with direct_vm.expect_revert("challenge window still open"):
        contract.finalize_submission(sid)


def test_exact_challenge_bond_is_enforced(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract, bid, sid = qualified_setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.sender = direct_charlie
    direct_vm.value = int(contract.get_bounty(bid)["challenge_bond_atto"]) - 1
    with direct_vm.expect_revert("exact challenge bond"):
        contract.open_challenge(sid, "C1", "https://github.com/example/dataforge/actions/runs/420", "This challenge has a real public evidence claim.")


def test_unavailable_challenge_refunds_and_preserves_candidate(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract, bid, sid = qualified_setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.sender = direct_charlie
    bond = int(contract.get_bounty(bid)["challenge_bond_atto"])
    direct_vm.value = bond
    cid = contract.open_challenge(sid, "C1", "https://unavailable.example.invalid/evidence", "The candidate allegedly regresses the frozen criterion.")
    direct_vm.value = 0
    # Original sources remain mocked; the challenge URL itself has no web mock.
    assert contract.resolve_challenge(cid) == "SOURCE_UNAVAILABLE"
    assert contract.get_submission(sid)["status"] == "QUALIFIED_PENDING"
    assert int(contract.get_credit(addr_hex(direct_charlie))) == bond


def test_cancel_untouched_bounty_returns_credit(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    bid = create_bounty(contract, direct_vm, direct_alice)
    direct_vm.value = 0
    contract.cancel_bounty(bid)
    assert contract.get_bounty(bid)["status"] == "CANCELLED"
    assert int(contract.get_credit(addr_hex(direct_alice))) == BOUNTY
    assert contract.get_stats()["accounting_balanced"] is True


def test_expired_bounty_refunds_sponsor_and_active_revealed_candidate(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    bounty = contract.get_bounty(bid)
    direct_vm.warp(datetime_from_unix(int(bounty["closes_at"]) + 1))
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    contract.expire_bounty(bid)
    assert contract.get_bounty(bid)["status"] == "EXPIRED"
    assert contract.get_submission(sid)["status"] == "PROTOCOL_BLOCKED"
    assert int(contract.get_credit(addr_hex(direct_alice))) == BOUNTY
    assert int(contract.get_credit(addr_hex(direct_bob))) == int(bounty["submission_bond_atto"])
    assert contract.get_stats()["accounting_balanced"] is True


def test_certificate_is_unavailable_before_finalization(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    bid = create_bounty(contract, direct_vm, direct_alice)
    with direct_vm.expect_revert("does not have a finalized"):
        contract.get_certificate(bid)


def test_withdrawal_cannot_be_redirected_by_another_sender(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid = create_bounty(contract, direct_vm, direct_alice)
    direct_vm.value = 0
    contract.cancel_bounty(bid)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("only the recipient"):
        contract.withdraw_credit(addr_hex(direct_alice))


def test_artifact_validator_replays_substantive_fields(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    mock_verified_artifact(direct_vm)
    contract.examine_candidate(sid)
    assert direct_vm.run_validator() is True
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"github\.com/example/dataforge/.*", {"status": 200, "body": "candidate exists but CI failed"})
    direct_vm.mock_llm(r"LATCH_ARTIFACT_EXAMINER_V1.*", json.dumps({
        "status": "VERIFIED", "repository_matches": True, "candidate_exists": True,
        "base_relationship_supported": True, "commit_bound": True, "diff_available": True,
        "ci_completed": True, "ci_passed": False, "scope_review_possible": True,
        "basis": "Same artifact but a substantive CI field differs.",
    }))
    assert direct_vm.run_validator() is False


def test_repair_validator_replays_every_criterion(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    bid, sid = setup_submission(direct_vm, contract, direct_alice, direct_bob)
    mock_verified_artifact(direct_vm)
    contract.examine_candidate(sid)
    mock_qualified_review(direct_vm)
    contract.review_candidate(sid)
    assert direct_vm.run_validator() is True
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"github\.com/example/dataforge/.*", {"status": 200, "body": "evidence now shows C2 fails"})
    direct_vm.mock_llm(r"LATCH_REPAIR_JUDGE_V1.*", json.dumps({
        "criteria": [
            {"id": "C1", "result": "SATISFIED"}, {"id": "C2", "result": "FAILED"}, {"id": "C3", "result": "SATISFIED"}
        ],
        "scope_violation": False, "forbidden_change": False, "ci_passed": True,
        "verdict": "REJECTED", "basis": "Validator independently finds a failed criterion.",
    }))
    assert direct_vm.run_validator() is False


def test_pending_candidate_does_not_block_other_timely_reveals(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy(CONTRACT)
    bid = create_bounty(contract, direct_vm, direct_alice)
    bond = int(contract.get_bounty(bid)["submission_bond_atto"])
    # Bob commits candidate 1.
    direct_vm.sender = direct_bob
    c1 = contract.compute_submission_commitment(bid, addr_hex(direct_bob), CANDIDATE, evidence_json(), SALT)
    direct_vm.value = bond
    s1 = contract.commit_candidate(bid, c1)
    direct_vm.value = 0
    contract.reveal_candidate(s1, CANDIDATE, evidence_json(), SALT)
    # Charlie commits a different candidate but intentionally waits to reveal.
    candidate2 = "9f31d8f3c3f3f9186c405de74b06a6bb5b84f12c"
    salt2 = "77" * 32
    direct_vm.sender = direct_charlie
    c2 = contract.compute_submission_commitment(bid, addr_hex(direct_charlie), candidate2, evidence_json(), salt2)
    direct_vm.value = bond
    s2 = contract.commit_candidate(bid, c2)
    direct_vm.value = 0
    # Bob qualifies first.
    direct_vm.sender = direct_bob
    mock_verified_artifact(direct_vm)
    contract.examine_candidate(s1)
    mock_qualified_review(direct_vm)
    contract.review_candidate(s1)
    assert contract.get_bounty(bid)["status"] == "QUALIFIED_PENDING"
    # Charlie can still reveal a timely pre-existing commitment while the first patch is pending.
    direct_vm.sender = direct_charlie
    contract.reveal_candidate(s2, candidate2, evidence_json(), salt2)
    assert contract.get_submission(s2)["status"] == "REVEALED"
