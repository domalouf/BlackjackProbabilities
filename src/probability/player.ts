/**
 * Turn the dealer distribution into the numbers a player actually cares about:
 * the chance of winning the hand right now, the chance of busting on the next
 * card, and the expected value of each legal action.
 *
 * Expected value is expressed in *bet units*: +1 means "win your stake", -1
 * means "lose it", +1.5 is a natural blackjack. A push is 0.
 */

import {
  dealerDistribution,
  DealerOptions,
  DealerDistribution,
} from './dealer';
import {
  addCard,
  Bucket,
  EMPTY_HAND,
  HandValue,
  isBust,
  isSoft,
  ShoeCounts,
  shoeSize,
} from './deckMath';

export interface StandOutcome {
  pWin: number;
  pPush: number;
  pLoss: number;
  /** Net expected bet units from standing on this hand. */
  ev: number;
}

/**
 * Win / push / loss split if the player stands on `player` and the dealer then
 * plays out `dealer`.
 */
export function outcomeIfStand(
  player: HandValue,
  dealer: DealerDistribution,
): StandOutcome {
  if (player.total > 21) {
    return { pWin: 0, pPush: 0, pLoss: 1, ev: -1 };
  }

  const dealerBeats =
    (player.total < 17 ? dealer.p17 : 0) +
    (player.total < 18 ? dealer.p18 : 0) +
    (player.total < 19 ? dealer.p19 : 0) +
    (player.total < 20 ? dealer.p20 : 0) +
    (player.total < 21 ? dealer.p21 + dealer.pBlackjack : 0);

  const dealerTies =
    (player.total === 17 ? dealer.p17 : 0) +
    (player.total === 18 ? dealer.p18 : 0) +
    (player.total === 19 ? dealer.p19 : 0) +
    (player.total === 20 ? dealer.p20 : 0) +
    (player.total === 21 ? dealer.p21 + dealer.pBlackjack : 0);

  const pLoss = dealerBeats;
  const pPush = dealerTies;
  const pWin = Math.max(0, 1 - pLoss - pPush);

  return { pWin, pPush, pLoss, ev: pWin - pLoss };
}

/** Probability the next single card busts a hand of value `player`. */
export function bustChanceOnHit(player: HandValue, shoe: ShoeCounts): number {
  const remaining = shoeSize(shoe);
  if (remaining === 0) return 0;
  let bustCards = 0;
  for (let bucket = 1 as Bucket; bucket <= 10; bucket++) {
    if (shoe[bucket] === 0) continue;
    if (isBust(addCard(player, bucket))) bustCards += shoe[bucket];
  }
  return bustCards / remaining;
}

export interface HitOutcome {
  pWin: number;
  pPush: number;
  pLoss: number;
  pBust: number;
}

/**
 * Win / push / loss / bust split from drawing exactly one more card and then
 * standing. Each non-bust branch recomputes the dealer distribution against
 * the shoe with that card removed, so it stays exact.
 */
export function outcomeIfHit(
  player: HandValue,
  shoe: ShoeCounts,
  dealerUpcards: Bucket[],
  dealerOpts: DealerOptions,
  evaluator: PlayerEvaluator = new PlayerEvaluator(dealerUpcards, dealerOpts),
): HitOutcome {
  const remaining = shoeSize(shoe);
  if (remaining === 0) return { pWin: 0, pPush: 0, pLoss: 0, pBust: 1 };

  let pWin = 0;
  let pPush = 0;
  let pLoss = 0;
  let pBust = 0;
  for (let bucket = 1 as Bucket; bucket <= 10; bucket++) {
    const available = shoe[bucket];
    if (available === 0) continue;
    const p = available / remaining;
    const next = addCard(player, bucket);
    if (next.total > 21) {
      pBust += p;
      continue;
    }
    shoe[bucket] -= 1;
    const stand = outcomeIfStand(next, evaluator.dealer(shoe));
    shoe[bucket] += 1;
    pWin += p * stand.pWin;
    pPush += p * stand.pPush;
    pLoss += p * stand.pLoss;
  }
  return { pWin, pPush, pLoss, pBust };
}

export type PlayerAction = 'hit' | 'stand' | 'double' | 'split' | 'surrender';

export interface ActionEV {
  stand: StandOutcome;
  /** Win / push / loss / bust split from one hit, then standing. */
  hit: HitOutcome;
  /** EV of hitting, then continuing with best play. */
  hitEv: number;
  /** EV of doubling: one card, doubled stake, no further draws. NaN if not allowed. */
  doubleEv: number;
  /**
   * EV of splitting the pair, summed over both hands and expressed in units of
   * the original bet. NaN when the hand is not a splittable pair.
   */
  splitEv: number;
  /** Late surrender forfeits half the bet: always −0.5, NaN if not allowed. */
  surrenderEv: number;
  /** `null` until the engine is asked for a recommendation. */
  best: PlayerAction | null;
}

export interface SplitRules {
  /** Double down allowed on a two-card hand formed by splitting. */
  doubleAfterSplit: boolean;
}

/** Late surrender gives back half the stake. */
export const SURRENDER_EV = -0.5;

const shoeKey = (shoe: ShoeCounts): string => shoe.join(',');

/**
 * Memoised EV calculator for one dealer upcard.
 *
 * Every figure depends only on the player's hand value and the exact cards
 * left in the shoe, so both the dealer distribution and the value of hitting
 * are cached on that pair. Drawing a 2 then a 3 reaches the same state as a 3
 * then a 2; the cache turns the exponential game tree into a walk over
 * distinct states, which is what makes split EVs and whole-round edges cheap
 * enough to compute live.
 *
 * Shoes passed in are borrowed: they are mutated during recursion and always
 * restored before returning.
 */
export class PlayerEvaluator {
  private readonly dealerCache = new Map<string, DealerDistribution>();
  private readonly hitCache = new Map<string, number>();

  constructor(
    private readonly dealerUpcards: Bucket[],
    private readonly dealerOpts: DealerOptions,
  ) {}

  /** Dealer's final-hand distribution against this exact shoe. */
  dealer(shoe: ShoeCounts): DealerDistribution {
    const key = shoeKey(shoe);
    let dist = this.dealerCache.get(key);
    if (!dist) {
      dist = dealerDistribution(this.dealerUpcards, shoe, this.dealerOpts);
      this.dealerCache.set(key, dist);
    }
    return dist;
  }

  /** EV of standing *right now*. */
  standEv(player: HandValue, shoe: ShoeCounts): number {
    if (player.total > 21) return -1;
    return outcomeIfStand(player, this.dealer(shoe)).ev;
  }

  /**
   * EV of drawing one more card and then playing optimally (hit-or-stand)
   * from there. Doubles are not considered past the first move.
   */
  hitEv(player: HandValue, shoe: ShoeCounts): number {
    const remaining = shoeSize(shoe);
    if (remaining === 0) return this.standEv(player, shoe);

    const key = `${player.total}/${player.softAces}|${shoeKey(shoe)}`;
    const cached = this.hitCache.get(key);
    if (cached !== undefined) return cached;

    let ev = 0;
    for (let bucket = 1 as Bucket; bucket <= 10; bucket++) {
      const available = shoe[bucket];
      if (available === 0) continue;
      const p = available / remaining;
      const next = addCard(player, bucket);
      if (next.total > 21) {
        ev -= p;
        continue;
      }
      shoe[bucket] -= 1;
      const evStand = this.standEv(next, shoe);
      // Only bother recursing while another hit could still help.
      const evHit = next.total < 21 ? this.hitEv(next, shoe) : -Infinity;
      shoe[bucket] += 1;
      ev += p * Math.max(evStand, evHit);
    }
    this.hitCache.set(key, ev);
    return ev;
  }

  /** EV of doubling down: exactly one card, then forced stand, stake doubled. */
  doubleEv(player: HandValue, shoe: ShoeCounts): number {
    const remaining = shoeSize(shoe);
    if (remaining === 0) return 2 * this.standEv(player, shoe);

    let ev = 0;
    for (let bucket = 1 as Bucket; bucket <= 10; bucket++) {
      const available = shoe[bucket];
      if (available === 0) continue;
      const p = available / remaining;
      const next = addCard(player, bucket);
      if (next.total > 21) {
        ev -= 2 * p;
      } else {
        shoe[bucket] -= 1;
        ev += p * 2 * this.standEv(next, shoe);
        shoe[bucket] += 1;
      }
    }
    return ev;
  }

  /** Best of stand / hit (/ double, when allowed) for a hand. */
  bestEv(player: HandValue, shoe: ShoeCounts, canDouble: boolean): number {
    const evStand = this.standEv(player, shoe);
    if (player.total >= 21) return evStand;
    const evHit = this.hitEv(player, shoe);
    const evDouble = canDouble ? this.doubleEv(player, shoe) : -Infinity;
    return Math.max(evStand, evHit, evDouble);
  }

  /**
   * EV of splitting a pair of `pair`, over both hands, in units of the
   * original bet. `shoe` must already exclude both pair cards.
   *
   * Each hand starts from one pair card, takes a second card from the shoe and
   * is then played optimally. Split aces get one card each and must stand, and
   * a two-card 21 after a split is paid as an ordinary 21, not a blackjack. No
   * re-splitting.
   *
   * The two hands are valued as two copies of the same one-hand problem. That
   * is exact for the first hand; for the second it ignores which cards the
   * first hand happened to draw — the standard treatment in combinatorial
   * analysers, accurate to a few thousandths of a bet.
   */
  splitEv(pair: Bucket, shoe: ShoeCounts, rules: SplitRules): number {
    const remaining = shoeSize(shoe);
    if (remaining === 0) return Number.NaN;

    const start = addCard(EMPTY_HAND, pair);
    let single = 0;
    for (let bucket = 1 as Bucket; bucket <= 10; bucket++) {
      const available = shoe[bucket];
      if (available === 0) continue;
      const p = available / remaining;
      const hand = addCard(start, bucket);
      shoe[bucket] -= 1;
      single +=
        p *
        (pair === 1
          ? this.standEv(hand, shoe)
          : this.bestEv(hand, shoe, rules.doubleAfterSplit));
      shoe[bucket] += 1;
    }
    return 2 * single;
  }
}

export interface AnalyseArgs {
  /** Player's hand as value buckets. */
  playerBuckets: Bucket[];
  /** Dealer's visible card(s) as value buckets — normally just the upcard. */
  dealerUpcards: Bucket[];
  /** Shoe counts after removing every card currently on the table. Not mutated. */
  shoe: ShoeCounts;
  dealerRules: DealerOptions;
  /** True only on a two-card hand where doubling is allowed. */
  canDouble: boolean;
  /** True on an opening pair (both cards the same value) that may be split. */
  canSplit?: boolean;
  /** True on the opening two cards when late surrender is offered. */
  canSurrender?: boolean;
  splitRules?: SplitRules;
}

const DEFAULT_SPLIT_RULES: SplitRules = { doubleAfterSplit: true };

/**
 * Full decision analysis for one player turn: stand split, bust-on-hit chance,
 * EV of every legal action, and the action that maximises EV.
 */
export function analysePlayerDecision(args: AnalyseArgs): {
  dealer: DealerDistribution;
  action: ActionEV;
  player: HandValue;
} {
  const {
    playerBuckets,
    dealerUpcards,
    shoe,
    dealerRules,
    canDouble,
    canSplit = false,
    canSurrender = false,
    splitRules = DEFAULT_SPLIT_RULES,
  } = args;
  const working = shoe.slice();
  let player: HandValue = { total: 0, softAces: 0 };
  for (const bucket of playerBuckets) player = addCard(player, bucket);

  const evaluator = new PlayerEvaluator(dealerUpcards, dealerRules);
  const dealer = evaluator.dealer(working);
  const stand = outcomeIfStand(player, dealer);
  const hit = outcomeIfHit(player, working, dealerUpcards, dealerRules, evaluator);
  const hitEvValue = evaluator.hitEv(player, working);
  const dbl = canDouble ? evaluator.doubleEv(player, working) : Number.NaN;
  const split =
    canSplit && playerBuckets.length === 2 && playerBuckets[0] === playerBuckets[1]
      ? evaluator.splitEv(playerBuckets[0], working, splitRules)
      : Number.NaN;
  const surrender = canSurrender ? SURRENDER_EV : Number.NaN;

  // Ties go to the simpler play: stand, then hit, double, split, surrender.
  let best: PlayerAction = stand.ev >= hitEvValue ? 'stand' : 'hit';
  let bestEv = Math.max(stand.ev, hitEvValue);
  for (const [action, value] of [
    ['double', dbl],
    ['split', split],
    ['surrender', surrender],
  ] as const) {
    if (value > bestEv) {
      best = action;
      bestEv = value;
    }
  }

  return {
    dealer,
    player,
    action: {
      stand,
      hit,
      hitEv: hitEvValue,
      doubleEv: dbl,
      splitEv: split,
      surrenderEv: surrender,
      best,
    },
  };
}

export { isSoft };
