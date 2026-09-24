import { describe, expect, it } from 'vitest';
import { makeShoe, ShoeCounts, shoeSize } from './deckMath';
import { roundEv, upcardEv } from './edge';

const VEGAS = {
  hitSoft17: true,
  blackjackPayout: 1.5,
  doubleAfterSplit: true,
  lateSurrender: true,
};

/** EV of the round given the dealer shows a ten (not its share of the total). */
const evGivenTenUp = (shoe: ShoeCounts, rules = VEGAS) =>
  upcardEv(shoe, 10, rules) / (shoe[10] / shoeSize(shoe));

describe('roundEv', () => {
  it('a full 6-deck H17 shoe carries a house edge a little over half a percent', () => {
    // Published figure for these rules (6D, H17, DAS, LS, no re-split): ≈ −0.6%.
    const edge = roundEv(makeShoe(6), VEGAS);
    expect(edge).toBeGreaterThan(-0.007);
    expect(edge).toBeLessThan(-0.005);
  }, 30_000);

  it('a 6:5 blackjack payout costs the player', () => {
    const shoe = makeShoe(6);
    expect(evGivenTenUp(shoe)).toBeLessThan(0); // a ten up is bad news
    expect(evGivenTenUp(shoe, { ...VEGAS, blackjackPayout: 1.2 })).toBeLessThan(
      evGivenTenUp(shoe),
    );
  });

  it('swings toward the player when the low cards are gone', () => {
    const rich = makeShoe(6);
    for (const b of [2, 3, 4, 5, 6]) rich[b] -= 8; // true count ≈ +7
    expect(evGivenTenUp(rich)).toBeGreaterThan(evGivenTenUp(makeShoe(6)));
  });
});
