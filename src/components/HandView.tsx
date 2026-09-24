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
    <div className="flex flex-col items-center">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {label}
        </span>
        {cards.length > 0 && (
          <span
            className="tabular rounded-full bg-[var(--chip)] px-2 py-0.5 text-sm font-bold"
            style={{ color: outcome ? OUTCOME_STYLE[outcome] : 'var(--text)' }}
          >
            {valueLabel(hand, !!hideHole)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {cards.length === 0 &&
          [0, 1].map((i) => (
            <div
              key={i}
              className="h-20 w-14 rounded-lg border border-dashed border-[var(--line)] sm:h-28 sm:w-20"
            />
          ))}
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
