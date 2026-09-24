import type { RoundRules } from '../probability/edge';
import type { ShoeCounts } from '../probability/deckMath';
import type { EdgeJob, EdgeJobResult } from '../workers/edge.worker';

/** Slowest upcards first, so the long jobs start while the short ones queue. */
const UPCARDS = [2, 1, 3, 4, 5, 6, 7, 9, 8, 10];

interface Request {
  remaining: number;
  sum: number;
  resolve: (ev: number) => void;
}

/**
 * A small pool of edge workers. Each request (a shoe) is split into ten jobs,
 * one per dealer upcard, handed out to whichever worker is free.
 */
class EdgePool {
  private readonly idle: Worker[] = [];
  private queue: EdgeJob[] = [];
  private readonly requests = new Map<number, Request>();
  private readonly cache = new Map<string, Promise<number>>();
  private nextId = 1;

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(
        new URL('../workers/edge.worker.ts', import.meta.url),
        { type: 'module' },
      );
      worker.onmessage = (event: MessageEvent<EdgeJobResult>) =>
        this.done(worker, event.data);
      this.idle.push(worker);
    }
  }

  /**
   * Edge of a round dealt from `shoe`. Identical shoes share one calculation;
   * `cancel` drops the jobs still waiting if the answer is no longer wanted.
   */
  edge(shoe: ShoeCounts, rules: RoundRules): { result: Promise<number>; cancel: () => void } {
    const key = `${shoe.join(',')}|${JSON.stringify(rules)}`;
    const cached = this.cache.get(key);
    if (cached) return { result: cached, cancel: () => {} };

    const id = this.nextId++;
    const result = new Promise<number>((resolve) => {
      this.requests.set(id, { remaining: UPCARDS.length, sum: 0, resolve });
    });
    for (const up of UPCARDS) this.queue.push({ id, shoe, up, rules });
    this.cache.set(key, result);
    this.pump();

    const cancel = () => {
      if (!this.requests.delete(id)) return; // already finished
      this.queue = this.queue.filter((job) => job.id !== id);
      this.cache.delete(key);
    };
    return { result, cancel };
  }

  private pump(): void {
    while (this.idle.length > 0 && this.queue.length > 0) {
      this.idle.pop()!.postMessage(this.queue.shift()!);
    }
  }

  private done(worker: Worker, { id, ev }: EdgeJobResult): void {
    this.idle.push(worker);
    const request = this.requests.get(id);
    if (request) {
      request.sum += ev;
      if (--request.remaining === 0) {
        this.requests.delete(id);
        request.resolve(request.sum);
      }
    }
    this.pump();
  }
}

let pool: EdgePool | null | undefined;

/** The app-wide pool, or `null` where workers aren't available. */
export function edgePool(): EdgePool | null {
  if (pool === undefined) {
    pool =
      typeof Worker === 'undefined'
        ? null
        : new EdgePool(
            Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)),
          );
  }
  return pool;
}
