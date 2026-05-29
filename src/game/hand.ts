import { Card, getRankValue } from './card';

export class Hand {
  private cards: Card[] = [];

  add(card: Card): void {
    this.cards.push(card);
  }

  getCards(): Card[] {
    return [...this.cards];
  }

  clear(): void {
    this.cards = [];
  }

  getValue(): number {
    let value = 0;
    let aces = 0;

    // Calculate value with all aces as 11
    for (const card of this.cards) {
      const cardValue = getRankValue(card.rank);
      if (card.rank === 'A') {
        aces++;
      }
      value += cardValue;
    }

    // If bust, convert aces from 11 to 1 until no longer bust or out of aces
    while (value > 21 && aces > 0) {
      value -= 10; // Convert one ace from 11 to 1
      aces--;
    }

    return value;
  }

  isBlackjack(): boolean {
    if (this.cards.length !== 2) return false;
    const value = this.getValue();
    return value === 21;
  }

  isBust(): boolean {
    return this.getValue() > 21;
  }

  getSize(): number {
    return this.cards.length;
  }
}
