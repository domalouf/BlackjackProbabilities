import { SessionStats as Stats } from '../game/engine';
import { money } from '../lib/format';

export default function SessionStats({ stats }: { stats: Stats }) {
  const items: { label: string; value: string; tone?: 'win' | 'loss' }[] = [
    { label: 'Hands', value: String(stats.handsPlayed) },
    {
      label: 'W / L / P',
      value: `${stats.wins} / ${stats.losses} / ${stats.pushes}`,
    },
    { label: 'Blackjacks', value: String(stats.blackjacks) },
    {
      label: 'Net',
      value: money(stats.net),
      tone: stats.net > 0 ? 'win' : stats.net < 0 ? 'loss' : undefined,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="bg-[var(--surface)] px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            {it.label}
          </div>
          <div
            className="tabular text-sm font-bold"
            style={{
              color:
                it.tone === 'win'
                  ? 'var(--win)'
                  : it.tone === 'loss'
                    ? 'var(--loss)'
                    : 'var(--text)',
            }}
          >
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
