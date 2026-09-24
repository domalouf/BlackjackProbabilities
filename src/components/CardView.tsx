import type { CSSProperties } from 'react';
import { Card, isRedSuit, SUIT_SYMBOL } from '../game/card';

interface Props {
  card?: Card;
  faceDown?: boolean;
  /** Wait before sliding in, to stagger cards dealt together (ms). */
  dealDelay?: number;
  /** Turn over in place (the hole card) instead of sliding in from the shoe. */
  reveal?: boolean;
}

export default function CardView({
  card,
  faceDown,
  dealDelay: delayMs = 0,
  reveal = false,
}: Props) {
  const dealDelay = { '--deal-delay': `${delayMs}ms` } as CSSProperties;

  if (faceDown || !card) {
    return (
      <div
        className="card-in card-back h-20 w-14 rounded-lg sm:h-28 sm:w-20"
        style={dealDelay}
        aria-label="face-down card"
      />
    );
  }

  const red = isRedSuit(card.suit);
  return (
    <div
      className={`${reveal ? 'card-flip' : 'card-in'} playing-card relative flex h-20 w-14 flex-col justify-between rounded-lg p-1 sm:h-28 sm:w-20 sm:p-2`}
      style={{
        ...dealDelay,
        color: red ? 'var(--card-red)' : 'var(--card-ink)',
      }}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <span className="text-xs font-bold leading-none sm:text-base">
        {card.rank}
      </span>
      <span className="self-center text-lg sm:text-2xl">
        {SUIT_SYMBOL[card.suit]}
      </span>
      <span className="rotate-180 self-end text-xs font-bold leading-none sm:text-base">
        {card.rank}
      </span>
    </div>
  );
}
