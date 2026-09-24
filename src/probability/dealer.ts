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

import { addCard, Bucket, handValue, ShoeCounts, shoeSize } from './deckMath';

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

/**
 * Solves the dealer's draw against one shoe. Outcomes live in a flat buffer, six
 * slots per state in a fixed order (17, 18, 19, 20, drawn 21, bust); the first
 * six states are the terminal ones. Everything in the hot loop is a plain
 * number — this runs hundreds of thousands of times when the player's own
 * draws and splits are enumerated, so it avoids allocating.
 */
class DealerSolver {
  private readonly shoe: number[];
  private remaining: number;
  private readonly hitSoft17: boolean;
  /** Dealer-drawn multiset → offset of that state's outcomes in `pool`. */
  private readonly memo = new Map<number, number>();
  private pool = new Float64Array(6 * 512);
  private used = 6 * 6;

  constructor(shoe: ShoeCounts, rules: DealerRules) {
    this.shoe = shoe.slice();
    this.remaining = shoeSize(shoe);
    this.hitSoft17 = rules.hitSoft17;
    // Terminal states: stand on 17..21 at offsets 0..24, bust at 30.
    for (let i = 0; i < 6; i++) this.pool[i * 7] = 1;
  }

  /** Offset of the terminal "stands on `total`" state (17–21). */
  private static standOffset(total: number): number {
    return (total - 17) * 6;
  }

  private static readonly BUST = 30;

  /**
   * Offset of the outcome distribution from a dealer hand of `total` with
   * `softAces` aces still counted as 11, where `drawn` keys the multiset of
   * cards drawn so far (one base-32 digit per bucket). Within one shoe that
   * multiset alone fixes both the dealer's total and the cards left, so
   * drawing 2 then 5 reaches the same state as 5 then 2 and is solved once.
   */
  solve(total: number, softAces: number, drawn: number): number {
    if (total > 21) return DealerSolver.BUST;
    if (total >= 17 && !(total === 17 && softAces > 0 && this.hitSoft17)) {
      return DealerSolver.standOffset(total);
    }
    if (this.remaining === 0) {
      // Shoe exhausted mid-hand — treat the standing total as final. In a
      // real game the reshuffle happens between hands, so this is defensive.
      return DealerSolver.standOffset(17);
    }

    const cached = this.memo.get(drawn);
    if (cached !== undefined) return cached;

    const shoe = this.shoe;
    const remaining = this.remaining;
    let o17 = 0, o18 = 0, o19 = 0, o20 = 0, o21 = 0, oBust = 0;
    for (let bucket = 1; bucket <= 10; bucket++) {
      const available = shoe[bucket];
      if (available === 0) continue;
      const p = available / remaining;

      let nextTotal = total + (bucket === 1 ? 11 : bucket);
      let nextSoft = softAces + (bucket === 1 ? 1 : 0);
      while (nextTotal > 21 && nextSoft > 0) {
        nextTotal -= 10;
        nextSoft -= 1;
      }

      shoe[bucket] -= 1;
      this.remaining -= 1;
      const at = this.solve(nextTotal, nextSoft, drawn + DIGIT[bucket]);
      shoe[bucket] += 1; // restore for the sibling branches
      this.remaining += 1;

      const pool = this.pool; // re-read: solve() may have grown it
      o17 += p * pool[at];
      o18 += p * pool[at + 1];
      o19 += p * pool[at + 2];
      o20 += p * pool[at + 3];
      o21 += p * pool[at + 4];
      oBust += p * pool[at + 5];
    }

    const at = this.alloc();
    const pool = this.pool;
    pool[at] = o17;
    pool[at + 1] = o18;
    pool[at + 2] = o19;
    pool[at + 3] = o20;
    pool[at + 4] = o21;
    pool[at + 5] = oBust;
    this.memo.set(drawn, at);
    return at;
  }

  /** Add `weight` × the outcomes at `at` into `out`. */
  addTo(out: DealerDistribution, at: number, weight: number): void {
    const pool = this.pool;
    out.p17 += weight * pool[at];
    out.p18 += weight * pool[at + 1];
    out.p19 += weight * pool[at + 2];
    out.p20 += weight * pool[at + 3];
    out.p21 += weight * pool[at + 4];
    out.pBust += weight * pool[at + 5];
  }

  /** Take `bucket` out of the shoe (for the first card, dealt by the caller). */
  remove(bucket: Bucket): void {
    this.shoe[bucket] -= 1;
    this.remaining -= 1;
  }

  restore(bucket: Bucket): void {
    this.shoe[bucket] += 1;
    this.remaining += 1;
  }

  private alloc(): number {
    if (this.used + 6 > this.pool.length) {
      const grown = new Float64Array(this.pool.length * 2);
      grown.set(this.pool);
      this.pool = grown;
    }
    const at = this.used;
    this.used += 6;
    return at;
  }
}

/** Base-32 digit per bucket for {@link DealerSolver.solve}'s multiset key. */
const DIGIT = Array.from({ length: 11 }, (_, bucket) => 32 ** bucket);

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
  const start = handValue(upcards);
  const solver = new DealerSolver(shoe, options);

  if (upcards.length === 1) {
    // Split the first drawn card out so we can label a two-card 21 as a natural.
    const remaining = shoeSize(shoe);
    for (let bucket = 1 as Bucket; bucket <= 10; bucket++) {
      const available = shoe[bucket];
      if (available === 0) continue;
      const p = available / remaining;
      const next = addCard(start, bucket);
      if (next.total === 21) {
        out.pBlackjack += p;
        continue;
      }
      solver.remove(bucket);
      solver.addTo(out, solver.solve(next.total, next.softAces, DIGIT[bucket]), p);
      solver.restore(bucket);
    }
  } else if (start.total === 21) {
    out.pBlackjack = 1;
  } else {
    solver.addTo(out, solver.solve(start.total, start.softAces, 0), 1);
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
