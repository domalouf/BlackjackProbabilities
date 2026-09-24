import type { ReactNode } from 'react';
import { Hand } from '../game/hand';
import CardView from './CardView';
import Chip from './Chip';

export type Tone = 'win' | 'loss' | 'push';

interface Props {
  hand: Hand;
  label: string;
  hideHole?: boolean;
  /** Dealer only: the hole card turns over when it's revealed. */
  flipHole?: boolean;
  outcome?: Tone | null;
  /** Units riding on this hand, shown as a chip beside the label. */
  bet?: number;
  /** Overlap the cards, to fit two split hands side by side. */
  compact?: boolean;
  /** The hand being played, when there's more than one. */
  active?: boolean;
  /** Waiting its turn while another hand is played. */
  waiting?: boolean;
  /** A short note after the total, e.g. a split hand's result. */
  tag?: ReactNode;
}

function valueLabel(hand: Hand, hideHole: boolean): string {
  if (hideHole) {
    const up = hand.getCards()[1];
    if (!up) return '?';
    const v = up.rank === 'A' ? 11 : up.rank.match(/^\d+$/) ? Number(up.rank) : 10;
    return `${v}${up.rank === 'A' ? ' / 1' : ''} + ?`;
  }
  const { total, softAces } = hand.value();
  if (hand.isBust()) return `${total} — bust`;
  if (softAces > 0 && total !== 21) return `${total - 10} / ${total}`;
  if (hand.isBlackjack()) return 'Blackjack';
  return String(total);
}

export const TONE_COLOR: Record<Tone, string> = {
  win: 'var(--win)',
  loss: 'var(--loss)',
  push: 'var(--push)',
};

export default function HandView({
  hand,
  label,
  hideHole,
  flipHole,
  outcome,
  bet,
  compact,
  active,
  waiting,
  tag,
}: Props) {
  const cards = hand.getCards();
  return (
    <div
      className="flex flex-col items-center rounded-2xl px-2 py-1.5 transition-[opacity,box-shadow] duration-200"
      style={{
        opacity: waiting ? 0.55 : 1,
        boxShadow: active ? 'inset 0 0 0 2px var(--gold)' : undefined,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        {bet !== undefined && <Chip units={bet} />}
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}
        >
          {label}
        </span>
        {cards.length > 0 && (
          <span
            className="tabular rounded-full bg-[var(--chip)] px-2 py-0.5 text-sm font-bold"
            style={{ color: outcome ? TONE_COLOR[outcome] : 'var(--text)' }}
          >
            {valueLabel(hand, !!hideHole)}
          </span>
        )}
        {tag}
      </div>
      <div
        className={`flex justify-center ${compact ? '' : 'flex-wrap gap-1.5 sm:gap-2'}`}
      >
        {cards.length === 0 &&
          [0, 1].map((i) => (
            <div
              key={i}
              className="h-20 w-14 rounded-lg border border-dashed border-[var(--line)] sm:h-28 sm:w-20"
            />
          ))}
        {cards.map((card, i) => {
          const faceDown = hideHole && i === 0;
          return (
            <CardView
              // Re-key on turning over, so the hole card animates its reveal.
              key={`${card.id ?? i}-${faceDown ? 'down' : 'up'}`}
              card={card}
              faceDown={faceDown}
              reveal={flipHole && i === 0}
              dealIndex={i}
              className={compact && i > 0 ? '-ml-8 sm:-ml-11' : ''}
            />
          );
        })}
      </div>
    </div>
  );
}
