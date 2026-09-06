export const pct = (p: number, digits = 1): string =>
  `${(p * 100).toFixed(digits)}%`;

/** Expected value in bet units, always signed: +0.23, -0.54. */
export const ev = (x: number): string =>
  `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(3)}`;

export const money = (x: number): string =>
  `${x < 0 ? '−' : ''}$${Math.abs(Math.round(x)).toLocaleString()}`;
