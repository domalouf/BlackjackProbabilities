import { Card } from './card';
import {
  addCard,
  Bucket,
  handValue,
  HandValue,
  rankToBucket,
} from '../probability/deckMath';

/** A mutable hand of real cards, with blackjack-correct value logic. */
export class Hand {
  private cards: Card[] = [];

  add(card: Card): void {
    this.cards.push(card);
  }

  clear(): void {
    this.cards = [];
  }

  getCards(): Card[] {
    return [...this.cards];
  }

  getSize(): number {
    return this.cards.length;
  }

  /** Value buckets (1–10) for the probability engine. */
  buckets(): Bucket[] {
    return this.cards.map((c) => rankToBucket(c.rank));
  }

  value(): HandValue {
    return handValue(this.buckets());
  }

  getValue(): number {
    return this.value().total;
  }

  /** True when an Ace is still counted as 11 (a "soft" hand). */
  isSoft(): boolean {
    return this.value().softAces > 0;
  }

  isBlackjack(): boolean {
    return this.cards.length === 2 && this.getValue() === 21;
  }

  isBust(): boolean {
    return this.getValue() > 21;
  }

  /** Value the hand *would* have with one more bucket added — no mutation. */
  peekValue(bucket: Bucket): HandValue {
    return addCard(this.value(), bucket);
  }
}
