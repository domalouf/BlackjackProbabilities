import { describe, expect, it } from 'vitest';
import { Hand } from './hand';
import { Card, Rank } from './card';

const card = (rank: Rank): Card => ({ rank, suit: 'spades' });
const hand = (...ranks: Rank[]): Hand => {
  const h = new Hand();
  for (const r of ranks) h.add(card(r));
  return h;
};

describe('Hand value logic', () => {
  it('counts an Ace as 11 until it would bust', () => {
    expect(hand('A', '6').getValue()).toBe(17);
    expect(hand('A', '6').isSoft()).toBe(true);
    expect(hand('A', '6', '10').getValue()).toBe(17);
    expect(hand('A', '6', '10').isSoft()).toBe(false);
  });

  it('handles multiple aces', () => {
    expect(hand('A', 'A').getValue()).toBe(12);
    expect(hand('A', 'A', '9').getValue()).toBe(21);
    expect(hand('A', 'A', '9').isSoft()).toBe(true);
    expect(hand('A', 'A', '9', 'K').getValue()).toBe(21);
    expect(hand('A', 'A', '9', 'K').isSoft()).toBe(false);
  });

  it('recognises a natural blackjack but not a three-card 21', () => {
    expect(hand('A', 'K').isBlackjack()).toBe(true);
    expect(hand('7', '7', '7').isBlackjack()).toBe(false);
    expect(hand('7', '7', '7').getValue()).toBe(21);
  });

  it('reports bust past 21', () => {
    expect(hand('K', 'Q', '5').isBust()).toBe(true);
    expect(hand('K', 'Q').isBust()).toBe(false);
  });
});
