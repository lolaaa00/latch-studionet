export type PendingReveal = { bountyId: string; commitment: string; candidate: string; evidenceJson: string; salt: string; createdAt: number };
const KEY = "latch:pending-reveals:v1";
export function loadReveals(): PendingReveal[] {
  if (typeof window === "undefined") return [];
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function saveReveal(item: PendingReveal) {
  const next = [item, ...loadReveals().filter(x => x.commitment !== item.commitment)];
  localStorage.setItem(KEY, JSON.stringify(next));
}
export function removeReveal(commitment: string) { localStorage.setItem(KEY, JSON.stringify(loadReveals().filter(x => x.commitment !== commitment))); }
export function makeSaltHex() {
  const bytes = new Uint8Array(32); crypto.getRandomValues(bytes);
  return Array.from(bytes).map(x => x.toString(16).padStart(2, "0")).join("");
}

export async function finalizeReveal(commitment: string, finality: () => Promise<unknown>) {
  await finality();
  removeReveal(commitment);
}
