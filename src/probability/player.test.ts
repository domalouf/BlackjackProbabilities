import { describe, expect, it } from 'vitest';
import { handValue, makeShoe } from './deckMath';
import { dealerDistribution } from './dealer';
import {
  analysePlayerDecision,
  bustChanceOnHit,
  outcomeIfHit,
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

describe('outcomeIfHit', () => {
  it('splits into win/push/loss/bust that sum to 1', () => {
    const o = outcomeIfHit(handValue([10, 6]), makeShoe(6), [6], RULES);
    expect(o.pWin + o.pPush + o.pLoss + o.pBust).toBeCloseTo(1, 10);
  });

  it('bust share matches bustChanceOnHit', () => {
    const shoe = makeShoe(6);
    const player = handValue([10, 6]);
    const o = outcomeIfHit(player, shoe.slice(), [6], RULES);
    expect(o.pBust).toBeCloseTo(bustChanceOnHit(player, shoe), 10);
  });

  it('does not mutate the shoe', () => {
    const shoe = makeShoe(6);
    const before = shoe.slice();
    outcomeIfHit(handValue([10, 6]), shoe, [6], RULES);
    expect(shoe).toEqual(before);
  });

  it('a hard 21 always busts on the next card', () => {
    const o = outcomeIfHit(handValue([10, 10, 1]), makeShoe(6), [6], RULES);
    expect(o.pBust).toBe(1);
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

describe('analysePlayerDecision — splits and surrender', () => {
  const decide = (
    pair: number[],
    up: number,
    extra: { canSurrender?: boolean } = {},
  ) => {
    const shoe = makeShoe(6);
    for (const b of [...pair, up]) shoe[b] -= 1;
    return analysePlayerDecision({
      playerBuckets: pair,
      dealerUpcards: [up],
      shoe,
      dealerRules: RULES,
      canDouble: true,
      canSplit: true,
      ...extra,
    }).action;
  };

  it('8-8 vs 10: split, and splitting beats both hitting and standing', () => {
    // Reference (Wizard of Odds, 6-deck H17 DAS): split ≈ −0.48.
    const action = decide([8, 8], 10);
    expect(action.best).toBe('split');
    expect(action.splitEv).toBeGreaterThan(-0.52);
    expect(action.splitEv).toBeLessThan(-0.44);
  });

  it('A-A vs 6: split', () => {
    expect(decide([1, 1], 6).best).toBe('split');
  });

  it('10-10 vs 6: stand, never split twenties', () => {
    expect(decide([10, 10], 6).best).toBe('stand');
  });

  it('5-5 vs 5: double, never split fives', () => {
    expect(decide([5, 5], 5).best).toBe('double');
  });

  it('9-9 vs 7: stand', () => {
    expect(decide([9, 9], 7).best).toBe('stand');
  });

  it('splitEv is NaN when the hand is not a pair', () => {
    const shoe = makeShoe(6);
    const { action } = analysePlayerDecision({
      playerBuckets: [10, 6],
      dealerUpcards: [10],
      shoe,
      dealerRules: RULES,
      canDouble: true,
      canSplit: true,
    });
    expect(action.splitEv).toBeNaN();
  });

  it('hard 16 vs 10: surrender when it is offered', () => {
    const shoe = makeShoe(6);
    shoe[10] -= 2;
    shoe[6] -= 1;
    const { action } = analysePlayerDecision({
      playerBuckets: [10, 6],
      dealerUpcards: [10],
      shoe,
      dealerRules: RULES,
      canDouble: true,
      canSurrender: true,
    });
    expect(action.surrenderEv).toBe(-0.5);
    expect(action.best).toBe('surrender');
  });

  it('hard 16 vs 6: stand, surrender is not worth it', () => {
    expect(decide([10, 6], 6, { canSurrender: true }).best).toBe('stand');
  });
});
