import type { CSSProperties } from 'react';
import { Card, isRedSuit, SUIT_SYMBOL } from '../game/card';

interface Props {
  card?: Card;
  faceDown?: boolean;
  /** Position within the hand — staggers the deal-in animation slightly. */
  dealIndex?: number;
}

export default function CardView({ card, faceDown, dealIndex = 0 }: Props) {
  const dealDelay = {
    '--deal-delay': `${Math.min(dealIndex, 1) * 160}ms`,
  } as CSSProperties;

  if (faceDown || !card) {
    return (
      <div
        className="card-in flex h-24 w-16 items-center justify-center rounded-lg border shadow-sm sm:h-28 sm:w-20"
        style={{
          ...dealDelay,
          background:
            'repeating-linear-gradient(45deg, var(--accent) 0 6px, color-mix(in srgb, var(--accent) 70%, black) 6px 12px)',
          borderColor: 'var(--border)',
        }}
        aria-label="face-down card"
      />
    );
  }

  const red = isRedSuit(card.suit);
  return (
    <div
      className="card-in relative flex h-24 w-16 flex-col justify-between rounded-lg border p-1.5 shadow-sm sm:h-28 sm:w-20 sm:p-2"
      style={{
        ...dealDelay,
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: red ? 'var(--loss)' : 'var(--text)',
      }}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <span className="text-sm font-bold leading-none sm:text-base">
        {card.rank}
      </span>
      <span className="self-center text-xl sm:text-2xl">
        {SUIT_SYMBOL[card.suit]}
      </span>
      <span className="rotate-180 self-end text-sm font-bold leading-none sm:text-base">
        {card.rank}
      </span>
    </div>
  );
}
