import { Card, Rank, Suit } from './card';
import { makeShoe, rankToBucket, ShoeCounts } from '../probability/deckMath';

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
    const card = this.cards.pop()!;
    this.dealt.push(card);
    return card;
  }

  cardsRemaining(): number {
    return this.cards.length;
  }

  penetration(): number {
    return this.dealt.length / (this.decks * 52);
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
