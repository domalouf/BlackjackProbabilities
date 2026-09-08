import type { CSSProperties, ReactNode } from 'react';
import { GameSnapshot } from '../game/engine';
import { DualDecisionAnalysis } from '../hooks/useBlackjack';
import { chanceDealerReaches, DealerDistribution } from '../probability';
import { ev, pct } from '../lib/format';

interface Props {
  snapshot: GameSnapshot;
  decision: DualDecisionAnalysis | null;
  style?: CSSProperties;
}

function StackedBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-md">
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
      <div className="mt-1.5 flex flex-col gap-0.5">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="text-[var(--text-muted)]">{s.label}</span>
            <span className="tabular ml-auto font-semibold">{pct(s.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ComparisonColumns({
  countingSegments,
  noCountSegments,
}: {
  countingSegments: { label: string; value: number; color: string }[];
  noCountSegments: { label: string; value: number; color: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
          Counting
        </div>
        <StackedBar segments={countingSegments} />
      </div>
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          No count
        </div>
        <StackedBar segments={noCountSegments} />
      </div>
    </div>
  );
}

function DealerBars({
  counting,
  noCount,
}: {
  counting: DealerDistribution;
  noCount: DealerDistribution;
}) {
  const rows: {
    label: string;
    counting: number;
    noCount: number;
    danger?: boolean;
  }[] = [
    { label: '17', counting: counting.p17, noCount: noCount.p17 },
    { label: '18', counting: counting.p18, noCount: noCount.p18 },
    { label: '19', counting: counting.p19, noCount: noCount.p19 },
    { label: '20', counting: counting.p20, noCount: noCount.p20 },
    {
      label: '21',
      counting: chanceDealerReaches(counting, 21),
      noCount: chanceDealerReaches(noCount, 21),
    },
    {
      label: 'Bust',
      counting: counting.pBust,
      noCount: noCount.pBust,
      danger: true,
    },
  ];
  const max = Math.max(...rows.flatMap((r) => [r.counting, r.noCount]), 0.01);

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-[1.75rem_1fr_1fr] gap-2 text-[10px] font-semibold uppercase tracking-wide">
        <span />
        <span className="text-[var(--accent)]">Counting</span>
        <span className="text-[var(--text-muted)]">No count</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-[1.75rem_1fr_1fr] items-center gap-2"
          >
            <span className="tabular text-xs text-[var(--text-muted)]">
              {r.label}
            </span>
            {[r.counting, r.noCount].map((value, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="h-3 flex-1 rounded-sm bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${(value / max) * 100}%`,
                      background: r.danger ? 'var(--win)' : 'var(--neutral)',
                    }}
                  />
                </div>
                <span className="tabular w-9 shrink-0 text-right text-[11px] font-semibold">
                  {pct(value)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
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

export default function ProbabilityPanel({ snapshot, decision, style }: Props) {
  const showLive = snapshot.phase === 'player' && decision;
  const dimmed = snapshot.phase !== 'player';

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      style={{ ...style, opacity: dimmed ? 0.6 : 1, transition: 'opacity 150ms' }}
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
            exact probability of every outcome, side by side for a player
            counting the shoe and one who isn't — computed from the cards left
            in the shoe, not a lookup table.
          </p>
        </Section>
      )}

      {showLive && decision && (
        <>
          <Section title="Dealer's final hand">
            <DealerBars
              counting={decision.counting.dealer}
              noCount={decision.noCount.dealer}
            />
          </Section>

          <Section title="If you stand now">
            <ComparisonColumns
              countingSegments={[
                {
                  label: 'Win',
                  value: decision.counting.action.stand.pWin,
                  color: 'var(--win)',
                },
                {
                  label: 'Push',
                  value: decision.counting.action.stand.pPush,
                  color: 'var(--push)',
                },
                {
                  label: 'Loss',
                  value: decision.counting.action.stand.pLoss,
                  color: 'var(--loss)',
                },
              ]}
              noCountSegments={[
                {
                  label: 'Win',
                  value: decision.noCount.action.stand.pWin,
                  color: 'var(--win)',
                },
                {
                  label: 'Push',
                  value: decision.noCount.action.stand.pPush,
                  color: 'var(--push)',
                },
                {
                  label: 'Loss',
                  value: decision.noCount.action.stand.pLoss,
                  color: 'var(--loss)',
                },
              ]}
            />
          </Section>

          <Section title="If you hit once, then stand">
            <ComparisonColumns
              countingSegments={[
                {
                  label: 'Win',
                  value: decision.counting.action.hit.pWin,
                  color: 'var(--win)',
                },
                {
                  label: 'Push',
                  value: decision.counting.action.hit.pPush,
                  color: 'var(--push)',
                },
                {
                  label: 'Loss',
                  value: decision.counting.action.hit.pLoss,
                  color: 'var(--loss)',
                },
                {
                  label: 'Bust',
                  value: decision.counting.action.hit.pBust,
                  color: 'color-mix(in srgb, var(--loss) 65%, black)',
                },
              ]}
              noCountSegments={[
                {
                  label: 'Win',
                  value: decision.noCount.action.hit.pWin,
                  color: 'var(--win)',
                },
                {
                  label: 'Push',
                  value: decision.noCount.action.hit.pPush,
                  color: 'var(--push)',
                },
                {
                  label: 'Loss',
                  value: decision.noCount.action.hit.pLoss,
                  color: 'var(--loss)',
                },
                {
                  label: 'Bust',
                  value: decision.noCount.action.hit.pBust,
                  color: 'color-mix(in srgb, var(--loss) 65%, black)',
                },
              ]}
            />
          </Section>

          <Section title="Expected value per action">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide">
                  <td />
                  <td className="pb-1 text-right font-semibold text-[var(--accent)]">
                    Counting
                  </td>
                  <td className="pb-1 text-right font-semibold text-[var(--text-muted)]">
                    No count
                  </td>
                </tr>
              </thead>
              <tbody>
                {(['stand', 'hit', 'double'] as const).map((key) => {
                  const countingValue =
                    key === 'stand'
                      ? decision.counting.action.stand.ev
                      : key === 'hit'
                        ? decision.counting.action.hitEv
                        : decision.counting.action.doubleEv;
                  const noCountValue =
                    key === 'stand'
                      ? decision.noCount.action.stand.ev
                      : key === 'hit'
                        ? decision.noCount.action.hitEv
                        : decision.noCount.action.doubleEv;
                  const available = key !== 'double' || decision.counting.canDouble;
                  const best = decision.counting.action.best === key;
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
                          color: countingValue >= 0 ? 'var(--win)' : 'var(--loss)',
                        }}
                      >
                        {ev(countingValue)}
                      </td>
                      <td
                        className="tabular py-1 text-right font-semibold text-[var(--text-muted)]"
                      >
                        {ev(noCountValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
              EV in bet units. <strong>Counting</strong> uses the shoe's real
              composition, tracking every card seen since the last shuffle.{' '}
              <strong>No count</strong> assumes a fresh shoe each hand — the
              basic-strategy baseline a player who isn't counting relies on.
            </p>
          </Section>
        </>
      )}
    </div>
  );
}
