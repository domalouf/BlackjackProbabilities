/**
 * Exact probability distribution of the dealer's final hand.
 *
 * Given the dealer's visible card(s) and the exact composition of the shoe,
 * this enumerates *every* sequence of cards the dealer could draw under the
 * house rules, weighting each draw by its true hypergeometric probability
 * (card counts go down as cards come out — no "infinite deck" shortcut).
 *
 * The dealer's policy is fixed: stand on 17+ , and either stand or hit on a
 * soft 17 depending on {@link DealerRules.hitSoft17}. Because the dealer never
 * takes a decision that depends on the player, the whole distribution can be
 * computed once per decision point.
 */

import {
  addCard,
  Bucket,
  HandValue,
  handValue,
  isSoft,
  ShoeCounts,
  shoeSize,
} from './deckMath';

export interface DealerRules {
  /** Dealer draws to a soft 17 (H17, the Vegas 6-deck standard). */
  hitSoft17: boolean;
}

/**
 * Probability mass over the dealer's final total. The six fields are mutually
 * exclusive and sum to 1 (subject to floating-point rounding).
 */
export interface DealerDistribution {
  p17: number;
  p18: number;
  p19: number;
  p20: number;
  /** A *drawn* 21 (three or more cards). Loses to a natural, ties a stood 21. */
  p21: number;
  /** Two-card 21 off the visible card. Only possible from a single A or 10. */
  pBlackjack: number;
  pBust: number;
}

const ZERO: DealerDistribution = {
  p17: 0,
  p18: 0,
  p19: 0,
  p20: 0,
  p21: 0,
  pBlackjack: 0,
  pBust: 0,
};

/** Probability the dealer's final total lands on `target` (17–21) or busts. */
export function chanceDealerReaches(
  dist: DealerDistribution,
  target: 17 | 18 | 19 | 20 | 21,
): number {
  switch (target) {
    case 17:
      return dist.p17;
    case 18:
      return dist.p18;
    case 19:
      return dist.p19;
    case 20:
      return dist.p20;
    case 21:
      return dist.p21 + dist.pBlackjack;
  }
}

function accumulate(
  hand: HandValue,
  shoe: ShoeCounts,
  weight: number,
  rules: DealerRules,
  out: DealerDistribution,
): void {
  if (hand.total > 21) {
    out.pBust += weight;
    return;
  }

  const standsPat = hand.total >= 18 || hand.total === 17;
  const hitsThisSoft17 =
    hand.total === 17 && isSoft(hand) && rules.hitSoft17;

  if (standsPat && !hitsThisSoft17) {
    // Dealer stands. Bucket by final total.
    switch (hand.total) {
      case 17:
        out.p17 += weight;
        break;
      case 18:
        out.p18 += weight;
        break;
      case 19:
        out.p19 += weight;
        break;
      case 20:
        out.p20 += weight;
        break;
      default:
        out.p21 += weight; // 21 reached by drawing
    }
    return;
  }

  // Dealer must draw. Branch over every card still in the shoe.
  const remaining = shoeSize(shoe);
  if (remaining === 0) {
    // Shoe exhausted mid-hand — treat the standing total as final. In a real
    // game the reshuffle happens between hands, so this branch is defensive.
    out.p17 += weight;
    return;
  }

  for (let bucket = 1 as Bucket; bucket <= 10; bucket++) {
    const available = shoe[bucket];
    if (available === 0) continue;
    const p = available / remaining;
    shoe[bucket] -= 1;
    accumulate(addCard(hand, bucket), shoe, weight * p, rules, out);
    shoe[bucket] += 1; // restore for the sibling branches
  }
}

export interface DealerOptions extends DealerRules {
  /**
   * Remove the "dealer already has a natural blackjack" branch and renormalise.
   * Use this once the dealer has peeked (US rules): at every player decision the
   * dealer is known *not* to hold a two-card 21, which shifts every downstream
   * probability. Defaults to `true`.
   */
  peeked?: boolean;
}

/**
 * Enumerate the dealer's outcomes.
 *
 * @param upcards  Value buckets of the dealer's *known* cards. Usually a single
 *                 upcard; pass both when the hole card is revealed.
 * @param shoe     Card counts *after* removing every card already on the table.
 *                 Not mutated.
 */
export function dealerDistribution(
  upcards: Bucket[],
  shoe: ShoeCounts,
  options: DealerOptions,
): DealerDistribution {
  const out: DealerDistribution = { ...ZERO };
  const working = shoe.slice();
  const start = handValue(upcards);

  if (upcards.length === 1) {
    // Split the first drawn card out so we can label a two-card 21 as a natural.
    const remaining = shoeSize(working);
    for (let bucket = 1 as Bucket; bucket <= 10; bucket++) {
      const available = working[bucket];
      if (available === 0) continue;
      const p = available / remaining;
      const next = addCard(start, bucket);
      working[bucket] -= 1;
      if (next.total === 21) {
        out.pBlackjack += p;
      } else {
        accumulate(next, working, p, options, out);
      }
      working[bucket] += 1;
    }
  } else {
    if (start.total === 21) {
      out.pBlackjack = 1;
    } else {
      accumulate(start, working, 1, options, out);
    }
  }

  if (options.peeked ?? true) {
    const natural = out.pBlackjack;
    if (natural > 0 && natural < 1) {
      const scale = 1 / (1 - natural);
      out.p17 *= scale;
      out.p18 *= scale;
      out.p19 *= scale;
      out.p20 *= scale;
      out.p21 *= scale;
      out.pBust *= scale;
      out.pBlackjack = 0;
    }
  }

  return out;
}
