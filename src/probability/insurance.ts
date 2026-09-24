/**
 * Insurance and even money, offered when the dealer shows an Ace.
 *
 * Insurance is a side bet of half the main bet that pays 2:1 if the dealer's
 * hole card is a ten. It wins exactly when the dealer has blackjack, so its
 * value comes down to one number: the share of tens among the cards the hole
 * card could be. It breaks even at 1 in 3 — a full 6-deck shoe holds about
 * 31%, which is why basic strategy never insures, and why a counter does once
 * enough low cards have gone.
 *
 * With a blackjack of your own the same bet is offered as "even money": take
 * a guaranteed 1:1 now instead of 3:2 that pushes if the dealer also has one.
 */

import { ShoeCounts, shoeSize } from './deckMath';

export interface InsuranceDecision {
  /** Chance the hole card is a ten, i.e. the dealer has blackjack. */
  pDealerBlackjack: number;
  /** True when the player holds a natural, so the offer is even money. */
  evenMoney: boolean;
  /**
   * EV of taking the offer, in main-bet units. For insurance this is the side
   * bet alone; for even money it is the whole hand (always +1).
   */
  takeEv: number;
  /** EV of declining, on the same basis (0 for insurance). */
  declineEv: number;
  best: 'take' | 'decline';
}

/**
 * @param shoe  Every card the hole card could be: the shoe as the player knows
 *              it, with the hole card still counted as unknown.
 * @param playerBlackjack  The player holds a natural (even money).
 * @param blackjackPayout  Profit multiple on a natural, 1.5 for 3:2.
 */
export function insuranceDecision(
  shoe: ShoeCounts,
  playerBlackjack: boolean,
  blackjackPayout: number,
): InsuranceDecision {
  const remaining = shoeSize(shoe);
  const p = remaining > 0 ? shoe[10] / remaining : 0;

  const takeEv = playerBlackjack ? 1 : 0.5 * (2 * p - (1 - p));
  const declineEv = playerBlackjack ? (1 - p) * blackjackPayout : 0;

  return {
    pDealerBlackjack: p,
    evenMoney: playerBlackjack,
    takeEv,
    declineEv,
    best: takeEv > declineEv ? 'take' : 'decline',
  };
}
