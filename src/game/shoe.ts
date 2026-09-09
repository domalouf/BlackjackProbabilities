import { Card, Rank, Suit } from './card';
import {
  hiLoValue,
  makeShoe,
  rankToBucket,
  ShoeCounts,
} from '../probability/deckMath';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K',
];

/**
 * A multi-deck shoe. Deals from the front; every dealt card is remembered so
 * the probability engine can be handed the *exact* remaining composition. The
 * shoe reshuffles when it runs past its penetration point (like a real casino
 * cut card), not mid-hand.
 */
export class Shoe {
  private cards: Card[] = [];
  private dealt: Card[] = [];
  private readonly reshuffleAt: number;
  /** Monotonic, never reset — every physical deal gets a unique id. */
  private nextDealId = 0;

  constructor(
    private readonly decks: number = 6,
    /** Fraction of the shoe dealt before the cut card triggers a reshuffle. */
    penetration: number = 0.75,
  ) {
    this.reshuffleAt = Math.floor(decks * 52 * (1 - penetration));
    this.reset();
  }

  /** Rebuild and shuffle the full shoe. */
  reset(): void {
    this.cards = [];
    this.dealt = [];
    for (let d = 0; d < this.decks; d++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) this.cards.push({ suit, rank });
      }
    }
    this.shuffle();
  }

  private shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /** True if the cut card has been reached — reshuffle before the next hand. */
  needsReshuffle(): boolean {
    return this.cards.length <= this.reshuffleAt;
  }

  deal(): Card {
    if (this.cards.length === 0) this.reset();
    const card = { ...this.cards.pop()!, id: this.nextDealId++ };
    this.dealt.push(card);
    return card;
  }

  cardsRemaining(): number {
    return this.cards.length;
  }

  /** Decks still to be dealt, e.g. 4.2 — the divisor for a Hi-Lo true count. */
  decksRemaining(): number {
    return this.cards.length / 52;
  }

  penetration(): number {
    return this.dealt.length / (this.decks * 52);
  }

  /** Every card dealt out of the shoe since the last shuffle, in deal order. */
  dealtCards(): Card[] {
    return [...this.dealt];
  }

  /**
   * Hi-Lo running count over *every* card dealt since the last shuffle — this
   * includes the dealer hole card, which the player cannot see yet. Callers
   * that want the count as a player would keep it must subtract any card that
   * is dealt but still face-down.
   */
  runningCount(): number {
    let count = 0;
    for (const card of this.dealt) count += hiLoValue(rankToBucket(card.rank));
    return count;
  }

  /**
   * Remaining-card counts by value bucket — the input the probability engine
   * needs. Optionally subtract cards that are on the table but not yet "seen"
   * as removed (e.g. the dealer hole card is physically gone from the shoe, so
   * it is *already* excluded here).
   */
  remainingCounts(): ShoeCounts {
    const counts = makeShoe(this.decks);
    for (const card of this.dealt) counts[rankToBucket(card.rank)] -= 1;
    return counts;
  }
}
