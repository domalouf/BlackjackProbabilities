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
    const dealer = dealerDistribution(dealerUpcards, shoe, dealerOpts);
    const stand = outcomeIfStand(next, dealer);
    shoe[bucket] += 1;
    pWin += p * stand.pWin;
    pPush += p * stand.pPush;
    pLoss += p * stand.pLoss;
  }
  return { pWin, pPush, pLoss, pBust };
}

export interface ActionEV {
  stand: StandOutcome;
  /** Win / push / loss / bust split from one hit, then standing. */
  hit: HitOutcome;
  /** EV of hitting, then continuing with best play. */
  hitEv: number;
  /** EV of doubling: one card, doubled stake, no further draws. */
  doubleEv: number;
  /** `null` until the engine is asked for a recommendation. */
  best: 'hit' | 'stand' | 'double' | null;
}

const MAX_PLAYER_DRAWS = 10;

/**
 * EV of standing *right now* on a partially known hand, recomputing the dealer
 * distribution against the supplied (depleted) shoe.
 */
function standEv(
  player: HandValue,
  shoe: ShoeCounts,
  dealerUpcards: Bucket[],
  dealerOpts: DealerOptions,
): number {
  if (player.total > 21) return -1;
  const dealer = dealerDistribution(dealerUpcards, shoe, dealerOpts);
  return outcomeIfStand(player, dealer).ev;
}

/**
 * EV of the player drawing one more card and then playing optimally
 * (hit-or-stand) from there. Doubles are not considered past the first move.
 */
function hitEv(
  player: HandValue,
  shoe: ShoeCounts,
  dealerUpcards: Bucket[],
  dealerOpts: DealerOptions,
  drawsLeft: number,
): number {
  const remaining = shoeSize(shoe);
  if (remaining === 0 || drawsLeft === 0) {
    return standEv(player, shoe, dealerUpcards, dealerOpts);
  }

  let ev = 0;
  for (let bucket = 1 as Bucket; bucket <= 10; bucket++) {
    const available = shoe[bucket];
    if (available === 0) continue;
    const p = available / remaining;
    const next = addCard(player, bucket);

    let branchEv: number;
    if (next.total > 21) {
      branchEv = -1;
    } else {
      shoe[bucket] -= 1;
      const evStand = standEv(next, shoe, dealerUpcards, dealerOpts);
      // Only bother recursing while another hit could still help.
      const evHit =
        next.total < 21
          ? hitEv(next, shoe, dealerUpcards, dealerOpts, drawsLeft - 1)
          : -Infinity;
      shoe[bucket] += 1;
      branchEv = Math.max(evStand, evHit);
    }
    ev += p * branchEv;
  }
  return ev;
}

/** EV of doubling down: exactly one card, then forced stand, stake doubled. */
function doubleEv(
  player: HandValue,
  shoe: ShoeCounts,
  dealerUpcards: Bucket[],
  dealerOpts: DealerOptions,
): number {
  const remaining = shoeSize(shoe);
  if (remaining === 0) return 2 * standEv(player, shoe, dealerUpcards, dealerOpts);

  let ev = 0;
  for (let bucket = 1 as Bucket; bucket <= 10; bucket++) {
    const available = shoe[bucket];
    if (available === 0) continue;
    const p = available / remaining;
    const next = addCard(player, bucket);
    if (next.total > 21) {
      ev += p * -2;
    } else {
      shoe[bucket] -= 1;
      ev += p * 2 * standEv(next, shoe, dealerUpcards, dealerOpts);
      shoe[bucket] += 1;
    }
  }
  return ev;
}

export interface AnalyseArgs {
  /** Player's hand as value buckets. */
  playerBuckets: Bucket[];
  /** Dealer's visible card(s) as value buckets — normally just the upcard. */
  dealerUpcards: Bucket[];
  /** Shoe counts after removing every card currently on the table. Not mutated. */
  shoe: ShoeCounts;
  dealerRules: DealerOptions;
  /** True only on the opening two cards (gates doubling). */
  canDouble: boolean;
}

/**
 * Full decision analysis for one player turn: stand split, bust-on-hit chance,
 * EV of every legal action, and the action that maximises EV.
 */
export function analysePlayerDecision(args: AnalyseArgs): {
  dealer: DealerDistribution;
  action: ActionEV;
  player: HandValue;
} {
  const { playerBuckets, dealerUpcards, shoe, dealerRules, canDouble } = args;
  const working = shoe.slice();
  let player: HandValue = { total: 0, softAces: 0 };
  for (const bucket of playerBuckets) player = addCard(player, bucket);

  const dealer = dealerDistribution(dealerUpcards, working, dealerRules);
  const stand = outcomeIfStand(player, dealer);
  const hit = outcomeIfHit(player, working, dealerUpcards, dealerRules);
  const hitEvValue = hitEv(
    player,
    working,
    dealerUpcards,
    dealerRules,
    MAX_PLAYER_DRAWS,
  );
  const dbl = canDouble
    ? doubleEv(player, working, dealerUpcards, dealerRules)
    : -Infinity;

  let best: 'hit' | 'stand' | 'double' =
    stand.ev >= hitEvValue ? 'stand' : 'hit';
  if (canDouble && dbl > Math.max(stand.ev, hitEvValue)) best = 'double';

  return {
    dealer,
    player,
    action: {
      stand,
      hit,
      hitEv: hitEvValue,
      doubleEv: canDouble ? dbl : Number.NaN,
      best,
    },
  };
}

export { isSoft };
