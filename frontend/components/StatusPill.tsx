export function StatusPill({ status }: { status?: string }) {
  const s = status || "UNKNOWN";
  const cls = /CLOSED|FINAL|QUALIFIED/.test(s) ? "good" : /REJECTED|INVALID|EXPIRED|CANCEL/.test(s) ? "bad" : /SOURCE|INCONCLUSIVE|NOT_READY/.test(s) ? "warn" : "open";
  return <span className={`status-pill ${cls}`}>{s.replaceAll("_", " ")}</span>;
}
