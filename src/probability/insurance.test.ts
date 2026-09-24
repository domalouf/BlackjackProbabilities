import { describe, expect, it } from 'vitest';
import { makeShoe } from './deckMath';
import { insuranceDecision } from './insurance';

describe('insuranceDecision', () => {
  it('is a losing bet off a full shoe (basic strategy never insures)', () => {
    const shoe = makeShoe(6);
    shoe[1] -= 1; // the dealer's Ace
    shoe[9] -= 2; // your 9-9
    const d = insuranceDecision(shoe, false, 1.5);
    expect(d.pDealerBlackjack).toBeCloseTo(96 / 309, 10);
    expect(d.takeEv).toBeCloseTo(0.5 * (3 * (96 / 309) - 1), 10);
    expect(d.takeEv).toBeLessThan(0);
    expect(d.best).toBe('decline');
  });

  it('turns profitable once tens make up more than a third of the shoe', () => {
    const shoe = makeShoe(1);
    for (const b of [2, 3, 4, 5, 6]) shoe[b] = 0; // every low card gone
    const d = insuranceDecision(shoe, false, 1.5);
    expect(d.pDealerBlackjack).toBeGreaterThan(1 / 3);
    expect(d.takeEv).toBeGreaterThan(0);
    expect(d.best).toBe('take');
  });

  it('even money: +1 for sure against 3:2 that pushes on a dealer blackjack', () => {
    const shoe = makeShoe(6);
    const d = insuranceDecision(shoe, true, 1.5);
    expect(d.evenMoney).toBe(true);
    expect(d.takeEv).toBe(1);
    expect(d.declineEv).toBeCloseTo(1.5 * (1 - 96 / 312), 10);
    expect(d.best).toBe('decline');
  });
});
