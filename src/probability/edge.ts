/**
 * The player's edge on the next hand: the exact expected value of a whole
 * round, before any card is dealt, for a player who then plays every decision
 * perfectly against the given shoe.
 *
 * It sums over every opening deal — the dealer's upcard and both player cards,
 * each weighted by its real probability from the shoe — and for each one takes
 * the best of stand, hit, double, split and surrender, plus insurance when it
 * pays. With a full shoe this is the game's house edge; as the shoe depletes it
 * moves with the count, which is the whole point of counting cards.
 *
 * This is ~500 opening deals, each a full decision analysis, so it runs off the
 * main thread (see `edge.worker.ts`). The per-upcard {@link PlayerEvaluator}
 * shares its cache across every deal with that upcard.
 */

import { Bucket, handValue, ShoeCounts, shoeSize } from './deckMath';
import { insuranceDecision } from './insurance';
import { PlayerEvaluator, SURRENDER_EV } from './player';

export interface RoundRules {
  hitSoft17: boolean;
  /** Profit multiple on a natural, 1.5 for 3:2. */
  blackjackPayout: number;
  doubleAfterSplit: boolean;
  lateSurrender: boolean;
}

/** Expected value of one round, in units of the initial bet. */
export function roundEv(shoe: ShoeCounts, rules: RoundRules): number {
  let ev = 0;
  for (let up = 1 as Bucket; up <= 10; up++) ev += upcardEv(shoe, up, rules);
  return ev;
}

/**
 * One dealer upcard's share of {@link roundEv}: the chance of that upcard
 * times the round's EV given it. The ten upcards are independent jobs, which
 * is how the worker pool splits the work.
 */
export function upcardEv(shoe: ShoeCounts, up: Bucket, rules: RoundRules): number {
  const work = shoe.slice();
  const pUp = draw(work, up);
  if (pUp === 0) return 0;
  const evaluator = new PlayerEvaluator([up], {
    hitSoft17: rules.hitSoft17,
    peeked: true,
  });

  let ev = 0;
  for (let c1 = 1 as Bucket; c1 <= 10; c1++) {
    const p1 = draw(work, c1);
    if (p1 === 0) continue;
    for (let c2 = 1 as Bucket; c2 <= 10; c2++) {
      const p2 = draw(work, c2);
      if (p2 === 0) continue;
      ev += p1 * p2 * handEv(up, c1, c2, work, evaluator, rules);
      work[c2] += 1;
    }
    work[c1] += 1;
  }
  return pUp * ev;
}

/**
 * Take one card of `bucket` out of `shoe` and return the probability of having
 * drawn it. Leaves the shoe untouched (and returns 0) if none are left; the
 * caller puts the card back.
 */
function draw(shoe: ShoeCounts, bucket: Bucket): number {
  const available = shoe[bucket];
  if (available === 0) return 0;
  const p = available / shoeSize(shoe);
  shoe[bucket] -= 1;
  return p;
}

/**
 * Value of one opening deal. `shoe` excludes the three visible cards; the hole
 * card is still in it, unknown.
 */
function handEv(
  up: Bucket,
  c1: Bucket,
  c2: Bucket,
  shoe: ShoeCounts,
  evaluator: PlayerEvaluator,
  rules: RoundRules,
): number {
  const remaining = shoeSize(shoe);
  // The dealer peeks under a ten or an Ace and settles a natural at once.
  const pDealerNatural =
    up === 1 ? shoe[10] / remaining : up === 10 ? shoe[1] / remaining : 0;
  const playerNatural = (c1 === 1 && c2 === 10) || (c1 === 10 && c2 === 1);

  if (playerNatural) {
    const decline = (1 - pDealerNatural) * rules.blackjackPayout;
    return up === 1 ? Math.max(decline, 1) : decline; // even money
  }

  const insurance =
    up === 1 ? Math.max(0, insuranceDecision(shoe, false, 0).takeEv) : 0;

  const player = handValue([c1, c2]);
  let best = evaluator.bestEv(player, shoe, true);
  if (rules.lateSurrender) best = Math.max(best, SURRENDER_EV);
  if (c1 === c2) {
    best = Math.max(
      best,
      evaluator.splitEv(c1, shoe, { doubleAfterSplit: rules.doubleAfterSplit }),
    );
  }

  return pDealerNatural * -1 + (1 - pDealerNatural) * best + insurance;
}
