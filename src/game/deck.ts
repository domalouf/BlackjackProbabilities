import { Card, Rank, Suit, getRankValue } from './card';

export class Deck {
  private cards: Card[] = [];
  private discardPile: Card[] = [];

  constructor() {
    this.reset();
  }

  private shuffle(): void {
    // Fisher-Yates shuffle
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  reset(): void {
    this.cards = [];
    this.discardPile = [];
    
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    for (const suit of suits) {
      for (const rank of ranks) {
        this.cards.push({ suit, rank });
      }
    }

    this.shuffle();
  }

  deal(): Card {
    // If less than 10 cards remaining, reshuffle discard pile
    if (this.cards.length < 10) {
      this.cards.push(...this.discardPile);
      this.discardPile = [];
      this.shuffle();
    }

    const card = this.cards.pop();
    if (!card) throw new Error('Deck is empty');
    return card;
  }

  discard(cards: Card[]): void {
    this.discardPile.push(...cards);
  }

  getCardsRemaining(): number {
    return this.cards.length;
  }
}
