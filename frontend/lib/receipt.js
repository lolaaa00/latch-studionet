import { ExecutionResult, TransactionStatus, transactionsStatusNumberToName } from 'genlayer-js/types';

/** Stable Studio receipts carry execution proof in consensus_data, not the EVM-only field. */
export function assertFinalizedSuccess(value) {
 const r = value;
  const status = r?.statusName ?? r?.status_name ?? (typeof r?.status === "string" ? r.status : transactionsStatusNumberToName[String(r?.status)]) ?? r?.status;
 const leader = r?.consensus_data?.leader_receipt?.filter(x=>x.mode==='leader').at(-1);
 const execution = r?.txExecutionResultName ?? leader?.execution_result;
 const success = r?.txExecutionResultName !== undefined
   ? r.txExecutionResultName === ExecutionResult.FINISHED_WITH_RETURN
   : leader?.execution_result === 'SUCCESS' && (typeof leader.result === 'string' || leader.result?.status === 'return');
 const votes = Object.values(r?.consensus_data?.votes ?? {});
 const agrees = votes.filter(v => v === 'agree').length;
 const disagrees = votes.filter(v => v === 'disagree').length;
 const accepted = votes.length === 0 || (agrees > 0 && agrees > disagrees);
 if(status !== TransactionStatus.FINALIZED || !success || !accepted) throw new Error(`Transaction finalized without success: ${status ?? 'unknown'} / ${execution ?? 'missing execution proof'} / consensus ${agrees}:${disagrees}`);
}
