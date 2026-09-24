import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionHashVariant } from 'genlayer-js/types';
import { readFileSync } from 'node:fs';
const client=createClient({chain:studionet});
if(Number(await client.request({method:'eth_chainId'}))!==61999)throw new Error('wrong chain');
const address=JSON.parse(readFileSync('deployments/studionet.json','utf8')).contract.address;
const result=await client.readContract({address,functionName:process.argv[2],args:JSON.parse(process.argv[3]||'[]'),transactionHashVariant:TransactionHashVariant.LATEST_FINAL,jsonSafeReturn:true});
console.log(JSON.stringify(result,(_,v)=>typeof v==='bigint'?v.toString():v,2));
