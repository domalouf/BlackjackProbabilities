/** The bet sizes on offer, in units — a 1-to-8 spread. */
export const BET_SIZES = [1, 2, 4, 8] as const;

/**
 * A simple bet ramp that follows the edge: the table minimum while the house
 * has the edge, then up as the edge swings your way. Each +1 of true count is
 * worth roughly +0.5% of edge, so this doubles the bet about every count.
 */
export function suggestedBet(edge: number): number {
  if (edge <= 0) return 1;
  if (edge <= 0.005) return 2;
  if (edge <= 0.01) return 4;
  return 8;
}
