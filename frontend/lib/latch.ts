import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant, TransactionStatus, ExecutionResult, type TransactionHash, type CalldataEncodable } from "genlayer-js/types";
import { CONTRACT_ADDRESS, assertReleaseConfig } from "./config";
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
  const receipt = await readClient().waitForTransactionReceipt({ hash: hash as TransactionHash, status: TransactionStatus.FINALIZED, retries: 240, interval: 15_000 });
  if (receipt.statusName !== TransactionStatus.FINALIZED || receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) throw new Error(`Transaction finalized without success: ${receipt.statusName} / ${receipt.txExecutionResultName}`);
  return receipt;
}
export async function listBounties(offset = 0, count = 24): Promise<any> { return read("list_bounties", [offset, count]); }
export async function getBounty(id: string): Promise<Bounty> { return read("get_bounty", [id]) as any; }
export async function listSubmissions(id: string): Promise<Submission[]> { return read("list_submissions", [id]) as any; }
export async function listCertificates(offset = 0, count = 24): Promise<any> { return read("list_certificates", [offset, count]); }
export async function getCredit(address: string): Promise<string> { return read("get_credit", [address]) as any; }
