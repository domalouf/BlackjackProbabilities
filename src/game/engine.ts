import { Card } from './card';
import { Hand } from './hand';
import {
  determineWinner,
  GameResult,
  HouseRules,
  netResult,
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

/**
 * - `betting`: before the first deal.
 * - `insurance`: the dealer shows an Ace and offers insurance (or even money)
 *   before checking for blackjack.
 * - `player`: the player is acting on {@link GameSnapshot.activeHand}.
 * - `dealer`: the hole card is face up and the dealer draws, one card per
 *   {@link BlackjackGame.dealerStep} so the UI can pace it.
 * - `result`: every hand is settled.
 */
export type GamePhase = 'betting' | 'insurance' | 'player' | 'dealer' | 'result';

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

/** Where the shoe stands, in cards, for drawing it. */
export interface ShoeState {
  /** Cards in a full shoe. */
  size: number;
  /** Cards not yet dealt. The dealer's hole card has left the shoe. */
  remaining: number;
  /** Cards left when the cut card comes out and the shoe is reshuffled. */
  cutCardAt: number;
}

/** One of the player's hands — two after a split. */
export interface PlayerHand {
  hand: Hand;
  bet: number;
  doubled: boolean;
  /** Formed by splitting a pair: no blackjack, no surrender, no re-split. */
  fromSplit: boolean;
  surrendered: boolean;
  /** Finished acting: stood, doubled, bust, reached 21, or surrendered. */
  done: boolean;
  result: GameResult | null;
}

export interface Insurance {
  /** Side bet of half the main bet; pays 2:1 if the dealer has blackjack. */
  bet: number;
  /** `null` while the offer is open. */
  taken: boolean | null;
  /** True when the player holds a natural, so the offer is "even money". */
  evenMoney: boolean;
}

export interface GameSnapshot {
  phase: GamePhase;
  hands: PlayerHand[];
  /** Index into {@link hands} of the hand being played. */
  activeHand: number;
  dealer: Hand;
  /** Hide the dealer's hole card in the UI while the player is deciding. */
  dealerHoleHidden: boolean;
  /** Insurance offered this hand, `null` if the dealer didn't show an Ace. */
  insurance: Insurance | null;
  /** Net units won or lost this hand, insurance included; `null` until settled. */
  net: number | null;
  rules: HouseRules;
  count: CardCount;
  shoePenetration: number;
  shoe: ShoeState;
  reshuffledLastDeal: boolean;
  /** The cut card is out: the next hand comes from a freshly shuffled shoe. */
  reshuffleNext: boolean;
  /** Bumped on every change — a cheap key for memoising derived state. */
  version: number;
}

/** Every hand is played for 1 unit; doubling or splitting adds more. */
const BASE_BET = 1;

const newHand = (bet: number, fromSplit = false): PlayerHand => ({
  hand: new Hand(),
  bet,
  doubled: false,
  fromSplit,
  surrendered: false,
  done: false,
  result: null,
});

export class BlackjackGame {
  private phase: GamePhase = 'betting';
  private hands: PlayerHand[] = [newHand(BASE_BET)];
  private active = 0;
  private dealer = new Hand();
  private insurance: Insurance | null = null;
  private shoe: Shoe;
  private reshuffledLastDeal = false;
  private version = 0;

  constructor(
    private readonly rules: HouseRules = VEGAS_6_DECK,
    shoe?: Shoe,
  ) {
    this.shoe = shoe ?? new Shoe(rules.decks, rules.penetration);
  }

  snapshot(): GameSnapshot {
    return {
      phase: this.phase,
      hands: this.hands.map((h) => ({ ...h })),
      activeHand: this.active,
      dealer: this.dealer,
      dealerHoleHidden: this.dealerHoleHidden(),
      insurance: this.insurance && { ...this.insurance },
      net: this.phase === 'result' ? this.net() : null,
      rules: this.rules,
      count: this.cardCount(),
      shoePenetration: this.shoe.penetration(),
      shoe: {
        size: this.shoe.size(),
        remaining: this.shoe.cardsRemaining(),
        cutCardAt: this.shoe.cutCardAt(),
      },
      reshuffledLastDeal: this.reshuffledLastDeal,
      reshuffleNext: this.shoe.needsReshuffle(),
      version: this.version,
    };
  }

  // --- Betting -------------------------------------------------------------

  deal(): void {
    if (this.phase !== 'betting') throw new Error('Not in betting phase');
    this.version++;

    this.reshuffledLastDeal = this.shoe.needsReshuffle();
    if (this.reshuffledLastDeal) this.shoe.reset();

    this.hands = [newHand(BASE_BET)];
    this.active = 0;
    this.dealer.clear();
    this.insurance = null;

    const player = this.hands[0].hand;
    player.add(this.shoe.deal());
    this.dealer.add(this.shoe.deal()); // hole card
    player.add(this.shoe.deal());
    this.dealer.add(this.shoe.deal()); // upcard

    // An Ace up: offer insurance before the dealer checks for blackjack.
    if (this.dealer.getCards()[1].rank === 'A') {
      this.insurance = {
        bet: BASE_BET / 2,
        taken: null,
        evenMoney: player.isBlackjack(),
      };
      this.phase = 'insurance';
      return;
    }
    this.peek();
  }

  /** Take insurance (or even money) — only while the dealer shows an Ace. */
  takeInsurance(): void {
    this.answerInsurance(true);
  }

  declineInsurance(): void {
    this.answerInsurance(false);
  }

  private answerInsurance(take: boolean): void {
    if (this.phase !== 'insurance' || !this.insurance) {
      throw new Error('Insurance is not on offer');
    }
    this.version++;
    this.insurance.taken = take;
    this.peek();
  }

  /** US peek rule: the dealer checks for a natural and settles it at once. */
  private peek(): void {
    if (this.dealer.isBlackjack() || this.hands[0].hand.isBlackjack()) {
      this.finish();
      return;
    }
    this.phase = 'player';
  }

  // --- Player actions ----------------------------------------------------

  private get current(): PlayerHand {
    return this.hands[this.active];
  }

  get canDouble(): boolean {
    const h = this.current;
    return (
      this.phase === 'player' &&
      h.hand.getSize() === 2 &&
      (!h.fromSplit || this.rules.doubleAfterSplit)
    );
  }

  /** An opening pair of the same value; pairs split once (two hands). */
  get canSplit(): boolean {
    if (this.phase !== 'player' || this.hands.length > 1) return false;
    const cards = this.current.hand.getCards();
    return (
      cards.length === 2 &&
      rankToBucket(cards[0].rank) === rankToBucket(cards[1].rank)
    );
  }

  get canSurrender(): boolean {
    return (
      this.rules.lateSurrender &&
      this.phase === 'player' &&
      this.hands.length === 1 &&
      this.current.hand.getSize() === 2
    );
  }

  hit(): void {
    this.requirePlayerTurn();
    this.version++;
    const { hand } = this.current;
    hand.add(this.shoe.deal());
    if (hand.isBust() || hand.getValue() === 21) this.completeHand();
  }

  stand(): void {
    this.requirePlayerTurn();
    this.version++;
    this.completeHand();
  }

  doubleDown(): void {
    if (!this.canDouble) throw new Error('Cannot double down now');
    this.version++;
    const h = this.current;
    h.bet *= 2;
    h.doubled = true;
    h.hand.add(this.shoe.deal());
    this.completeHand();
  }

  split(): void {
    if (!this.canSplit) throw new Error('Cannot split now');
    this.version++;
    const { bet } = this.current;
    const [first, second] = this.current.hand.getCards();
    const a = newHand(bet, true);
    const b = newHand(bet, true);
    a.hand.add(first);
    b.hand.add(second);
    this.hands = [a, b];
    this.enterHand(0);
    this.advance();
  }

  surrender(): void {
    if (!this.canSurrender) throw new Error('Cannot surrender now');
    this.version++;
    this.current.surrendered = true;
    this.completeHand();
  }

  playAgain(): void {
    if (this.phase !== 'result') throw new Error('Hand not finished');
    this.version++;
    this.phase = 'betting';
  }

  private requirePlayerTurn(): void {
    if (this.phase !== 'player') throw new Error('Not the player turn');
  }

  private completeHand(): void {
    this.current.done = true;
    this.advance();
  }

  /**
   * Make hand `index` the active one. A split hand gets its second card only
   * now, as at a real table; split aces get that one card and no more.
   */
  private enterHand(index: number): void {
    this.active = index;
    const h = this.current;
    if (h.hand.getSize() === 1) h.hand.add(this.shoe.deal());
    const splitAces = h.fromSplit && h.hand.getCards()[0].rank === 'A';
    if (splitAces || h.hand.getValue() === 21) h.done = true;
  }

  /** Move past finished hands; once all are done, hand over to the dealer. */
  private advance(): void {
    while (this.current.done) {
      if (this.active + 1 >= this.hands.length) {
        this.revealDealer();
        return;
      }
      this.enterHand(this.active + 1);
    }
  }

  // --- Dealer ------------------------------------------------------------

  /** Turn the hole card; the dealer only draws if a hand is still live. */
  private revealDealer(): void {
    const live = this.hands.some((h) => !h.surrendered && !h.hand.isBust());
    if (live) {
      this.phase = 'dealer';
    } else {
      this.finish();
    }
  }

  /**
   * One beat of the dealer's turn: draw a card if the rules say hit,
   * otherwise settle the hand. Call repeatedly while the phase is `dealer`.
   */
  dealerStep(): void {
    if (this.phase !== 'dealer') throw new Error("Not the dealer's turn");
    this.version++;
    if (shouldDealerHit(this.dealer, this.rules)) {
      this.dealer.add(this.shoe.deal());
    } else {
      this.finish();
    }
  }

  /** Run the dealer's whole turn at once (tests, or skipping the animation). */
  playDealerOut(): void {
    while (this.phase === 'dealer') this.dealerStep();
  }

  private finish(): void {
    for (const h of this.hands) {
      h.done = true;
      h.result = h.surrendered
        ? 'surrender'
        : determineWinner(h.hand, this.dealer, { fromSplit: h.fromSplit });
    }
    this.phase = 'result';
  }

  /** Net units for the settled hand: every player hand plus insurance. */
  private net(): number {
    let net = 0;
    for (const h of this.hands) {
      if (h.result) net += netResult(h.result, h.bet, this.rules);
    }
    if (this.insurance?.taken) {
      net += this.dealer.isBlackjack()
        ? 2 * this.insurance.bet
        : -this.insurance.bet;
    }
    return net;
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
    return (
      this.phase === 'betting' ||
      this.phase === 'insurance' ||
      this.phase === 'player'
    );
  }

  private playerCards(): Card[] {
    return this.hands.flatMap((h) => h.hand.getCards());
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
    remove(this.playerCards());
    // Only the dealer's upcard (index 0 is the hole card, dealt first).
    const dealerCards = this.dealer.getCards();
    if (this.dealerHoleHidden()) {
      remove(dealerCards.slice(1));
    } else {
      remove(dealerCards);
    }
    return counts;
  }

  /**
   * The shoe the *next* hand will be dealt from, as a counter knows it: a
   * fresh shoe if the cut card has come out, otherwise every undealt card.
   * Only meaningful between hands, when nothing is face down.
   */
  nextRoundShoeCounts(): ShoeCounts {
    return this.shoe.needsReshuffle()
      ? makeShoe(this.rules.decks)
      : this.shoe.remainingCounts();
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
