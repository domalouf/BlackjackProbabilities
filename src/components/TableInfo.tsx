import { CardCount } from '../game/engine';
import { signed } from '../lib/format';

const tone = (n: number): string =>
  n > 0 ? 'var(--win)' : n < 0 ? 'var(--loss)' : 'rgba(255,255,255,0.92)';

export default function TableInfo({ count }: { count: CardCount }) {
  const items = [
    { label: 'Decks left', value: count.decksRemaining.toFixed(1), color: 'rgba(255,255,255,0.92)' },
    { label: 'Running', value: signed(count.running), color: tone(count.running) },
    { label: 'True', value: signed(count.true, 1), color: tone(count.true) },
  ];

  return (
    <div className="flex shrink-0 flex-row justify-between gap-3 rounded-lg bg-black/15 p-3 sm:w-32 sm:flex-col sm:justify-start">
      {items.map((it) => (
        <div key={it.label}>
          <div className="text-[10px] uppercase tracking-wide text-white/60">
            {it.label}
          </div>
          <div className="tabular text-lg font-bold" style={{ color: it.color }}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
