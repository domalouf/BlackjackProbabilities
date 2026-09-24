import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlackjackGame } from '../game/engine';
import { HouseRules, VEGAS_6_DECK } from '../game/rules';
import {
  analysePlayerDecision,
  DealerDistribution,
  ActionEV,
  insuranceDecision,
  InsuranceDecision,
  RoundRules,
} from '../probability';
import { HandValue, makeShoe, ShoeCounts } from '../probability/deckMath';
import { edgePool } from '../lib/edgePool';

export interface DecisionAnalysis {
  dealer: DealerDistribution;
  action: ActionEV;
  player: HandValue;
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
}

/**
 * The same decision analysed under two shoe assumptions: `counting` reflects
 * every card actually dealt since the last shuffle (what a card counter
 * knows), `noCount` assumes a fresh shoe minus only the cards visible on the
 * table this hand (the standard basic-strategy assumption).
 */
export interface DualDecisionAnalysis {
  counting: DecisionAnalysis;
  noCount: DecisionAnalysis;
}

/** The insurance / even-money offer, under both shoe assumptions. */
export interface DualInsurance {
  counting: InsuranceDecision;
  noCount: InsuranceDecision;
}

/**
 * The player's edge — the exact EV of a round, in bet units — under both
 * assumptions. `noCount` is always the full-shoe house edge; `counting` is
 * for the shoe as it stands between hands. Between hands it is for the next
 * hand; during a hand it is the one that applied when the hand was dealt.
 * `null` while the calculation is running.
 */
export interface Edge {
  counting: number | null;
  noCount: number | null;
}

/** Pause between dealer cards, so the draw reads as a deal, not a jump. */
const DEALER_BEAT_MS = 750;
const DEALER_BEAT_REDUCED_MS = 200;

const roundRules = (rules: HouseRules): RoundRules => ({
  hitSoft17: rules.hitSoft17,
  blackjackPayout: rules.blackjackPayout,
  doubleAfterSplit: rules.doubleAfterSplit,
  lateSurrender: rules.lateSurrender,
});

export function useBlackjack(rules: HouseRules = VEGAS_6_DECK) {
  const gameRef = useRef<BlackjackGame>();
  if (!gameRef.current) {
    gameRef.current = new BlackjackGame(rules);
  }
  const game = gameRef.current;

  const [, force] = useState(0);
  const rerender = useCallback(() => force((n) => n + 1), []);

  const snapshot = game.snapshot();
  const { phase, version } = snapshot;
  const lastDecision = useRef<DualDecisionAnalysis | null>(null);

  const decision = useMemo<DualDecisionAnalysis | null>(() => {
    if (phase !== 'player') return lastDecision.current;

    const upcards = game.dealerVisibleBuckets();
    if (upcards.length === 0) return null;
    const hand = snapshot.hands[snapshot.activeHand].hand;
    const legal = {
      canDouble: game.canDouble,
      canSplit: game.canSplit,
      canSurrender: game.canSurrender,
    };

    const analyse = (shoe: ShoeCounts): DecisionAnalysis => ({
      ...analysePlayerDecision({
        playerBuckets: hand.buckets(),
        dealerUpcards: upcards,
        shoe,
        dealerRules: { hitSoft17: rules.hitSoft17, peeked: true },
        splitRules: { doubleAfterSplit: rules.doubleAfterSplit },
        ...legal,
      }),
      ...legal,
    });

    const analysis: DualDecisionAnalysis = {
      counting: analyse(game.countingShoeCounts()),
      noCount: analyse(game.freshShoeCounts()),
    };
    lastDecision.current = analysis;
    return analysis;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const insurance = useMemo<DualInsurance | null>(() => {
    if (phase !== 'insurance' || !snapshot.insurance) return null;
    const { evenMoney } = snapshot.insurance;
    return {
      counting: insuranceDecision(
        game.countingShoeCounts(),
        evenMoney,
        rules.blackjackPayout,
      ),
      noCount: insuranceDecision(
        game.freshShoeCounts(),
        evenMoney,
        rules.blackjackPayout,
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  // --- Edge ------------------------------------------------------------------

  const [baseEdge, setBaseEdge] = useState<number | null>(null);
  const [countedEdge, setCountedEdge] = useState<number | null>(null);

  // The full-shoe house edge: one calculation for the whole session.
  useEffect(() => {
    const pool = edgePool();
    if (!pool) return;
    let live = true;
    pool
      .edge(makeShoe(rules.decks), roundRules(rules))
      .result.then((ev) => live && setBaseEdge(ev));
    return () => {
      live = false;
    };
  }, [rules]);

  // Between hands, work out the edge for the shoe the next hand comes from.
  // If the player deals before it's done, it's still the edge for that hand,
  // so keep it running — until the next hand's request replaces it.
  const edgeRequest = useRef(0);
  const edgeJob = useRef<{ cancel: () => void } | null>(null);
  const betweenHands = phase === 'betting' || phase === 'result';
  useEffect(() => {
    if (!betweenHands) return;
    const pool = edgePool();
    if (!pool) return;
    const request = ++edgeRequest.current;
    edgeJob.current?.cancel();
    setCountedEdge(null);
    const job = pool.edge(game.nextRoundShoeCounts(), roundRules(rules));
    edgeJob.current = job;
    job.result.then((ev) => {
      if (edgeRequest.current === request) setCountedEdge(ev);
    });
    return () => {
      const next = game.snapshot().phase;
      if (next === 'betting' || next === 'result') job.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [betweenHands && version]);

  // --- Dealer's turn, one card per beat ----------------------------------------

  useEffect(() => {
    if (phase !== 'dealer') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(
      () => {
        game.dealerStep();
        rerender();
      },
      reduced ? DEALER_BEAT_REDUCED_MS : DEALER_BEAT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [game, phase, version, rerender]);

  const actions = useMemo(() => {
    const act = (fn: () => void) => () => {
      fn();
      rerender();
    };
    return {
      deal: (bet: number) => {
        lastDecision.current = null;
        game.deal(bet);
        rerender();
      },
      playAgain: (bet: number) => {
        lastDecision.current = null;
        game.playAgain();
        game.deal(bet);
        rerender();
      },
      takeInsurance: act(() => game.takeInsurance()),
      declineInsurance: act(() => game.declineInsurance()),
      hit: act(() => game.hit()),
      stand: act(() => game.stand()),
      double: act(() => game.doubleDown()),
      split: act(() => game.split()),
      surrender: act(() => game.surrender()),
    };
  }, [game, rerender]);

  const edge: Edge = { counting: countedEdge, noCount: baseEdge };

  return {
    snapshot,
    decision,
    insurance,
    edge,
    actions,
    canDouble: game.canDouble,
    canSplit: game.canSplit,
    canSurrender: game.canSurrender,
  };
}
