import { CardCount } from '../game/engine';
import { signed } from '../lib/format';

const tone = (n: number): string =>
  n > 0 ? 'var(--win)' : n < 0 ? 'var(--loss)' : 'var(--text)';

/** The shoe's Hi-Lo count, printed along the top of the table. */
export default function TableInfo({ count }: { count: CardCount }) {
  const items = [
    { label: 'Decks left', value: count.decksRemaining.toFixed(1), color: 'var(--text)' },
    { label: 'Running', value: signed(count.running), color: tone(count.running) },
    { label: 'True', value: signed(count.true, 1), color: tone(count.true) },
  ];

  return (
    <dl className="flex gap-3 sm:gap-4">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col">
          <dt className="text-[10px] uppercase leading-tight tracking-wide text-[var(--text-muted)]">
            {it.label}
          </dt>
          <dd className="tabular text-sm font-bold leading-tight" style={{ color: it.color }}>
            {it.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
