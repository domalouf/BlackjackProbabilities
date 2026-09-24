import { Hand } from './hand';

/**
 * House rules. The defaults are the Las Vegas 6-deck standard:
 * 6 decks, dealer hits soft 17, blackjack pays 3:2, double on any two cards,
 * double after split, late surrender, insurance offered against an Ace.
 *
 * Pairs may be split once (two hands, no re-splitting); split aces get one
 * card each, and a two-card 21 after a split pays 1:1, not 3:2.
 */
export interface HouseRules {
  decks: number;
  hitSoft17: boolean;
  blackjackPayout: number; // profit multiple on the stake (1.5 = 3:2)
  /** Double down allowed on a two-card hand formed by splitting. */
  doubleAfterSplit: boolean;
  /** Forfeit half the bet on the opening two cards, after the dealer peeks. */
  lateSurrender: boolean;
}

export const VEGAS_6_DECK: HouseRules = {
  decks: 6,
  hitSoft17: true,
  blackjackPayout: 1.5,
  doubleAfterSplit: true,
  lateSurrender: true,
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
  | 'dealer-blackjack'
  | 'surrender';

/**
 * Settle one player hand against the dealer's final hand. A hand formed by
 * splitting can't be a blackjack: a two-card 21 there is an ordinary 21.
 */
export function determineWinner(
  player: Hand,
  dealer: Hand,
  { fromSplit = false }: { fromSplit?: boolean } = {},
): GameResult {
  const playerBJ = !fromSplit && player.isBlackjack();
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
    case 'surrender':
      return bet / 2;
    case 'player-loss':
    case 'dealer-blackjack':
      return 0;
  }
}

/** Signed change to the player's bankroll for a hand (what the UI shows). */
export function netResult(result: GameResult, bet: number, rules: HouseRules): number {
  return settle(result, bet, rules) - bet;
}
