import { describe, expect, it } from 'vitest';
import { Shoe } from './shoe';
import { hiLoValue, rankToBucket } from '../probability/deckMath';
import { BlackjackGame } from './engine';

describe('hiLoValue', () => {
  it('tags low cards +1, tens and aces −1, the rest 0', () => {
    expect([2, 3, 4, 5, 6].map(hiLoValue)).toEqual([1, 1, 1, 1, 1]);
    expect([7, 8, 9].map(hiLoValue)).toEqual([0, 0, 0]);
    expect([hiLoValue(1), hiLoValue(10)]).toEqual([-1, -1]);
  });
});

describe('Shoe running count', () => {
  it('starts balanced and stays balanced once the whole shoe is dealt', () => {
    const shoe = new Shoe(6);
    expect(shoe.runningCount()).toBe(0);
    expect(shoe.decksRemaining()).toBe(6);

    for (let i = 0; i < 6 * 52; i++) shoe.deal();
    expect(shoe.runningCount()).toBe(0); // Hi-Lo is a balanced system
    expect(shoe.decksRemaining()).toBe(0);
  });

  it('resets to zero on reshuffle', () => {
    const shoe = new Shoe(1);
    for (let i = 0; i < 20; i++) shoe.deal();
    shoe.reset();
    expect(shoe.runningCount()).toBe(0);
    expect(shoe.dealtCards()).toHaveLength(0);
  });
});

describe('BlackjackGame card count', () => {
  const freshHand = (): BlackjackGame => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const game = new BlackjackGame(1000);
      game.deal(1);
      if (game.snapshot().phase === 'player') return game;
    }
    throw new Error('never dealt a non-blackjack hand');
  };

  it('excludes the face-down hole card while the player decides', () => {
    const game = freshHand();
    const s = game.snapshot();

    // player's two cards + dealer upcard only
    expect(s.count.seen).toBe(3);
    const visible = [
      ...s.player.getCards(),
      s.dealer.getCards()[1], // index 0 is the hole card
    ];
    const expected = visible.reduce(
      (n, c) => n + hiLoValue(rankToBucket(c.rank)),
      0,
    );
    expect(s.count.running).toBe(expected);
  });

  it('adds the hole card back once the hand is resolved', () => {
    const game = freshHand();
    game.stand();
    const s = game.snapshot();

    const all = [...s.player.getCards(), ...s.dealer.getCards()];
    const expected = all.reduce(
      (n, c) => n + hiLoValue(rankToBucket(c.rank)),
      0,
    );
    expect(s.count.seen).toBe(all.length);
    expect(s.count.running).toBe(expected);
    expect(s.count.true).toBeCloseTo(s.count.running / s.count.decksRemaining);
  });
});
