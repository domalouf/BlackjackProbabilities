/**
 * Shared vocabulary for the exact-probability engine.
 *
 * The engine never looks at suits or face-card identity — only at the *value*
 * a card contributes. Every card is collapsed into one of ten buckets, indexed
 * by the low value:
 *
 *   bucket 1  → Ace          (counts as 11, or 1 when 11 would bust)
 *   bucket 2..9 → pip cards   (face value)
 *   bucket 10 → 10 / J / Q / K
 *
 * A shoe is therefore an 11-element array (index 0 unused) of "how many cards
 * of this bucket are left". Working in buckets shrinks the branching factor of
 * every recursion from 13 to 10 and makes the counts exact for a real shoe.
 */

export type Bucket = number; // 1..10

/** Remaining-card counts, indexed by {@link Bucket}. Index 0 is unused. */
export type ShoeCounts = number[];

/** Build a full, unplayed shoe of `decks` standard 52-card decks. */
export function makeShoe(decks: number): ShoeCounts {
  const counts = new Array<number>(11).fill(0);
  for (let bucket = 1; bucket <= 9; bucket++) counts[bucket] = 4 * decks;
  counts[10] = 16 * decks; // 10, J, Q, K
  return counts;
}

/** Total cards left in the shoe. */
export function shoeSize(counts: ShoeCounts): number {
  let total = 0;
  for (let bucket = 1; bucket <= 10; bucket++) total += counts[bucket];
  return total;
}

/**
 * Hi-Lo counting tag for a value {@link Bucket}:
 *   2–6  → +1  (low cards gone ⇒ shoe richer in tens/aces ⇒ good for the player)
 *   7–9  →  0  (neutral)
 *   10, A → −1
 */
export function hiLoValue(bucket: Bucket): number {
  if (bucket >= 2 && bucket <= 6) return 1;
  if (bucket === 10 || bucket === 1) return -1;
  return 0;
}

/** Map a rank label ('A', '7', 'K', …) to its {@link Bucket}. */
export function rankToBucket(rank: string): Bucket {
  if (rank === 'A') return 1;
  if (rank === 'K' || rank === 'Q' || rank === 'J' || rank === '10') return 10;
  return parseInt(rank, 10);
}

/**
 * Hand value tracked as a running total plus the number of aces still counted
 * as 11. This is the only representation that stays correct with several aces
 * in one hand (A-A-9 is a hard 21, A-A is a soft 12, …).
 */
export interface HandValue {
  /** Best total ≤ 21 when possible, otherwise the busted total. */
  total: number;
  /** Aces currently valued at 11. `> 0` ⇒ the hand is "soft". */
  softAces: number;
}

export const EMPTY_HAND: HandValue = { total: 0, softAces: 0 };

/** Fold one more card (given as a {@link Bucket}) into a running hand value. */
export function addCard(hand: HandValue, bucket: Bucket): HandValue {
  let total = hand.total + (bucket === 1 ? 11 : bucket);
  let softAces = hand.softAces + (bucket === 1 ? 1 : 0);
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces -= 1;
  }
  return { total, softAces };
}

/** Build a {@link HandValue} from a list of buckets. */
export function handValue(buckets: Bucket[]): HandValue {
  let hand = EMPTY_HAND;
  for (const bucket of buckets) hand = addCard(hand, bucket);
  return hand;
}

export const isSoft = (hand: HandValue): boolean => hand.softAces > 0;
export const isBust = (hand: HandValue): boolean => hand.total > 21;

/** A two-card 21 — the only hand that pays 3:2 and beats a drawn 21. */
export const isNaturalBlackjack = (buckets: Bucket[]): boolean =>
  buckets.length === 2 && handValue(buckets).total === 21;
