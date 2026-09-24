export const pct = (p: number, digits = 1): string =>
  `${(p * 100).toFixed(digits)}%`;

/** Signed difference between two probabilities, in percentage points: +1.8pp, −0.4pp. */
export const pctDelta = (diff: number, digits = 1): string => {
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  return `${sign}${Math.abs(diff * 100).toFixed(digits)}pp`;
};

/** Expected value in bet units, always signed: +0.23, -0.54. */
export const ev = (x: number): string =>
  `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(3)}`;

/** Always-signed number: +4, −2, 0, +1.5. */
export const signed = (x: number, digits = 0): string => {
  const sign = x > 0 ? '+' : x < 0 ? '−' : '';
  return `${sign}${Math.abs(x).toFixed(digits)}`;
};

export const money = (x: number): string =>
  `${x < 0 ? '−' : ''}$${Math.abs(Math.round(x)).toLocaleString()}`;

/** Signed bet-unit amount, trimmed to whole numbers where possible: +2, −1.5, 0. */
export const units = (x: number): string => {
  const sign = x > 0 ? '+' : x < 0 ? '−' : '';
  const abs = Math.abs(x);
  return `${sign}${Number.isInteger(abs) ? abs : abs.toFixed(1)}`;
};

/** Always-signed percentage: +0.42%, −0.58%. */
export const signedPct = (p: number, digits = 2): string => {
  const sign = p > 0 ? '+' : p < 0 ? '−' : '';
  return `${sign}${Math.abs(p * 100).toFixed(digits)}%`;
};
