"""Finalized canonical release checks; consensus evidence is asserted separately."""
import json
import os
from pathlib import Path
import pytest
from gltest import get_gl_client
from gltest.contracts.contract import Contract
from gltest.types import TransactionHashVariant

pytestmark = pytest.mark.skipif(not os.environ.get('LATCH_CONTRACT'), reason='LATCH_CONTRACT required')


def canonical():
    client=get_gl_client()
    assert client.chain_id == 61999
    address=os.environ['LATCH_CONTRACT']
    schema=client.provider.make_request("gen_getContractSchema",[address])["result"]
    return client, Contract.new(address=address,schema=schema)


def test_canonical_studionet_contract_is_readable():
    _,contract=canonical()
    stats=contract.get_stats().call(transaction_hash_variant=TransactionHashVariant.LATEST_FINAL)
    assert stats['chain_id']=='61999'
    assert stats['rpc']=='https://studio.genlayer.com/api'
    assert stats['admin_controls'] is False
    assert stats['accounting_balanced'] is True


def test_deployed_source_matches_repository():
    client,_=canonical()
    import base64
    code=base64.b64decode(client.provider.make_request('gen_getContractCode',[os.environ['LATCH_CONTRACT']])['result']).decode()
    assert code == Path('contracts/latch.py').read_text()
