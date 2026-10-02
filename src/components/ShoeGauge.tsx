import type { CSSProperties } from 'react';
import { ShoeState } from '../game/engine';

/** Card edges seen side-on, with a darker line between decks, counted from the back. */
const cards = (decks: number): CSSProperties => ({
  background: `
    linear-gradient(90deg, rgba(0, 0, 0, 0.45) 1px, transparent 1px) 100% 0 / ${100 / decks}% 100%,
    repeating-linear-gradient(90deg, var(--card) 0 1px, #cfc6ad 1px 2px)`,
});

function Row({
  label,
  share,
  count,
  decks,
}: {
  label: string;
  /** Share of a full shoe still in it, 0–1. */
  share: number;
  count: number;
  decks: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-6 text-[10px] uppercase leading-tight tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      {/* The front of the shoe is on the left, so dealing empties it from there. */}
      <div className="flex h-2.5 w-28 justify-end overflow-hidden rounded-sm bg-[var(--track)] sm:w-36">
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${share * 100}%`, ...cards(decks * share) }}
        />
      </div>
      <span className="tabular w-7 text-right text-xs font-bold leading-tight">{count}</span>
    </div>
  );
}

/**
 * A full shoe drawn above the shoe as it stands, so you can see how much of it
 * has been dealt and how close the cut card is.
 */
export default function ShoeGauge({
  shoe,
  decks,
}: {
  shoe: ShoeState;
  decks: number;
}) {
  const { size, remaining, cutCardAt } = shoe;
  const cutOut = remaining <= cutCardAt;
  // The bars are w-28 / sm:w-36 after a w-6 label and a 1.5 gap.
  const cut = `calc(1.875rem + (100% - 1.875rem - 2.125rem) * ${1 - cutCardAt / size})`;
  const behindCut = cutCardAt / 52;

  return (
    <div
      className="relative flex flex-col gap-1"
      role="img"
      aria-label={`${remaining} of ${size} cards left in the shoe. The cut card is ${behindCut} decks from the back${cutOut ? ' and has come out: the next hand is dealt from a new shoe' : ''}.`}
      title={`${remaining} of ${size} cards left · cut card ${behindCut} decks from the back (${Math.round((1 - cutCardAt / size) * 100)}% dealt)`}
    >
      <div className="relative h-3 text-[10px] uppercase leading-tight tracking-wide">
        <span className="text-[var(--text-muted)]">Shoe</span>
        <span
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap font-semibold text-[var(--gold)]"
          style={{ left: cut }}
        >
          {cutOut ? 'Cut card out' : 'Cut card'}
        </span>
      </div>
      <Row label="Full" share={1} count={size} decks={decks} />
      <Row label="Now" share={remaining / size} count={remaining} decks={decks} />
      {/* The cut card, at the same depth in both shoes. */}
      <span
        className="pointer-events-none absolute -bottom-0.5 top-3.5 w-0.5 -translate-x-1/2 rounded-full"
        style={{
          left: cut,
          background: 'var(--gold)',
          boxShadow: cutOut ? '0 0 6px var(--gold)' : '0 0 0 1px rgba(0,0,0,0.35)',
        }}
      />
    </div>
  );
}
