export const pct = (p: number, digits = 1): string =>
  `${(p * 100).toFixed(digits)}%`;

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
