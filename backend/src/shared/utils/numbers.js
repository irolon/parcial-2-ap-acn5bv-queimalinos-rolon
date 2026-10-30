/** Redondea a 1 decimal. Acepta number, string numérico (rpc) o null. */
export function round1(n) {
  if (n === null || n === undefined || n === '') return null;
  const value = Number(n);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}
