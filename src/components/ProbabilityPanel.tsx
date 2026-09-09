import { useState, type CSSProperties, type ReactNode } from 'react';
import { GameSnapshot } from '../game/engine';
import { DecisionAnalysis, DualDecisionAnalysis } from '../hooks/useBlackjack';
import { chanceDealerReaches, DealerDistribution } from '../probability';
import { ev, pct, pctDelta } from '../lib/format';

interface Props {
  snapshot: GameSnapshot;
  decision: DualDecisionAnalysis | null;
  style?: CSSProperties;
}

type Mode = 'noCount' | 'counting';

function DeltaBadge({ diff, digits = 1 }: { diff: number; digits?: number }) {
  if (Math.abs(diff) < 0.0005) return null;
  return (
    <span className="tabular ml-1 text-[10px] font-medium text-[var(--text-muted)]">
      ({pctDelta(diff, digits)})
    </span>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) {
  const OPTIONS: { key: Mode; label: string }[] = [
    { key: 'noCount', label: 'No count' },
    { key: 'counting', label: 'Counting' },
  ];
  return (
    <div className="inline-flex gap-0.5 rounded-lg bg-[var(--surface-2)] p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className="rounded-md px-2.5 py-1 text-[11px] font-semibold transition"
          style={{
            background: mode === o.key ? 'var(--surface)' : 'transparent',
            color: mode === o.key ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: mode === o.key ? '0 1px 2px rgba(0,0,0,0.08)' : undefined,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StackedBar({
  segments,
}: {
  segments: { label: string; value: number; baseline?: number; color: string }[];
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
            {s.baseline !== undefined && (
              <DeltaBadge diff={s.value - s.baseline} />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function DealerBars({
  dist,
  baseline,
}: {
  dist: DealerDistribution;
  baseline?: DealerDistribution;
}) {
  const rows: { label: string; value: number; base?: number; danger?: boolean }[] = [
    { label: '17', value: dist.p17, base: baseline?.p17 },
    { label: '18', value: dist.p18, base: baseline?.p18 },
    { label: '19', value: dist.p19, base: baseline?.p19 },
    { label: '20', value: dist.p20, base: baseline?.p20 },
    {
      label: '21',
      value: chanceDealerReaches(dist, 21),
      base: baseline && chanceDealerReaches(baseline, 21),
    },
    {
      label: 'Bust',
      value: dist.pBust,
      base: baseline?.pBust,
      danger: true,
    },
  ];
  const max = Math.max(...rows.map((r) => r.value), 0.01);
  return (
    <div className="space-y-1 sm:space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="tabular w-8 text-right text-xs text-[var(--text-muted)]">
            {r.label}
          </span>
          <div className="h-3 flex-1 rounded-sm bg-[var(--surface-2)] sm:h-3.5">
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
          {r.base !== undefined && <DeltaBadge diff={r.value - r.base} />}
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
    <section className="border-t border-[var(--border)] px-3 py-2.5 first:border-t-0 sm:px-4 sm:py-3.5">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] sm:mb-2.5">
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
  const [mode, setMode] = useState<Mode>('noCount');
  const showLive = snapshot.phase === 'player' && decision;
  const dimmed = snapshot.phase !== 'player';

  const active: DecisionAnalysis | null = decision
    ? decision[mode]
    : null;
  const baseline: DecisionAnalysis | null =
    decision && mode === 'counting' ? decision.noCount : null;

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      style={{ ...style, opacity: dimmed ? 0.6 : 1, transition: 'opacity 150ms' }}
    >
      <div className="px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">Odds &amp; expected value</h2>
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            exact
          </span>
        </div>
        {showLive && (
          <div className="mt-1.5 flex items-center justify-between gap-2 sm:mt-2">
            <ModeToggle mode={mode} onChange={setMode} />
            {baseline && (
              <span className="text-[10px] leading-tight text-[var(--text-muted)]">
                (Δ vs no count)
              </span>
            )}
          </div>
        )}
      </div>

      {!showLive && (
        <Section title="Waiting for your turn">
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Place a bet and deal. Once you have a hand, this panel shows the
            exact probability of every outcome — computed from the cards left
            in the shoe, not a lookup table.{' '}
            <span className="hidden sm:inline">
              Switch to "Counting" to see how those odds shift once the
              shoe's depletion is factored in.
            </span>
          </p>
        </Section>
      )}

      {showLive && active && (
        <>
          <Section title="Dealer's final hand">
            <DealerBars dist={active.dealer} baseline={baseline?.dealer} />
          </Section>

          <Section title="If you stand now">
            <StackedBar
              segments={[
                {
                  label: 'Win',
                  value: active.action.stand.pWin,
                  baseline: baseline?.action.stand.pWin,
                  color: 'var(--win)',
                },
                {
                  label: 'Push',
                  value: active.action.stand.pPush,
                  baseline: baseline?.action.stand.pPush,
                  color: 'var(--push)',
                },
                {
                  label: 'Loss',
                  value: active.action.stand.pLoss,
                  baseline: baseline?.action.stand.pLoss,
                  color: 'var(--loss)',
                },
              ]}
            />
          </Section>

          <Section title="If you hit once, then stand">
            <StackedBar
              segments={[
                {
                  label: 'Win',
                  value: active.action.hit.pWin,
                  baseline: baseline?.action.hit.pWin,
                  color: 'var(--win)',
                },
                {
                  label: 'Push',
                  value: active.action.hit.pPush,
                  baseline: baseline?.action.hit.pPush,
                  color: 'var(--push)',
                },
                {
                  label: 'Loss',
                  value: active.action.hit.pLoss,
                  baseline: baseline?.action.hit.pLoss,
                  color: 'var(--loss)',
                },
                {
                  label: 'Bust',
                  value: active.action.hit.pBust,
                  baseline: baseline?.action.hit.pBust,
                  color: 'color-mix(in srgb, var(--loss) 65%, black)',
                },
              ]}
            />
          </Section>

          <Section title="Expected value per action">
            <table className="w-full text-sm">
              <tbody>
                {(['stand', 'hit', 'double'] as const).map((key) => {
                  const value =
                    key === 'stand'
                      ? active.action.stand.ev
                      : key === 'hit'
                        ? active.action.hitEv
                        : active.action.doubleEv;
                  const baseValue = baseline
                    ? key === 'stand'
                      ? baseline.action.stand.ev
                      : key === 'hit'
                        ? baseline.action.hitEv
                        : baseline.action.doubleEv
                    : undefined;
                  const available = key !== 'double' || active.canDouble;
                  const best = active.action.best === key;
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
                          color: value >= 0 ? 'var(--win)' : 'var(--loss)',
                        }}
                      >
                        {ev(value)}
                        {baseValue !== undefined && (
                          <span className="tabular ml-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                            ({ev(value - baseValue)})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 hidden text-[11px] leading-relaxed text-[var(--text-muted)] sm:block">
              EV in bet units: an EV of {ev(active.action.stand.ev)} means that
              action returns, on average, {ev(active.action.stand.ev)} times
              your stake.{' '}
              {mode === 'noCount'
                ? 'Assumes a fresh shoe each hand — the basic-strategy baseline.'
                : "Uses the shoe's real composition; figures in parentheses are the change from not counting."}
            </p>
          </Section>
        </>
      )}
    </div>
  );
}
