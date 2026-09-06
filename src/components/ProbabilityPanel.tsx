import type { ReactNode } from 'react';
import { GameSnapshot } from '../game/engine';
import { DecisionAnalysis } from '../hooks/useBlackjack';
import { chanceDealerReaches } from '../probability';
import { ev, pct } from '../lib/format';

interface Props {
  snapshot: GameSnapshot;
  decision: DecisionAnalysis | null;
}

function StackedBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-md">
        {segments.map((s) => (
          <div
            key={s.label}
            className="h-full"
            style={{
              width: `${Math.max(s.value * 100, 0)}%`,
              background: s.color,
            }}
            title={`${s.label}: ${pct(s.value)}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="text-[var(--text-muted)]">{s.label}</span>
            <span className="tabular font-semibold">{pct(s.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function DealerBars({
  dist,
}: {
  dist: DecisionAnalysis['dealer'];
}) {
  const rows: { label: string; value: number; danger?: boolean }[] = [
    { label: '17', value: dist.p17 },
    { label: '18', value: dist.p18 },
    { label: '19', value: dist.p19 },
    { label: '20', value: dist.p20 },
    { label: '21', value: chanceDealerReaches(dist, 21) },
    { label: 'Bust', value: dist.pBust, danger: true },
  ];
  const max = Math.max(...rows.map((r) => r.value), 0.01);
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="tabular w-8 text-right text-xs text-[var(--text-muted)]">
            {r.label}
          </span>
          <div className="h-3.5 flex-1 rounded-sm bg-[var(--surface-2)]">
            <div
              className="h-full rounded-sm"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: r.danger ? 'var(--win)' : 'var(--neutral)',
              }}
            />
          </div>
          <span className="tabular w-12 text-right text-xs font-semibold">
            {pct(r.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[var(--border)] px-4 py-3.5 first:border-t-0">
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

const ACTION_LABEL: Record<'hit' | 'stand' | 'double', string> = {
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double',
};

export default function ProbabilityPanel({ snapshot, decision }: Props) {
  const showLive = snapshot.phase === 'player' && decision;
  const dimmed = snapshot.phase !== 'player';

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      style={{ opacity: dimmed ? 0.6 : 1, transition: 'opacity 150ms' }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-bold">Odds &amp; expected value</h2>
        <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
          exact · this shoe
        </span>
      </div>

      {!showLive && (
        <Section title="Waiting for your turn">
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Place a bet and deal. Once you have a hand, this panel shows the
            exact probability of every outcome — computed from the cards left in
            the shoe, not a lookup table.
          </p>
        </Section>
      )}

      {showLive && decision && (
        <>
          <Section title="If you stand now">
            <StackedBar
              segments={[
                {
                  label: 'Win',
                  value: decision.action.stand.pWin,
                  color: 'var(--win)',
                },
                {
                  label: 'Push',
                  value: decision.action.stand.pPush,
                  color: 'var(--push)',
                },
                {
                  label: 'Loss',
                  value: decision.action.stand.pLoss,
                  color: 'var(--loss)',
                },
              ]}
            />
          </Section>

          <Section title="If you hit">
            <div className="flex items-baseline gap-2">
              <span
                className="tabular text-2xl font-bold"
                style={{ color: 'var(--loss)' }}
              >
                {pct(decision.action.bustChance)}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                chance the next card busts you
              </span>
            </div>
          </Section>

          <Section title="Dealer's final hand">
            <DealerBars dist={decision.dealer} />
          </Section>

          <Section title="Expected value per action">
            <table className="w-full text-sm">
              <tbody>
                {(['stand', 'hit', 'double'] as const).map((key) => {
                  const value =
                    key === 'stand'
                      ? decision.action.stand.ev
                      : key === 'hit'
                        ? decision.action.hitEv
                        : decision.action.doubleEv;
                  const available = key !== 'double' || decision.canDouble;
                  const best = decision.action.best === key;
                  if (!available) return null;
                  return (
                    <tr key={key}>
                      <td className="py-1">
                        <span
                          className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-medium"
                          style={{
                            background: best
                              ? 'color-mix(in srgb, var(--accent) 16%, transparent)'
                              : 'transparent',
                            color: best ? 'var(--accent)' : 'var(--text)',
                          }}
                        >
                          {ACTION_LABEL[key]}
                          {best && (
                            <span className="text-[10px] uppercase tracking-wide">
                              best
                            </span>
                          )}
                        </span>
                      </td>
                      <td
                        className="tabular py-1 text-right font-semibold"
                        style={{
                          color:
                            value >= 0 ? 'var(--win)' : 'var(--loss)',
                        }}
                      >
                        {ev(value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
              EV in bet units: an EV of {ev(decision.action.stand.ev)} means that
              action returns, on average, {ev(decision.action.stand.ev)} times
              your stake. Highest EV is the mathematically best play.
            </p>
          </Section>
        </>
      )}
    </div>
  );
}
