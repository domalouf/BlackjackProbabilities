import { describe, expect, it } from 'vitest';
import { BlackjackGame } from './engine';
import { Rank } from './card';
import { Shoe } from './shoe';

/**
 * A game whose next cards are scripted. Deal order is player, dealer hole,
 * player, dealer upcard, then every later draw in turn.
 */
const scripted = (...ranks: Rank[]): BlackjackGame => {
  const shoe = new Shoe(6);
  shoe.stack(ranks);
  return new BlackjackGame(undefined, shoe);
};

const total = (counts: number[]) => counts.reduce((a, b) => a + b, 0);

describe('dealer plays card by card', () => {
  it('reveals the hole card, then draws one card per step until it stands', () => {
    // You 10-8, dealer 6 (hole) + 5 → draws 2, 3, 4 → 20.
    const game = scripted('10', '6', '8', '5', '2', '3', '4');
    game.deal();
    game.stand();

    let s = game.snapshot();
    expect(s.phase).toBe('dealer');
    expect(s.dealerHoleHidden).toBe(false);
    expect(s.dealer.getSize()).toBe(2);

    for (const size of [3, 4, 5]) {
      game.dealerStep();
      expect(game.snapshot().dealer.getSize()).toBe(size);
      expect(game.snapshot().phase).toBe('dealer');
    }
    game.dealerStep(); // 20: stands, hand settles
    s = game.snapshot();
    expect(s.phase).toBe('result');
    expect(s.hands[0].result).toBe('player-loss');
    expect(s.net).toBe(-1);
  });

  it('skips the dealer turn when every hand has busted', () => {
    const game = scripted('10', '7', '6', '5', '9');
    game.deal();
    game.hit(); // 10-6-9 = 25
    const s = game.snapshot();
    expect(s.phase).toBe('result');
    expect(s.dealer.getSize()).toBe(2);
    expect(s.net).toBe(-1);
  });

  it('stands automatically on 21', () => {
    const game = scripted('5', '10', '6', '7', '10');
    game.deal();
    game.hit(); // 5-6-10 = 21
    expect(game.snapshot().phase).toBe('dealer');
  });
});

describe('bet size', () => {
  it('plays the hand for the units bet, doubled on a double down', () => {
    const game = scripted('6', '10', '5', '7', '10');
    game.deal(4);
    expect(game.snapshot().hands[0].bet).toBe(4);
    game.doubleDown(); // 6-5-10 = 21 vs 17
    game.playDealerOut();
    const s = game.snapshot();
    expect(s.hands[0].bet).toBe(8);
    expect(s.net).toBe(8);
  });
});

describe('splitting', () => {
  it('splits a pair into two hands, played one after the other', () => {
    // 8-8 vs 10 (hole) + 9. Hand 1 draws 3 → 11 and doubles on a 10 → 21.
    // Hand 2 then draws 7 → 15 and stands. Dealer stands on 19.
    const game = scripted('8', '10', '8', '9', '3', '10', '7');
    game.deal();
    expect(game.canSplit).toBe(true);
    game.split();

    let s = game.snapshot();
    expect(s.hands).toHaveLength(2);
    expect(s.activeHand).toBe(0);
    expect(s.hands[0].hand.getValue()).toBe(11);
    expect(s.hands[1].hand.getSize()).toBe(1); // second card comes later
    expect(game.canDouble).toBe(true); // double after split
    expect(game.canSplit).toBe(false); // no re-splitting
    expect(game.canSurrender).toBe(false);

    game.doubleDown();
    s = game.snapshot();
    expect(s.activeHand).toBe(1);
    expect(s.hands[1].hand.getValue()).toBe(15);

    game.stand();
    game.playDealerOut();
    s = game.snapshot();
    expect(s.hands.map((h) => h.result)).toEqual(['player-win', 'player-loss']);
    expect(s.net).toBe(2 - 1);
  });

  it('gives split aces one card each, and a split 21 is not a blackjack', () => {
    // A-A vs 9 (hole) + 7 = 16. Hands: A-10 = 21, A-5 = 16. Dealer draws 2 → 18.
    const game = scripted('A', '9', 'A', '7', '10', '5', '2');
    game.deal();
    game.split();

    const dealerTurn = game.snapshot();
    expect(dealerTurn.phase).toBe('dealer');
    expect(dealerTurn.hands.map((h) => h.hand.getSize())).toEqual([2, 2]);

    game.playDealerOut();
    const s = game.snapshot();
    expect(s.hands.map((h) => h.result)).toEqual(['player-win', 'player-loss']);
    expect(s.net).toBe(0); // +1 (not +1.5) and −1
  });

  it('treats any two ten-value cards as a pair', () => {
    const game = scripted('K', '7', '10', '8');
    game.deal();
    expect(game.canSplit).toBe(true);
  });

  it('removes both hands from the no-count shoe', () => {
    const game = scripted('8', '10', '8', '9', '3');
    game.deal();
    game.split();
    // 8, 8, 3 on the player side plus the dealer's upcard.
    expect(total(game.freshShoeCounts())).toBe(6 * 52 - 4);
  });
});

describe('surrender', () => {
  it('forfeits half the bet and ends the hand without a dealer turn', () => {
    const game = scripted('10', '10', '6', '9');
    game.deal();
    expect(game.canSurrender).toBe(true);
    game.surrender();
    const s = game.snapshot();
    expect(s.phase).toBe('result');
    expect(s.hands[0].result).toBe('surrender');
    expect(s.net).toBe(-0.5);
  });

  it('is only offered on the opening two cards', () => {
    const game = scripted('10', '10', '2', '9', '3');
    game.deal();
    game.hit();
    expect(game.canSurrender).toBe(false);
  });
});

describe('insurance', () => {
  it('is offered before the dealer peeks under an Ace', () => {
    const game = scripted('10', '10', '9', 'A');
    game.deal();
    const s = game.snapshot();
    expect(s.phase).toBe('insurance');
    expect(s.dealerHoleHidden).toBe(true);
    expect(s.insurance).toEqual({ bet: 0.5, taken: null, evenMoney: false });
  });

  it('pays 2:1 when the dealer has blackjack, covering the main bet', () => {
    const game = scripted('10', '10', '9', 'A');
    game.deal();
    game.takeInsurance();
    const s = game.snapshot();
    expect(s.phase).toBe('result');
    expect(s.hands[0].result).toBe('dealer-blackjack');
    expect(s.net).toBe(0);
  });

  it('loses the side bet when the dealer has no blackjack, and play goes on', () => {
    // You 10-9 = 19, dealer 9 (hole) + A = soft 20.
    const game = scripted('10', '9', '9', 'A');
    game.deal();
    game.takeInsurance();
    expect(game.snapshot().phase).toBe('player');
    game.stand();
    game.playDealerOut();
    expect(game.snapshot().net).toBe(-1.5);
  });

  it('declining against a dealer blackjack loses the hand', () => {
    const game = scripted('10', '10', '9', 'A');
    game.deal();
    game.declineInsurance();
    expect(game.snapshot().net).toBe(-1);
  });

  it('offers even money on a blackjack: +1 either way when taken', () => {
    for (const hole of ['10', '9'] as Rank[]) {
      const game = scripted('A', hole, 'K', 'A');
      game.deal();
      expect(game.snapshot().insurance?.evenMoney).toBe(true);
      game.takeInsurance();
      expect(game.snapshot().net).toBe(1);
    }
  });

  it('declined even money pays 3:2 unless the dealer also has blackjack', () => {
    const noBlackjack = scripted('A', '9', 'K', 'A');
    noBlackjack.deal();
    noBlackjack.declineInsurance();
    expect(noBlackjack.snapshot().net).toBe(1.5);

    const blackjack = scripted('A', '10', 'K', 'A');
    blackjack.deal();
    blackjack.declineInsurance();
    expect(blackjack.snapshot().net).toBe(0);
  });
});
