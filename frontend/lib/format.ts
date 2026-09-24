export const ATTO = 10n ** 18n;
export function parseGen(value: string): bigint {
  const cleaned = value.trim();
  if (!/^\d+(\.\d{0,18})?$/.test(cleaned)) throw new Error("Enter a valid GEN amount");
  const [whole, frac = ""] = cleaned.split(".");
  return BigInt(whole) * ATTO + BigInt((frac + "0".repeat(18)).slice(0, 18));
}
export function formatGen(value: string | bigint | number, max = 4): string {
  const n = BigInt(value || 0);
  const whole = n / ATTO;
  const frac = (n % ATTO).toString().padStart(18, "0").slice(0, max).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}
export function short(value?: string, left = 6, right = 4) {
  if (!value) return "—";
  return value.length <= left + right + 3 ? value : `${value.slice(0, left)}…${value.slice(-right)}`;
}
export function when(unix?: string | number) {
  const n = Number(unix || 0);
  return n ? new Date(n * 1000).toLocaleString() : "—";
}
export function timeLeft(unix?: string | number) {
  const delta = Number(unix || 0) * 1000 - Date.now();
  if (delta <= 0) return "closed";
  const h = Math.floor(delta / 3_600_000);
  const m = Math.floor((delta % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}
