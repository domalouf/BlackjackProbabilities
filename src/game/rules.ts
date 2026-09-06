import { Hand } from './hand';

/**
 * House rules. The defaults are the Las Vegas 6-deck standard:
 * 6 decks, dealer hits soft 17, blackjack pays 3:2, double on any two cards.
 */
export interface HouseRules {
  decks: number;
  hitSoft17: boolean;
  blackjackPayout: number; // profit multiple on the stake (1.5 = 3:2)
}

export const VEGAS_6_DECK: HouseRules = {
  decks: 6,
  hitSoft17: true,
  blackjackPayout: 1.5,
};

export function shouldDealerHit(dealer: Hand, rules: HouseRules): boolean {
  const total = dealer.getValue();
  if (total < 17) return true;
  if (total === 17 && dealer.isSoft() && rules.hitSoft17) return true;
  return false;
}

export type GameResult =
  | 'player-win'
  | 'player-loss'
  | 'push'
  | 'player-blackjack'
  | 'dealer-blackjack';

export function determineWinner(player: Hand, dealer: Hand): GameResult {
  const playerBJ = player.isBlackjack();
  const dealerBJ = dealer.isBlackjack();

  if (playerBJ && dealerBJ) return 'push';
  if (playerBJ) return 'player-blackjack';
  if (dealerBJ) return 'dealer-blackjack';
  if (player.isBust()) return 'player-loss';
  if (dealer.isBust()) return 'player-win';

  const p = player.getValue();
  const d = dealer.getValue();
  if (p > d) return 'player-win';
  if (p < d) return 'player-loss';
  return 'push';
}

/** Total returned to the player's balance (stake + winnings), given `bet`. */
export function settle(result: GameResult, bet: number, rules: HouseRules): number {
  switch (result) {
    case 'player-blackjack':
      return bet * (1 + rules.blackjackPayout);
    case 'player-win':
      return bet * 2;
    case 'push':
      return bet;
    case 'player-loss':
    case 'dealer-blackjack':
      return 0;
  }
}

/** Signed change to the player's bankroll for a hand (what the UI shows). */
export function netResult(result: GameResult, bet: number, rules: HouseRules): number {
  return settle(result, bet, rules) - bet;
}
