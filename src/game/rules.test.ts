import { describe, expect, it } from 'vitest';
import { Hand } from './hand';
import { Card, Rank } from './card';
import {
  determineWinner,
  netResult,
  shouldDealerHit,
  VEGAS_6_DECK,
} from './rules';

const hand = (...ranks: Rank[]): Hand => {
  const h = new Hand();
  for (const r of ranks) h.add({ rank: r, suit: 'clubs' } as Card);
  return h;
};

describe('shouldDealerHit', () => {
  it('stands on hard 17, hits below', () => {
    expect(shouldDealerHit(hand('10', '6'), VEGAS_6_DECK)).toBe(true);
    expect(shouldDealerHit(hand('10', '7'), VEGAS_6_DECK)).toBe(false);
  });

  it('hits soft 17 under Vegas rules, stands under S17', () => {
    expect(shouldDealerHit(hand('A', '6'), VEGAS_6_DECK)).toBe(true);
    expect(
      shouldDealerHit(hand('A', '6'), { ...VEGAS_6_DECK, hitSoft17: false }),
    ).toBe(false);
  });
});

describe('determineWinner + payouts', () => {
  it('pays 3:2 on a natural', () => {
    const r = determineWinner(hand('A', 'K'), hand('9', '8'));
    expect(r).toBe('player-blackjack');
    expect(netResult(r, 100, VEGAS_6_DECK)).toBe(150);
  });

  it('natural vs natural is a push', () => {
    expect(determineWinner(hand('A', 'K'), hand('A', 'Q'))).toBe('push');
  });

  it('player bust loses even if dealer also would bust', () => {
    const r = determineWinner(hand('10', '6', '9'), hand('10', '6'));
    expect(r).toBe('player-loss');
    expect(netResult(r, 50, VEGAS_6_DECK)).toBe(-50);
  });

  it('dealer bust pays even money', () => {
    const r = determineWinner(hand('10', '9'), hand('10', '6', '10'));
    expect(r).toBe('player-win');
    expect(netResult(r, 50, VEGAS_6_DECK)).toBe(50);
  });

  it('equal totals push', () => {
    const r = determineWinner(hand('10', '9'), hand('10', '9'));
    expect(r).toBe('push');
    expect(netResult(r, 50, VEGAS_6_DECK)).toBe(0);
  });
});
