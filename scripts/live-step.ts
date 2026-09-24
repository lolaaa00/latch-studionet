import { assertFinalizedSuccess } from "../frontend/lib/receipt.js";
/** Manual release operator utility. No server, API route, or hosted signer. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { TransactionHashVariant, type GenLayerClient, type GenLayerChain } from 'genlayer-js/types';
const encode=(x:unknown)=>JSON.stringify(x,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n';
export default async function liveStep(client:GenLayerClient<GenLayerChain>){
 const root=process.env.LATCH_RELEASE_ROOT!;
 const step=JSON.parse(readFileSync(process.env.LATCH_STEP_FILE!,'utf8'));
 const deployment=JSON.parse(readFileSync(`${root}/deployments/studionet.json`,'utf8'));
 const address=deployment.contract.address;
 if(client.chain.id!==61999 || client.chain.rpcUrls.default.http[0]!=='https://studio.genlayer.com/api' || Number(await client.request({method:'eth_chainId'}))!==61999)throw new Error('Studionet lock failed');
 if(client.account?.address.toLowerCase()!==step.sender.toLowerCase())throw new Error('Wrong operator account');
 const source=readFileSync(`${root}/contracts/latch.py`,'utf8');
 if(await client.getContractCode(address)!==source)throw new Error('Release source mismatch');
 const file=`${root}/release-evidence/${step.label}.json`;
 let record=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{step:{method:step.method,args:step.args,value:step.value||'0',sender:step.sender},contract:address};
 if(!record.txHash){
  record.txHash=await client.writeContract({address,functionName:step.method,args:step.args,value:BigInt(step.value||0)});
  writeFileSync(file,encode(record));
 }
 console.log(`${step.label}: ${record.txHash}`);
 if(!record.receipt){
  for(let attempt=0;attempt<240;attempt++){
   record.receipt=await client.request({method:'eth_getTransactionByHash',params:[record.txHash]});
   if(record.receipt?.status==='FINALIZED'||record.receipt?.status_name==='FINALIZED'||record.receipt?.status===7)break;
   await new Promise(resolve=>setTimeout(resolve,15000));
  }
  writeFileSync(file,encode(record));
 }
 assertFinalizedSuccess(record.receipt);
 record.stats=await client.readContract({address,functionName:'get_stats',args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL,jsonSafeReturn:true});
 if(!record.stats.accounting_balanced)throw new Error('Accounting invariant failed');
 if(step.check){record.state=await client.readContract({address,functionName:step.check.method,args:step.check.args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL,jsonSafeReturn:true});}
 writeFileSync(file,encode(record));console.log(encode({txHash:record.txHash,state:record.state,stats:record.stats}));
}
