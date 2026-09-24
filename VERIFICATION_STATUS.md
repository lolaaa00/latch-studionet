# Verification status

Verified on 2026-09-24 against GenLayer Studionet chain `61999` and `https://studio.genlayer.com/api`:

- stable GenVM `v0.2.16` lint and schema validation: pass, 24 methods (12 view / 12 write);
- Direct Mode: 68 tests pass, including exact commitment binding, substantive validator replay, fail-closed states, challenge economics, settlement, withdrawal and the accounting invariant;
- canonical Studionet integration: 2 tests pass against `0xEa11d7d97c73a3A1EF9365B6dfa919355f17BE28`;
- deployed contract source equals `contracts/latch.py` byte for byte, SHA-256 `5b9f0a03ddd7f9f05873e8e3d615347aec022c42897fc4188c7e2a8e8cef6bb6`;
- deployed schema has the same 24-method surface as the release contract;
- frontend: 21 tests pass, TypeScript passes, Next.js production build passes locally and on Vercel;
- all published routes return HTTP 200;
- wallet code uses generic injected EIP-1193 `window.ethereum`; no prohibited wallet or signer integration is present;
- live public evidence reached `ARTIFACT_VERIFIED`, all five criteria `SATISFIED`, `QUALIFIED_PENDING`, and `QUALIFIED_FINAL` with certificate `058b45debcc2a765fba578411f89093723b76b77c65f6f83210bb7a5b68f3111`;
- the contributor withdrew the full 0.0102 GEN credit in `0x4affce24de7905eb34f4d6dea17e7ae580343070f8dd65c9e992f3ea69c68957`; post-withdrawal credit is zero and accounting remains balanced;
- deterministic wrong-reveal rejection and two independent validator-disagreement transactions demonstrate honest fail-closed behavior.

Canonical deployment and transaction hashes are recorded in `deployments/studionet.json`, `docs/REVIEW_EVIDENCE.md`, and the raw receipts under `release-evidence/`.
