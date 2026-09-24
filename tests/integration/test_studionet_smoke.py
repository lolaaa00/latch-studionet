"""Opt-in Studionet smoke. Set LATCH_CONTRACT to the finalized address before running."""
import os
import pytest

pytestmark = pytest.mark.skipif(not os.environ.get("LATCH_CONTRACT"), reason="set LATCH_CONTRACT for Studionet smoke")


def test_canonical_studionet_contract_is_readable():
    from gltest import get_contract_factory
    address = os.environ["LATCH_CONTRACT"]
    factory = get_contract_factory("Latch", address=address)
    contract = factory()
    stats = contract.get_stats().call()
    assert stats["chain_id"] == "61999"
    assert stats["rpc"] == "https://studio.genlayer.com/api"
    assert stats["admin_controls"] is False
    assert stats["accounting_balanced"] is True
