import { Deck } from './deck';
import { Hand } from './hand';
import { GameResult, determineWinner } from './gameRules';

export type GamePhase = 'betting' | 'playing' | 'dealer-turn' | 'result';

export interface GameState {
  phase: GamePhase;
  balance: number;
  currentBet: number;
  playerHand: Hand;
  dealerHand: Hand;
  result: GameResult | null;
  deck: Deck;
}

export class BlackjackGame {
  private state: GameState;

  constructor(initialBalance: number = 1000) {
    this.state = {
      phase: 'betting',
      balance: initialBalance,
      currentBet: 0,
      playerHand: new Hand(),
      dealerHand: new Hand(),
      result: null,
      deck: new Deck(),
    };
  }

  getState(): GameState {
    return this.state;
  }

  placeBet(amount: number): void {
    if (this.state.phase !== 'betting') {
      throw new Error('Can only place bet during betting phase');
    }
    if (amount <= 0) {
      throw new Error('Bet must be positive');
    }
    if (amount > this.state.balance) {
      throw new Error('Insufficient balance');
    }
    this.state.currentBet = amount;
  }

  deal(): void {
    if (this.state.phase !== 'betting') {
      throw new Error('Can only deal during betting phase');
    }
    if (this.state.currentBet === 0) {
      throw new Error('Must place a bet first');
    }

    // Deduct bet from balance
    this.state.balance -= this.state.currentBet;

    // Clear hands
    this.state.playerHand.clear();
    this.state.dealerHand.clear();

    // Deal 2 cards to each
    this.state.playerHand.add(this.state.deck.deal());
    this.state.dealerHand.add(this.state.deck.deal());
    this.state.playerHand.add(this.state.deck.deal());
    this.state.dealerHand.add(this.state.deck.deal());

    // Move to playing phase
    this.state.phase = 'playing';
  }

  playerHit(): void {
    if (this.state.phase !== 'playing') {
      throw new Error('Can only hit during playing phase');
    }

    this.state.playerHand.add(this.state.deck.deal());

    if (this.state.playerHand.isBust()) {
      this.endHand();
    }
  }

  playerStand(): void {
    if (this.state.phase !== 'playing') {
      throw new Error('Can only stand during playing phase');
    }

    this.dealerTurn();
  }

  playerDoubleDown(): void {
    if (this.state.phase !== 'playing') {
      throw new Error('Can only double down during playing phase');
    }
    if (this.state.playerHand.getSize() !== 2) {
      throw new Error('Can only double down on first two cards');
    }
    if (this.state.currentBet > this.state.balance) {
      throw new Error('Insufficient balance to double down');
    }

    // Double the bet and deduct from balance
    this.state.currentBet *= 2;
    this.state.balance -= this.state.currentBet / 2;

    // Draw one card
    this.state.playerHand.add(this.state.deck.deal());

    // Move to dealer turn (auto-end)
    this.dealerTurn();
  }

  private dealerTurn(): void {
    this.state.phase = 'dealer-turn';

    // Dealer plays automatically
    const { shouldDealerHit } = require('./gameRules');
    while (shouldDealerHit(this.state.dealerHand)) {
      this.state.dealerHand.add(this.state.deck.deal());
    }

    this.endHand();
  }

  private endHand(): void {
    const result = determineWinner(this.state.playerHand, this.state.dealerHand);
    this.state.result = result;
    this.state.phase = 'result';

    // Calculate payout
    const { getPayoutMultiplier } = require('./gameRules');
    const payout = this.state.currentBet * getPayoutMultiplier(result);
    this.state.balance += payout;
  }

  playAgain(): void {
    if (this.state.phase !== 'result') {
      throw new Error('Can only play again after result');
    }

    this.state.phase = 'betting';
    this.state.currentBet = 0;
    this.state.result = null;
  }
}
