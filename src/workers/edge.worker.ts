/**
 * Computes one dealer upcard's share of the next hand's edge (see
 * `probability/edge.ts`). The page runs a few of these in parallel, one job
 * per upcard, so the whole-round calculation stays off the main thread.
 */
import { upcardEv, RoundRules } from '../probability/edge';
import { Bucket, ShoeCounts } from '../probability/deckMath';

export interface EdgeJob {
  id: number;
  shoe: ShoeCounts;
  up: Bucket;
  rules: RoundRules;
}

export interface EdgeJobResult {
  id: number;
  ev: number;
}

// The DOM typings describe `self` as a window; in a worker it's the worker scope.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<EdgeJob>) => void) | null;
  postMessage(result: EdgeJobResult): void;
};

scope.onmessage = ({ data: { id, shoe, up, rules } }) => {
  scope.postMessage({ id, ev: upcardEv(shoe, up, rules) });
};
