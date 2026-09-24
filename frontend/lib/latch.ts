import { assertFinalizedSuccess } from "./receipt";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant, TransactionStatus, ExecutionResult, type TransactionHash, type CalldataEncodable } from "genlayer-js/types";
import { CONTRACT_ADDRESS, RPC_URL, assertReleaseConfig } from "./config";
import { provider, ensureStudionet } from "./wallet";

assertReleaseConfig();

export type Bounty = Record<string, any>;
export type Submission = Record<string, any>;

export function readClient() { return createClient({ chain: studionet }); }
export function requireContract() {
  if (!CONTRACT_ADDRESS) throw new Error("Latch contract is not configured yet");
  return CONTRACT_ADDRESS as `0x${string}`;
}
export function writeClient(address: string) {
  const p = provider();
  if (!p) throw new Error("No injected EIP-1193 wallet available");
  return createClient({ chain: studionet, account: address as `0x${string}`, provider: p });
}
export async function read(functionName: string, args: CalldataEncodable[] = []) {
  return readClient().readContract({ address: requireContract(), functionName, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL, jsonSafeReturn: true });
}
export async function write(address: string, functionName: string, args: CalldataEncodable[] = [], value = 0n): Promise<string> {
  await ensureStudionet();
  const client = writeClient(address);
  return client.writeContract({ address: requireContract(), functionName, args, value });
}
export async function waitFinal(hash: string) {
  let receipt: unknown;
  for (let attempt = 0; attempt < 240; attempt++) {
    const response = await fetch(RPC_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "eth_getTransactionByHash", params: [hash] }) });
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.message || "Studionet receipt lookup failed");
    receipt = payload.result;
    const raw = receipt as { status?: string | number; status_name?: string; statusName?: string } | null;
    const status = raw?.status ?? raw?.status_name ?? raw?.statusName;
    if (status === "FINALIZED" || status === 7) break;
    await new Promise(resolve => setTimeout(resolve, 15_000));
  }
  assertFinalizedSuccess(receipt);
  return receipt;
}
export async function listBounties(offset = 0, count = 24): Promise<any> { return read("list_bounties", [offset, count]); }
export async function getBounty(id: string): Promise<Bounty> { return read("get_bounty", [id]) as any; }
export async function listSubmissions(id: string): Promise<Submission[]> { return read("list_submissions", [id]) as any; }
export async function listCertificates(offset = 0, count = 24): Promise<any> { return read("list_certificates", [offset, count]); }
export async function getCredit(address: string): Promise<string> { return read("get_credit", [address]) as any; }
