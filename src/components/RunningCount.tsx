import { CardCount } from '../game/engine';
import { signed } from '../lib/format';

const tone = (n: number): string =>
  n > 0 ? 'var(--win)' : n < 0 ? 'var(--loss)' : 'var(--text)';

export default function RunningCount({ count }: { count: CardCount }) {
  const items = [
    { label: 'Running', value: signed(count.running), color: tone(count.running) },
    { label: 'True', value: signed(count.true, 1), color: tone(count.true) },
    {
      label: 'Decks left',
      value: count.decksRemaining.toFixed(1),
      color: 'var(--text)',
    },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Hi-Lo count</h2>
        <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
          {count.seen} card{count.seen === 1 ? '' : 's'} seen
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)]">
        {items.map((it) => (
          <div key={it.label} className="bg-[var(--surface)] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              {it.label}
            </div>
            <div
              className="tabular text-lg font-bold"
              style={{ color: it.color }}
            >
              {it.value}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
        Cards 2–6 count as +1, 10s and aces as −1, 7–9 as 0. The dealer hole card
        is added once it flips. A positive true count means the shoe favours the
        player. Resets on every shuffle.
      </p>
    </div>
  );
}
