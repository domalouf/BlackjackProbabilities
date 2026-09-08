import { Card } from './card';
import { Hand } from './hand';
import {
  determineWinner,
  GameResult,
  HouseRules,
  shouldDealerHit,
  VEGAS_6_DECK,
} from './rules';
import { Shoe } from './shoe';
import {
  Bucket,
  hiLoValue,
  makeShoe,
  rankToBucket,
  ShoeCounts,
} from '../probability/deckMath';

export type GamePhase = 'betting' | 'player' | 'dealer' | 'result';

/** Hi-Lo card count as a player at the table could keep it. */
export interface CardCount {
  /** Running count over every card the player has seen face-up this shoe. */
  running: number;
  /** Running count divided by decks remaining. */
  true: number;
  /** Decks still undealt in the shoe. */
  decksRemaining: number;
  /** Face-up cards seen since the last shuffle. */
  seen: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  bet: number;
  /** True once the bet has been doubled this hand. */
  doubled: boolean;
  player: Hand;
  dealer: Hand;
  /** Hide the dealer's hole card in the UI while the player is deciding. */
  dealerHoleHidden: boolean;
  result: GameResult | null;
  rules: HouseRules;
  count: CardCount;
  shoePenetration: number;
  reshuffledLastDeal: boolean;
}

/** Every hand is played for a fixed 1-unit bet; doubling down raises it to 2. */
const BASE_BET = 1;

export class BlackjackGame {
  private phase: GamePhase = 'betting';
  private bet = BASE_BET;
  private doubled = false;
  private player = new Hand();
  private dealer = new Hand();
  private result: GameResult | null = null;
  private shoe: Shoe;
  private reshuffledLastDeal = false;

  constructor(private readonly rules: HouseRules = VEGAS_6_DECK) {
    this.shoe = new Shoe(rules.decks);
  }

  snapshot(): GameSnapshot {
    return {
      phase: this.phase,
      bet: this.bet,
      doubled: this.doubled,
      player: this.player,
      dealer: this.dealer,
      dealerHoleHidden: this.dealerHoleHidden(),
      result: this.result,
      rules: this.rules,
      count: this.cardCount(),
      shoePenetration: this.shoe.penetration(),
      reshuffledLastDeal: this.reshuffledLastDeal,
    };
  }

  // --- Betting -------------------------------------------------------------

  deal(): void {
    if (this.phase !== 'betting') throw new Error('Not in betting phase');

    this.reshuffledLastDeal = this.shoe.needsReshuffle();
    if (this.reshuffledLastDeal) this.shoe.reset();

    this.bet = BASE_BET;
    this.doubled = false;
    this.player.clear();
    this.dealer.clear();
    this.result = null;

    this.player.add(this.shoe.deal());
    this.dealer.add(this.shoe.deal());
    this.player.add(this.shoe.deal());
    this.dealer.add(this.shoe.deal());

    // US peek rule: settle immediately on a dealer natural.
    if (this.dealer.isBlackjack() || this.player.isBlackjack()) {
      this.finish();
      return;
    }
    this.phase = 'player';
  }

  // --- Player actions ----------------------------------------------------

  get canDouble(): boolean {
    return this.phase === 'player' && this.player.getSize() === 2;
  }

  hit(): void {
    this.requirePlayerTurn();
    this.player.add(this.shoe.deal());
    if (this.player.isBust()) this.finish();
  }

  stand(): void {
    this.requirePlayerTurn();
    this.playDealer();
  }

  doubleDown(): void {
    if (!this.canDouble) throw new Error('Cannot double down now');
    this.bet *= 2;
    this.doubled = true;
    this.player.add(this.shoe.deal());
    if (this.player.isBust()) {
      this.finish();
      return;
    }
    this.playDealer();
  }

  playAgain(): void {
    if (this.phase !== 'result') throw new Error('Hand not finished');
    this.phase = 'betting';
    this.bet = BASE_BET;
    this.doubled = false;
    this.result = null;
  }

  private requirePlayerTurn(): void {
    if (this.phase !== 'player') throw new Error('Not the player turn');
  }

  private playDealer(): void {
    this.phase = 'dealer';
    while (shouldDealerHit(this.dealer, this.rules)) {
      this.dealer.add(this.shoe.deal());
    }
    this.finish();
  }

  private finish(): void {
    this.result = determineWinner(this.player, this.dealer);
    this.phase = 'result';
  }

  // --- Card counting ------------------------------------------------------

  /**
   * Hi-Lo count from the player's seat: every card dealt this shoe *except* the
   * dealer's hole card while it is still face-down. Resets with the shoe.
   */
  private cardCount(): CardCount {
    let running = this.shoe.runningCount();
    let seen = this.shoe.dealtCards().length;

    const dealerCards = this.dealer.getCards();
    if (this.dealerHoleHidden() && dealerCards.length > 0) {
      running -= hiLoValue(rankToBucket(dealerCards[0].rank));
      seen -= 1;
    }

    const decksRemaining = this.shoe.decksRemaining();
    return {
      running,
      true: decksRemaining > 0 ? running / decksRemaining : 0,
      decksRemaining,
      seen,
    };
  }

  private dealerHoleHidden(): boolean {
    return this.phase === 'player' || this.phase === 'betting';
  }

  // --- Probability-engine input ---------------------------------------------

  /**
   * Shoe composition as a player *counting the shoe* knows it: every card
   * dealt since the last shuffle is removed, exactly reflecting how depleted
   * the shoe really is. The dealer's hole card is added back in — a counter
   * has seen it get dealt, but not what it is, so the engine must still treat
   * it as an unknown draw.
   */
  countingShoeCounts(): ShoeCounts {
    const counts = this.shoe.remainingCounts();
    const dealerCards = this.dealer.getCards();
    if (this.dealerHoleHidden() && dealerCards.length > 0) {
      counts[rankToBucket(dealerCards[0].rank)] += 1;
    }
    return counts;
  }

  /**
   * Shoe composition as a player with *no memory of earlier hands* would
   * assume it: a fresh full shoe minus only the cards visible on the table
   * right now. Cards used up by previous hands this shoe are not tracked —
   * this is the standard "infinite shoe" assumption basic-strategy tables
   * are built on.
   */
  freshShoeCounts(): ShoeCounts {
    const counts = makeShoe(this.rules.decks);
    const remove = (cards: Card[]) => {
      for (const c of cards) counts[rankToBucket(c.rank)] -= 1;
    };
    remove(this.player.getCards());
    // Only the dealer's upcard (index 0 is the hole card, dealt first).
    const dealerCards = this.dealer.getCards();
    if (this.dealerHoleHidden()) {
      remove(dealerCards.slice(1));
    } else {
      remove(dealerCards);
    }
    return counts;
  }

  dealerUpcardBucket(): Bucket | null {
    const cards = this.dealer.getCards();
    if (cards.length < 2) return null;
    return rankToBucket(cards[1].rank);
  }

  dealerVisibleBuckets(): Bucket[] {
    const cards = this.dealer.getCards();
    if (this.dealerHoleHidden()) {
      return cards.slice(1).map((c) => rankToBucket(c.rank));
    }
    return cards.map((c) => rankToBucket(c.rank));
  }
}
