// Display formatting helpers shared across components.

export function pct(x: number, digits = 1): string {
  if (!Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(digits)}%`;
}

export function signedPct(x: number, digits = 1): string {
  if (!Number.isFinite(x)) return "—";
  const s = (x * 100).toFixed(digits);
  return x > 0 ? `+${s}%` : `${s}%`;
}

export function money(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return "—";
  const sign = x < 0 ? "-" : "";
  return `${sign}$${Math.abs(x).toFixed(digits)}`;
}

export function signedMoney(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return "—";
  const sign = x < 0 ? "−" : "+";
  return `${sign}$${Math.abs(x).toFixed(digits)}`;
}

export function oneInX(p: number): string {
  if (!Number.isFinite(p) || p <= 0) return "—";
  const x = 1 / p;
  return x >= 100 ? `1 in ${Math.round(x)}` : `1 in ${x.toFixed(1)}`;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
