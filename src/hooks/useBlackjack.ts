import { useCallback, useMemo, useRef, useState } from 'react';
import { BlackjackGame } from '../game/engine';
import { HouseRules, VEGAS_6_DECK } from '../game/rules';
import {
  analysePlayerDecision,
  DealerDistribution,
  ActionEV,
} from '../probability';
import { HandValue } from '../probability/deckMath';

export interface DecisionAnalysis {
  dealer: DealerDistribution;
  action: ActionEV;
  player: HandValue;
  canDouble: boolean;
}

export function useBlackjack(rules: HouseRules = VEGAS_6_DECK) {
  const gameRef = useRef<BlackjackGame>();
  if (!gameRef.current) {
    gameRef.current = new BlackjackGame(rules);
  }
  const game = gameRef.current;

  const [, force] = useState(0);
  const rerender = useCallback(() => force((n) => n + 1), []);

  const snapshot = game.snapshot();
  const lastDecision = useRef<DecisionAnalysis | null>(null);

  const decision = useMemo<DecisionAnalysis | null>(() => {
    if (snapshot.phase !== 'player') return lastDecision.current;

    const upcards = game.dealerVisibleBuckets();
    if (upcards.length === 0) return null;

    const result = analysePlayerDecision({
      playerBuckets: snapshot.player.buckets(),
      dealerUpcards: upcards,
      shoe: game.visibleShoeCounts(),
      dealerRules: { hitSoft17: rules.hitSoft17, peeked: true },
      canDouble: game.canDouble,
    });
    const analysis: DecisionAnalysis = { ...result, canDouble: game.canDouble };
    lastDecision.current = analysis;
    return analysis;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.phase, snapshot.player.getSize(), snapshot.bet]);

  const actions = useMemo(
    () => ({
      deal: () => {
        game.deal();
        lastDecision.current = null;
        rerender();
      },
      hit: () => {
        game.hit();
        rerender();
      },
      stand: () => {
        game.stand();
        rerender();
      },
      double: () => {
        game.doubleDown();
        rerender();
      },
      playAgain: () => {
        game.playAgain();
        lastDecision.current = null;
        rerender();
      },
    }),
    [game, rerender],
  );

  return { snapshot, decision, actions, canDouble: game.canDouble };
}
