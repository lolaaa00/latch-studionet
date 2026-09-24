import { beforeEach, describe, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(()=>({writeContract:vi.fn(),readContract:vi.fn(),waitForTransactionReceipt:vi.fn()}));
vi.mock('genlayer-js',()=>({createClient:vi.fn(()=>sdk)}));
import { ensureStudionet } from '../lib/wallet';
import { saveReveal, loadReveals, finalizeReveal } from '../lib/reveal';
import { write, waitFinal, read } from '../lib/latch';
import { TransactionStatus, ExecutionResult, TransactionHashVariant } from 'genlayer-js/types';

beforeEach(()=>{
 vi.clearAllMocks();
 const storage=new Map<string,string>();
 vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)||null,setItem:(k:string,v:string)=>storage.set(k,v)});
 vi.stubGlobal('window',{ethereum:{request:vi.fn().mockResolvedValue('0xf22f')}});
 vi.stubEnv('NEXT_PUBLIC_LATCH_CONTRACT','0x'+'ab'.repeat(20));
});

describe('generic EIP-1193 network safety',()=>{
 it('does not request a switch on 61999',async()=>{await ensureStudionet();expect(window.ethereum!.request).toHaveBeenCalledTimes(1);});
 it('verifies the chain after switching',async()=>{
  const request=vi.fn().mockResolvedValueOnce('0x1').mockResolvedValueOnce(null).mockResolvedValueOnce('0xf22f');window.ethereum={request};
  await ensureStudionet();expect(request.mock.calls.map(x=>x[0].method)).toEqual(['eth_chainId','wallet_switchEthereumChain','eth_chainId']);
 });
 it('adds, switches, and verifies an unknown chain',async()=>{
  const request=vi.fn().mockResolvedValueOnce('0x1').mockRejectedValueOnce({code:4902}).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce('0xf22f');window.ethereum={request};
  await ensureStudionet();expect(request.mock.calls.map(x=>x[0].method)).toEqual(['eth_chainId','wallet_switchEthereumChain','wallet_addEthereumChain','wallet_switchEthereumChain','eth_chainId']);
 });
 it('refuses a wallet that stays on the wrong chain',async()=>{
  window.ethereum={request:vi.fn().mockResolvedValue('0x1')};await expect(ensureStudionet()).rejects.toThrow('did not switch');
 });
 it('does not swallow user rejection',async()=>{
  window.ethereum={request:vi.fn().mockResolvedValueOnce('0x1').mockRejectedValueOnce(new Error('user rejected'))};await expect(ensureStudionet()).rejects.toThrow('user rejected');
 });
 it('requires an injected wallet',async()=>{window.ethereum=undefined;await expect(ensureStudionet()).rejects.toThrow('injected');});
});

describe('reveal durability',()=>{
 const rec={bountyId:'lt-b-1',commitment:'aa'.repeat(32),candidate:'bb'.repeat(20),evidenceJson:'[]',salt:'cc'.repeat(32),createdAt:123};
 it('retains secret through failed finality',async()=>{saveReveal(rec);await expect(finalizeReveal(rec.commitment,async()=>{throw new Error('execution failed')})).rejects.toThrow();expect(loadReveals()).toEqual([rec]);});
 it('retains secret while pending and removes only after success',async()=>{saveReveal(rec);await finalizeReveal(rec.commitment,async()=>{expect(loadReveals()).toEqual([rec]);});expect(loadReveals()).toEqual([]);});
 it('never silently evicts an older unrevealed commitment',()=>{for(let i=0;i<50;i++)saveReveal({...rec,commitment:String(i)});expect(loadReveals()).toHaveLength(50);});
 it('propagates storage failure so callers cannot submit without a secret',()=>{vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw new Error('quota')}});expect(()=>saveReveal(rec)).toThrow('quota');});
});

describe('transaction execution',()=>{
 it('requires finalized successful execution',async()=>{sdk.waitForTransactionReceipt.mockResolvedValue({statusName:TransactionStatus.FINALIZED,txExecutionResultName:ExecutionResult.FINISHED_WITH_RETURN});await waitFinal('0x'+'ab'.repeat(32));expect(sdk.waitForTransactionReceipt.mock.calls[0][0].status).toBe(TransactionStatus.FINALIZED);});
 it.each([ExecutionResult.FINISHED_WITH_ERROR,undefined])('rejects finalized failure or missing execution proof: %s',async(result)=>{sdk.waitForTransactionReceipt.mockResolvedValue({statusName:TransactionStatus.FINALIZED,txExecutionResultName:result});await expect(waitFinal('0x'+'ab'.repeat(32))).rejects.toThrow('without success');});
 it('rejects accepted-only success',async()=>{sdk.waitForTransactionReceipt.mockResolvedValue({statusName:TransactionStatus.ACCEPTED,txExecutionResultName:ExecutionResult.FINISHED_WITH_RETURN});await expect(waitFinal('0x'+'ab'.repeat(32))).rejects.toThrow();});
 it('guards network before sending any write',async()=>{window.ethereum={request:vi.fn().mockResolvedValue('0x1')};await expect(write('0x'+'aa'.repeat(20),'withdraw_credit',[])).rejects.toThrow('did not switch');expect(sdk.writeContract).not.toHaveBeenCalled();});
});
