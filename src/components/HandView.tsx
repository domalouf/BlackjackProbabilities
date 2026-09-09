import { Hand } from '../game/hand';
import CardView from './CardView';

interface Props {
  hand: Hand;
  label: string;
  hideHole?: boolean;
  outcome?: 'win' | 'loss' | 'push' | null;
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

const OUTCOME_STYLE: Record<'win' | 'loss' | 'push', string> = {
  win: 'var(--win)',
  loss: 'var(--loss)',
  push: 'var(--push)',
};

export default function HandView({ hand, label, hideHole, outcome }: Props) {
  const cards = hand.getCards();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
        <span
          className="tabular text-sm font-bold"
          style={{ color: outcome ? OUTCOME_STYLE[outcome] : 'var(--text)' }}
        >
          {valueLabel(hand, !!hideHole)}
        </span>
      </div>
      <div className="flex gap-1.5 sm:gap-2">
        {cards.length === 0 && (
          <div className="h-24 w-16 rounded-lg border border-dashed border-[var(--border)] sm:h-28 sm:w-20" />
        )}
        {cards.map((card, i) => (
          <CardView
            key={card.id ?? i}
            card={card}
            faceDown={hideHole && i === 0}
            dealIndex={i}
          />
        ))}
      </div>
    </div>
  );
}
