import { describe, expect, it } from 'vitest';
import { makeShoe } from './deckMath';
import { dealerDistribution, DealerDistribution } from './dealer';

const sum = (d: DealerDistribution) =>
  d.p17 + d.p18 + d.p19 + d.p20 + d.p21 + d.pBlackjack + d.pBust;

const H17 = { hitSoft17: true, peeked: true };
const S17 = { hitSoft17: false, peeked: true };

describe('dealerDistribution', () => {
  it('is a probability distribution for every upcard', () => {
    for (let up = 1; up <= 10; up++) {
      const d = dealerDistribution([up], makeShoe(6), H17);
      expect(sum(d)).toBeCloseTo(1, 10);
    }
  });

  it('never reports a natural once the dealer has peeked', () => {
    for (const up of [1, 10]) {
      const d = dealerDistribution([up], makeShoe(6), H17);
      expect(d.pBlackjack).toBe(0);
    }
  });

  it('matches the published dealer-bust-by-upcard table (S17, unconditional)', () => {
    // Wizard of Odds "Dealer Final Hand Probabilities", S17, before the peek.
    const expected: Record<number, number> = {
      2: 0.3536,
      3: 0.3739,
      4: 0.3946,
      5: 0.4165,
      6: 0.4232,
      7: 0.2623,
      8: 0.2447,
      9: 0.2284,
      10: 0.2121,
      1: 0.1153,
    };
    for (const [up, target] of Object.entries(expected)) {
      const d = dealerDistribution([Number(up)], makeShoe(6), {
        ...S17,
        peeked: false,
      });
      expect(d.pBust).toBeGreaterThan(target - 0.006);
      expect(d.pBust).toBeLessThan(target + 0.006);
    }
  });

  it('peeking raises the conditional bust rate on a 10 or Ace', () => {
    for (const up of [1, 10]) {
      const uncond = dealerDistribution([up], makeShoe(6), {
        ...S17,
        peeked: false,
      });
      const cond = dealerDistribution([up], makeShoe(6), S17);
      expect(cond.pBust).toBeGreaterThan(uncond.pBust);
    }
  });

  it('hits soft 17: H17 busts more often on an Ace than S17', () => {
    const h = dealerDistribution([1], makeShoe(6), H17);
    const s = dealerDistribution([1], makeShoe(6), S17);
    expect(h.pBust).toBeGreaterThan(s.pBust);
  });

  it('a pat 20 in the hole stands', () => {
    const d = dealerDistribution([10, 10], makeShoe(6), H17);
    expect(d.p20).toBeCloseTo(1, 10);
  });

  it('respects a depleted shoe: stripping every ten shifts the distribution', () => {
    const full = dealerDistribution([10], makeShoe(6), H17);
    const shoe = makeShoe(6);
    shoe[10] = 0;
    const stripped = dealerDistribution([10], shoe, H17);
    expect(sum(stripped)).toBeCloseTo(1, 10);
    // A dealer showing 10 makes a two-card 20 far less often with no tens left.
    expect(stripped.p20).toBeLessThan(full.p20 - 0.1);
  });
});
