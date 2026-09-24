import json
import sys
import pytest
from tests.direct.conftest import BOUNTY, CANDIDATE, SALT, NOW_UNIX, addr_hex, create_bounty, evidence_json, mock_verified_artifact, mock_qualified_review
from tests.direct.test_latch import setup_submission, qualified_setup, datetime_from_unix

CONTRACT = 'contracts/latch.py'


def artifact(**changes):
    return dict(status='VERIFIED', repository_matches=True, candidate_exists=True, base_relationship_supported=True, commit_bound=True, diff_available=True, ci_completed=True, ci_passed=True, scope_review_possible=True, basis='Public exact-SHA sources establish the artifact.', **{}) | changes


def review(**changes):
    return dict(criteria=[{'id': x, 'result': 'SATISFIED'} for x in ['C1','C2','C3']], scope_violation=False, forbidden_change=False, ci_passed=True, verdict='QUALIFIED', basis='All frozen requirements have positive evidence.') | changes


def mock_artifact(vm, **changes):
    vm.clear_mocks()
    vm.mock_web(r'github\.com/example/dataforge/.*', {'status':200,'body':'Public evidence'})
    vm.mock_llm('LATCH_ARTIFACT_EXAMINER_V1.*', json.dumps(artifact(**changes)))


def assert_balanced(c):
    s=c.get_stats()
    assert s['accounting_balanced'] is True
    assert int(s['total_deposited_atto']) == sum(int(s[k]) for k in ['bounty_escrow_atto','submission_escrow_atto','challenge_escrow_atto','claimable_atto','withdrawn_atto'])


@pytest.mark.parametrize('field', ['repository_matches','candidate_exists','base_relationship_supported','commit_bound','diff_available','scope_review_possible'])
def test_verified_requires_every_binding(direct_vm,direct_deploy,direct_alice,direct_bob,field):
    c=direct_deploy(CONTRACT); _,sid=setup_submission(direct_vm,c,direct_alice,direct_bob)
    mock_artifact(direct_vm, **{field:False})
    with direct_vm.expect_revert('internally inconsistent'): c.examine_candidate(sid)
    assert c.get_submission(sid)['status']=='REVEALED'
    assert_balanced(c)


@pytest.mark.parametrize('status', ['NOT_READY','VERIFIED'])
def test_incomplete_ci_refunds_without_rejection(direct_vm,direct_deploy,direct_alice,direct_bob,status):
    c=direct_deploy(CONTRACT); bid,sid=setup_submission(direct_vm,c,direct_alice,direct_bob)
    mock_artifact(direct_vm,status=status,ci_completed=False,ci_passed=False)
    assert c.examine_candidate(sid)=='NOT_READY'
    assert int(c.get_credit(addr_hex(direct_bob)))==int(c.get_bounty(bid)['submission_bond_atto'])
    assert_balanced(c)


def test_unavailable_during_review_is_refunded_nondecision(direct_vm,direct_deploy,direct_alice,direct_bob):
    c=direct_deploy(CONTRACT); bid,sid=setup_submission(direct_vm,c,direct_alice,direct_bob)
    mock_verified_artifact(direct_vm); c.examine_candidate(sid); direct_vm.clear_mocks()
    assert c.review_candidate(sid)=='INCONCLUSIVE'
    assert direct_vm.run_validator() is True
    assert all(x['result']=='NOT_PROVEN' for x in c.get_submission(sid)['review']['criteria'])
    assert int(c.get_credit(addr_hex(direct_bob)))==int(c.get_bounty(bid)['submission_bond_atto'])
    assert_balanced(c)


@pytest.mark.parametrize('field', ['scope_violation','forbidden_change','ci_passed'])
def test_review_validator_compares_each_flag(direct_vm,direct_deploy,direct_alice,direct_bob,field):
    c,bid,sid=qualified_setup(direct_vm,direct_deploy,direct_alice,direct_bob)
    direct_vm.clear_mocks(); direct_vm.mock_web('github.*',{'status':200,'body':'Evidence changed'})
    direct_vm.mock_llm('LATCH_REPAIR_JUDGE_V1.*',json.dumps(review(**{field:field!='ci_passed','verdict':'REJECTED'})))
    assert direct_vm.run_validator() is False


@pytest.mark.parametrize('rows', [[], [{'id':'C1','result':'SATISFIED'}]*3, [{'id':x,'result':'SATISFIED'} for x in ['C1','C2','C4']]])
def test_missing_duplicate_unknown_criteria_revert(direct_vm,direct_deploy,direct_alice,direct_bob,rows):
    c=direct_deploy(CONTRACT); _,sid=setup_submission(direct_vm,c,direct_alice,direct_bob)
    mock_verified_artifact(direct_vm); c.examine_candidate(sid)
    direct_vm.mock_llm('LATCH_REPAIR_JUDGE_V1.*',json.dumps(review(criteria=rows)))
    with direct_vm.expect_revert('LLM_ERROR'): c.review_candidate(sid)
    assert c.get_submission(sid)['status']=='ARTIFACT_VERIFIED'


def test_forbidden_change_rejects_and_accounts(direct_vm,direct_deploy,direct_alice,direct_bob):
    c=direct_deploy(CONTRACT); bid,sid=setup_submission(direct_vm,c,direct_alice,direct_bob)
    mock_verified_artifact(direct_vm); c.examine_candidate(sid)
    direct_vm.mock_llm('LATCH_REPAIR_JUDGE_V1.*',json.dumps(review(forbidden_change=True,verdict='REJECTED')))
    assert c.review_candidate(sid)=='REJECTED'
    assert int(c.get_credit(addr_hex(direct_alice)))==int(c.get_bounty(bid)['submission_bond_atto'])
    assert_balanced(c)


@pytest.mark.parametrize('change', ['candidate','contributor','salt','evidence','contract','bounty'])
def test_commitment_domain_separation(direct_vm,direct_deploy,direct_alice,direct_bob,direct_charlie,change,monkeypatch):
    c=direct_deploy(CONTRACT); bid=create_bounty(c,direct_vm,direct_alice)
    args=[bid,addr_hex(direct_bob),CANDIDATE,evidence_json(),SALT]
    first=c.compute_submission_commitment(*args)
    if change=='candidate': args[2]='aa'*20
    if change=='contributor': args[1]=addr_hex(direct_charlie)
    if change=='salt': args[4]='bb'*32
    if change=='evidence': args[3]=evidence_json().replace('exact candidate','changed candidate')
    if change=='bounty': args[0]=create_bounty(c,direct_vm,direct_alice)
    if change=='contract':
        import genlayer
        monkeypatch.setattr(genlayer.gl,'message',genlayer.gl.message._replace(contract_address=genlayer.Address(direct_charlie)))
    assert first != c.compute_submission_commitment(*args)


@pytest.mark.parametrize('own,criterion,message', [(True,'C1','own candidate'),(False,'MISSING','frozen criterion')])
def test_challenge_identity_and_criterion(direct_vm,direct_deploy,direct_alice,direct_bob,direct_charlie,own,criterion,message):
    c,bid,sid=qualified_setup(direct_vm,direct_deploy,direct_alice,direct_bob)
    direct_vm.sender=direct_bob if own else direct_charlie
    direct_vm.value=int(c.get_bounty(bid)['challenge_bond_atto'])
    with direct_vm.expect_revert(message): c.open_challenge(sid,criterion,'https://example.com/regression','Evidence allegedly defeats the criterion.')
    assert_balanced(c)


@pytest.mark.parametrize('outcome', ['UPHELD','REJECTED','INCONCLUSIVE','SOURCE_UNAVAILABLE'])
def test_challenge_exact_economics(direct_vm,direct_deploy,direct_alice,direct_bob,direct_charlie,outcome):
    c,bid,sid=qualified_setup(direct_vm,direct_deploy,direct_alice,direct_bob)
    b=c.get_bounty(bid); cb=int(b['challenge_bond_atto']); sb=int(b['submission_bond_atto'])
    direct_vm.sender=direct_charlie; direct_vm.value=cb
    cid=c.open_challenge(sid,'C1','https://github.com/example/dataforge/challenge','Public evidence disputes criterion C1.')
    direct_vm.value=0
    result=dict(outcome=outcome,evidence_valid=outcome!='SOURCE_UNAVAILABLE',criterion_still_satisfied=outcome!='UPHELD',scope_violation_found=False,ci_regression_found=False,basis='Independent criterion-specific assessment.')
    direct_vm.mock_llm('LATCH_CHALLENGE_JUDGE_V1.*',json.dumps(result))
    assert c.resolve_challenge(cid)==outcome
    assert direct_vm.run_validator() is True
    if outcome=='UPHELD':
        assert int(c.get_credit(addr_hex(direct_charlie)))==cb+sb//2
        assert int(c.get_credit(addr_hex(direct_alice)))==sb-sb//2
        with direct_vm.expect_revert('not pending'): c.finalize_submission(sid)
    else:
        assert int(c.get_credit(addr_hex(direct_charlie)))==(0 if outcome=='REJECTED' else cb)
        direct_vm.warp(datetime_from_unix(int(c.get_submission(sid)['challenge_deadline'])))
        c.finalize_submission(sid)
        assert int(c.get_credit(addr_hex(direct_bob)))==BOUNTY+sb+(cb if outcome=='REJECTED' else 0)
    assert_balanced(c)


def test_withdraw_zeros_credit_before_native_transfer(direct_vm,direct_deploy,direct_alice):
    c=direct_deploy(CONTRACT);bid=create_bounty(c,direct_vm,direct_alice)
    direct_vm.value=0;c.cancel_bounty(bid)
    calls=[]
    def hook(vm,request):
        assert c.get_credit(addr_hex(direct_alice))=='0'
        assert int(c.get_stats()['withdrawn_atto'])==BOUNTY
        calls.append(request)
        return {'ok':None}
    direct_vm._gl_call_hook=hook
    c.withdraw_credit(addr_hex(direct_alice))
    assert len(calls)==1
    assert 'EthSend' in calls[0]
    assert calls[0]['EthSend']['value']==BOUNTY
    assert calls[0]['EthSend']['address'].as_bytes == direct_alice
    assert calls[0]['EthSend']['calldata'] == b''
    with direct_vm.expect_revert('no credit'): c.withdraw_credit(addr_hex(direct_alice))
    assert_balanced(c)


def test_raw_timestamp_tracks_warp(direct_vm,direct_deploy):
    direct_deploy(CONTRACT);direct_vm.warp(datetime_from_unix(NOW_UNIX+1234))
    assert sys.modules['_contract_latch']._now()==NOW_UNIX+1234


def test_no_admin_or_spec_setter(direct_deploy):
    c=direct_deploy(CONTRACT)
    public={name for name in dir(c._instance) if not name.startswith('_') and callable(getattr(c._instance,name))}
    assert not any(name.startswith(('set_','admin','select_winner','override')) for name in public)
    assert c.get_stats()['admin_controls'] is False


def test_first_qualified_slot_and_blocked_candidate_refund(direct_vm,direct_deploy,direct_alice,direct_bob,direct_charlie):
    c=direct_deploy(CONTRACT);bid,sid=setup_submission(direct_vm,c,direct_alice,direct_bob)
    bond=int(c.get_bounty(bid)['submission_bond_atto']);direct_vm.sender=direct_charlie
    sha='ad'*20;commit=c.compute_submission_commitment(bid,addr_hex(direct_charlie),sha,evidence_json(),SALT)
    direct_vm.value=bond;other=c.commit_candidate(bid,commit);direct_vm.value=0
    c.reveal_candidate(other,sha,evidence_json(),SALT)
    mock_verified_artifact(direct_vm);c.examine_candidate(sid);c.examine_candidate(other)
    mock_qualified_review(direct_vm);c.review_candidate(sid)
    with direct_vm.expect_revert('already has a pending'):c.review_candidate(other)
    frozen=c.get_bounty(bid)['spec_hash']
    direct_vm.warp(datetime_from_unix(int(c.get_submission(sid)['challenge_deadline'])))
    cert=c.finalize_submission(sid)
    assert c.get_submission(other)['status']=='PROTOCOL_BLOCKED'
    assert int(c.get_credit(addr_hex(direct_charlie)))==bond
    assert int(c.get_credit(addr_hex(direct_bob)))==BOUNTY+bond
    assert c.get_certificate(bid)['certificate_hash']==cert
    assert c.get_bounty(bid)['spec_hash']==frozen
    assert_balanced(c)


def test_challenge_missing_original_evidence_is_nondecision(direct_vm,direct_deploy,direct_alice,direct_bob,direct_charlie):
    c,bid,sid=qualified_setup(direct_vm,direct_deploy,direct_alice,direct_bob)
    bond=int(c.get_bounty(bid)['challenge_bond_atto']);direct_vm.sender=direct_charlie;direct_vm.value=bond
    cid=c.open_challenge(sid,'C1','https://example.com/regression','Public regression evidence for criterion one.')
    direct_vm.value=0;direct_vm.clear_mocks();direct_vm.mock_web('example.com/regression',{'status':200,'body':'challenge is available'})
    assert c.resolve_challenge(cid)=='SOURCE_UNAVAILABLE'
    assert c.get_submission(sid)['status']=='QUALIFIED_PENDING'
    assert int(c.get_credit(addr_hex(direct_charlie)))==bond
    assert_balanced(c)


@pytest.mark.parametrize('outcome,valid,satisfied', [('UPHELD',False,False),('UPHELD',True,True),('REJECTED',True,False)])
def test_contradictory_challenge_result_fails_closed(direct_vm,direct_deploy,direct_alice,direct_bob,direct_charlie,outcome,valid,satisfied):
    c,bid,sid=qualified_setup(direct_vm,direct_deploy,direct_alice,direct_bob)
    direct_vm.sender=direct_charlie;direct_vm.value=int(c.get_bounty(bid)['challenge_bond_atto'])
    cid=c.open_challenge(sid,'C1','https://github.com/example/dataforge/challenge','Public evidence disputes criterion C1.')
    direct_vm.value=0
    direct_vm.mock_llm('LATCH_CHALLENGE_JUDGE_V1.*',json.dumps(dict(outcome=outcome,evidence_valid=valid,criterion_still_satisfied=satisfied,scope_violation_found=False,ci_regression_found=False,basis='Contradictory result must never settle money.')))
    with direct_vm.expect_revert('LLM_ERROR'):c.resolve_challenge(cid)
    assert c.get_challenge(cid)['status']=='OPEN'
    assert_balanced(c)
