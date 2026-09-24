import json

NOW = "2026-09-19T12:00:00Z"
NOW_UNIX = 1789819200
BOUNTY = 10**18
REPO = "https://github.com/example/dataforge"
ISSUE = "https://github.com/example/dataforge/issues/418"
BASE = "8a95c7d1b75c8e4309d21698b5033de8c49b0c73"
CANDIDATE = "41bd7eaf9d80d44d2990a52a45784e92783e17ea"
SALT = "11" * 32


def addr_hex(value):
    if hasattr(value, "as_hex"):
        return value.as_hex
    return "0x" + bytes(value).hex()


def criteria_json():
    return json.dumps([
        {"id": "C1", "text": "Quoted CSV fields containing LF must round-trip without data loss.", "evidence_hint": "diff and regression test"},
        {"id": "C2", "text": "Quoted CSV fields containing CRLF must round-trip without data loss.", "evidence_hint": "diff and Windows test"},
        {"id": "C3", "text": "Existing public parser API signatures must remain compatible.", "evidence_hint": "diff and compatibility CI"},
    ])


def evidence_json():
    return json.dumps([
        {"kind": "COMMIT", "url": "https://github.com/example/dataforge/commit/41bd7eaf9d80d44d2990a52a45784e92783e17ea", "note": "exact candidate commit"},
        {"kind": "DIFF", "url": "https://github.com/example/dataforge/commit/41bd7eaf9d80d44d2990a52a45784e92783e17ea.diff", "note": "patch against the frozen base"},
        {"kind": "CI", "url": "https://github.com/example/dataforge/actions/runs/418", "note": "official CI for the candidate SHA"},
    ])


def create_bounty(contract, vm, sponsor):
    vm.sender = sponsor
    vm.value = BOUNTY
    vm.warp(NOW)
    return contract.create_bounty(
        "Repair multiline CSV parsing",
        REPO,
        ISSUE,
        BASE,
        "main",
        "CSV exports fail when a quoted field contains an embedded newline. Repair parsing without changing the public API.",
        criteria_json(),
        "Changes may touch src/csv/** and tests/csv/** only.",
        "No dependency replacement, public API removal, or unrelated refactor.",
        "Use the upstream GitHub repository, exact commit and diff pages, and official CI bound to the candidate SHA.",
        True,
        NOW_UNIX + 86400,
        900,
    )


def mock_verified_artifact(vm):
    vm.mock_web(r"github\.com/example/dataforge/.*", {"status": 200, "body": "candidate 41bd7ea descends from 8a95c7d; diff modifies csv parser and tests; CI completed successfully"})
    vm.mock_llm(r"LATCH_ARTIFACT_EXAMINER_V1.*", json.dumps({
        "status": "VERIFIED",
        "repository_matches": True,
        "candidate_exists": True,
        "base_relationship_supported": True,
        "commit_bound": True,
        "diff_available": True,
        "ci_completed": True,
        "ci_passed": True,
        "scope_review_possible": True,
        "basis": "The fetched commit, diff and CI all identify the same candidate and repository.",
    }))


def mock_qualified_review(vm):
    vm.mock_llm(r"LATCH_REPAIR_JUDGE_V1.*", json.dumps({
        "criteria": [
            {"id": "C1", "result": "SATISFIED"},
            {"id": "C2", "result": "SATISFIED"},
            {"id": "C3", "result": "SATISFIED"},
        ],
        "scope_violation": False,
        "forbidden_change": False,
        "ci_passed": True,
        "verdict": "QUALIFIED",
        "basis": "The candidate satisfies every frozen criterion and the exact-SHA CI passed.",
    }))

# The stable contract runner lives in v0.2.16; never select a cached preview SDK.
import pytest

@pytest.fixture
def direct_deploy(direct_deploy):
    def deploy(path, *args, **kwargs):
        return direct_deploy(path, *args, sdk_version="v0.2.16", **kwargs)
    return deploy

@pytest.fixture
def direct_vm(direct_vm, monkeypatch):
    # genlayer-test 0.29.2 refreshes sender/value but omits message_raw.datetime.
    # The stable VM supplies a fresh raw message for every call. Mirror that here.
    original = direct_vm._refresh_gl_message
    def refresh():
        original()
        import sys
        gl = sys.modules.get("genlayer.gl")
        if gl is not None:
            gl.message_raw["datetime"] = direct_vm._datetime
    monkeypatch.setattr(direct_vm, "_refresh_gl_message", refresh)
    return direct_vm
