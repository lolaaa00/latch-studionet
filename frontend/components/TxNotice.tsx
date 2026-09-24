import { EXPLORER_URL } from "@/lib/config";
import { short } from "@/lib/format";
export function TxNotice({ phase, hash }: { phase?: string; hash?: string }) {
  if (!phase && !hash) return null;
  return <div className="tx-notice"><span className="tx-dot"/><div><strong>{phase || "transaction"}</strong>{hash ? <a href={`${EXPLORER_URL}/tx/${hash}`} target="_blank">{short(hash, 10, 8)} ↗</a> : <small>waiting for wallet</small>}</div></div>;
}
