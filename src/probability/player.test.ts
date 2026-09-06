import { describe, expect, it } from 'vitest';
import { handValue, makeShoe } from './deckMath';
import { dealerDistribution } from './dealer';
import {
  analysePlayerDecision,
  bustChanceOnHit,
  outcomeIfStand,
} from './player';

const RULES = { hitSoft17: true, peeked: true };

describe('bustChanceOnHit', () => {
  it('is zero on any total of 11 or less', () => {
    expect(bustChanceOnHit(handValue([5, 6]), makeShoe(6))).toBe(0);
    expect(bustChanceOnHit(handValue([1]), makeShoe(6))).toBe(0);
  });

  it('is 100% on a hard 21', () => {
    // 10 + 10 + A(=1): any next card busts.
    expect(bustChanceOnHit(handValue([10, 10, 1]), makeShoe(6))).toBe(1);
  });

  it('hard 16 vs a full 6-deck shoe busts a bit under 62%', () => {
    // 8 of 13 ranks (6,7,8,9,10,J,Q,K) bust a 16.
    const p = bustChanceOnHit(handValue([10, 6]), makeShoe(6));
    expect(p).toBeGreaterThan(0.6);
    expect(p).toBeLessThan(0.63);
  });

  it('a soft 16 never busts on one card', () => {
    expect(bustChanceOnHit(handValue([1, 5]), makeShoe(6))).toBe(0);
  });
});

describe('outcomeIfStand', () => {
  it('splits into win/push/loss that sum to 1', () => {
    const dealer = dealerDistribution([6], makeShoe(6), RULES);
    const o = outcomeIfStand(handValue([10, 8]), dealer);
    expect(o.pWin + o.pPush + o.pLoss).toBeCloseTo(1, 10);
    expect(o.ev).toBeCloseTo(o.pWin - o.pLoss, 10);
  });

  it('standing on 20 beats a dealer 6 more often than not', () => {
    const dealer = dealerDistribution([6], makeShoe(6), RULES);
    const o = outcomeIfStand(handValue([10, 10]), dealer);
    expect(o.pWin).toBeGreaterThan(0.7);
  });

  it('a bust hand always loses', () => {
    const dealer = dealerDistribution([6], makeShoe(6), RULES);
    expect(outcomeIfStand(handValue([10, 10, 5]), dealer).pLoss).toBe(1);
  });
});

describe('analysePlayerDecision — basic-strategy sanity', () => {
  const shoe = makeShoe(6);

  it('hard 12 vs 10: hit', () => {
    const { action } = analysePlayerDecision({
      playerBuckets: [10, 2],
      dealerUpcards: [10],
      shoe,
      dealerRules: RULES,
      canDouble: false,
    });
    expect(action.best).toBe('hit');
    expect(action.hitEv).toBeGreaterThan(action.stand.ev);
  });

  it('hard 16 vs 10 is a near coin-flip, both around −0.54', () => {
    // Reference (Wizard of Odds, 6-deck H17): stand −0.5404, hit −0.5398.
    const { action } = analysePlayerDecision({
      playerBuckets: [10, 6],
      dealerUpcards: [10],
      shoe,
      dealerRules: RULES,
      canDouble: false,
    });
    expect(action.stand.ev).toBeGreaterThan(-0.56);
    expect(action.stand.ev).toBeLessThan(-0.52);
    expect(Math.abs(action.hitEv - action.stand.ev)).toBeLessThan(0.01);
  });

  it('hard 20 vs anything: stand', () => {
    const { action } = analysePlayerDecision({
      playerBuckets: [10, 10],
      dealerUpcards: [7],
      shoe,
      dealerRules: RULES,
      canDouble: false,
    });
    expect(action.best).toBe('stand');
  });

  it('hard 11 vs 6: double', () => {
    const { action } = analysePlayerDecision({
      playerBuckets: [7, 4],
      dealerUpcards: [6],
      shoe,
      dealerRules: RULES,
      canDouble: true,
    });
    expect(action.best).toBe('double');
    expect(action.doubleEv).toBeGreaterThan(0);
  });

  it('hard 13 vs 2: stand (dealer is weak, we bust too often)', () => {
    const { action } = analysePlayerDecision({
      playerBuckets: [10, 3],
      dealerUpcards: [2],
      shoe,
      dealerRules: RULES,
      canDouble: false,
    });
    expect(action.best).toBe('stand');
  });

  it('hard 12 vs 3: hit', () => {
    const { action } = analysePlayerDecision({
      playerBuckets: [10, 2],
      dealerUpcards: [3],
      shoe,
      dealerRules: RULES,
      canDouble: false,
    });
    expect(action.best).toBe('hit');
  });
});
