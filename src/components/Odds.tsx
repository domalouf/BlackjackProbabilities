import type { CSSProperties, ReactNode } from 'react';
import { DecisionAnalysis, DualDecisionAnalysis } from '../hooks/useBlackjack';
import { chanceDealerReaches, DealerDistribution } from '../probability';
import { ev, pct, pctDelta } from '../lib/format';

/** Which shoe assumption the odds use — see {@link DualDecisionAnalysis}. */
export type OddsMode = keyof DualDecisionAnalysis;

interface OddsProps {
  /** Odds under the selected mode, `null` until a hand has been analysed. */
  active: DecisionAnalysis | null;
  /** No-count odds to diff against, set only in Counting mode. */
  baseline: DecisionAnalysis | null;
  /** The odds are from the last decision of a hand that has since ended. */
  stale: boolean;
  style?: CSSProperties;
}

const fmt = (value: number | null) => (value === null ? '—' : pct(value));

function DeltaBadge({ diff, digits = 1 }: { diff: number; digits?: number }) {
  if (Math.abs(diff) < 0.0005) return null;
  return (
    <span className="tabular ml-1 text-[10px] font-medium text-[var(--text-muted)]">
      ({pctDelta(diff, digits)})
    </span>
  );
}

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: OddsMode;
  onChange: (mode: OddsMode) => void;
}) {
  const OPTIONS: { key: OddsMode; label: string }[] = [
    { key: 'noCount', label: 'No count' },
    { key: 'counting', label: 'Counting' },
  ];
  return (
    <div
      role="group"
      aria-label="Odds assume"
      className="inline-flex gap-0.5 rounded-full bg-[var(--chip)] p-0.5"
      style={{ boxShadow: 'inset 0 0 0 1px var(--line)' }}
    >
      {OPTIONS.map((o) => {
        const on = mode === o.key;
        return (
          <button
            key={o.key}
            aria-pressed={on}
            onClick={() => onChange(o.key)}
            className="rounded-full px-3 py-1 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            style={{
              background: on ? 'var(--ink)' : 'transparent',
              color: on ? 'var(--felt-edge)' : 'var(--text-muted)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Heading({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2 sm:mb-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {title}
      </h3>
      {aside && (
        <span className="text-[10px] leading-tight text-[var(--text-muted)]">
          {aside}
        </span>
      )}
    </div>
  );
}

function StackedBar({
  segments,
}: {
  segments: {
    label: string;
    value: number | null;
    baseline?: number;
    color: string;
  }[];
}) {
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--track)] sm:h-3">
        {segments.map((s) => (
          <div
            key={s.label}
            className="h-full transition-[width] duration-300"
            style={{
              width: `${Math.max((s.value ?? 0) * 100, 0)}%`,
              background: s.color,
            }}
            title={`${s.label}: ${fmt(s.value)}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-[var(--text-muted)]">{s.label}</span>
            <span className="tabular font-semibold">{fmt(s.value)}</span>
            {s.value !== null && s.baseline !== undefined && (
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
  dist: DealerDistribution | null;
  baseline?: DealerDistribution;
}) {
  const rows: { label: string; value: number | null; base?: number; bust?: boolean }[] = [
    { label: '17', value: dist && dist.p17, base: baseline?.p17 },
    { label: '18', value: dist && dist.p18, base: baseline?.p18 },
    { label: '19', value: dist && dist.p19, base: baseline?.p19 },
    { label: '20', value: dist && dist.p20, base: baseline?.p20 },
    {
      label: '21',
      value: dist && chanceDealerReaches(dist, 21),
      base: baseline && chanceDealerReaches(baseline, 21),
    },
    { label: 'Bust', value: dist && dist.pBust, base: baseline?.pBust, bust: true },
  ];
  const max = Math.max(...rows.map((r) => r.value ?? 0), 0.01);
  return (
    <div className="space-y-1 sm:space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span
            className="tabular w-8 text-right text-xs"
            style={{ color: r.bust ? 'var(--win)' : 'var(--text-muted)' }}
          >
            {r.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--track)] sm:h-3">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{
                width: `${((r.value ?? 0) / max) * 100}%`,
                background: r.bust ? 'var(--win)' : 'var(--neutral)',
              }}
            />
          </div>
          <span className="tabular w-12 text-right text-xs font-semibold">
            {fmt(r.value)}
          </span>
          {r.value !== null && r.base !== undefined && (
            <DeltaBadge diff={r.value - r.base} />
          )}
        </div>
      ))}
    </div>
  );
}

function caption(stale: boolean, baseline: DecisionAnalysis | null) {
  if (stale) return 'at your last decision';
  if (baseline) return '(Δ vs no count)';
  return null;
}

const dimmed = (stale: boolean, active: DecisionAnalysis | null): CSSProperties => ({
  opacity: stale || !active ? 0.55 : 1,
  transition: 'opacity 150ms',
});

/** Where the dealer's hand will finish — shown beside the dealer's cards. */
export function DealerOdds({ active, baseline, stale, style }: OddsProps) {
  return (
    <section
      className="mx-auto w-full max-w-md lg:max-w-none"
      style={{ ...style, ...dimmed(stale, active) }}
    >
      <Heading title="Dealer's final hand" aside={caption(stale, baseline)} />
      <DealerBars dist={active?.dealer ?? null} baseline={baseline?.dealer} />
    </section>
  );
}

/** What standing or taking a card does to your hand — beside your cards. */
export function PlayerOdds({
  active,
  baseline,
  stale,
  mode,
  style,
}: OddsProps & { mode: OddsMode }) {
  const stand = active?.action.stand;
  const hit = active?.action.hit;
  return (
    <section
      className="mx-auto flex w-full max-w-md flex-col gap-3 sm:gap-4 lg:max-w-none"
      style={{ ...style, ...dimmed(stale, active) }}
    >
      <div>
        <Heading title="If you stand now" aside={caption(stale, baseline)} />
        <StackedBar
          segments={[
            {
              label: 'Win',
              value: stand?.pWin ?? null,
              baseline: baseline?.action.stand.pWin,
              color: 'var(--win)',
            },
            {
              label: 'Push',
              value: stand?.pPush ?? null,
              baseline: baseline?.action.stand.pPush,
              color: 'var(--push)',
            },
            {
              label: 'Loss',
              value: stand?.pLoss ?? null,
              baseline: baseline?.action.stand.pLoss,
              color: 'var(--loss)',
            },
          ]}
        />
      </div>

      <div>
        <Heading title="If you hit once, then stand" />
        <StackedBar
          segments={[
            {
              label: 'Win',
              value: hit?.pWin ?? null,
              baseline: baseline?.action.hit.pWin,
              color: 'var(--win)',
            },
            {
              label: 'Push',
              value: hit?.pPush ?? null,
              baseline: baseline?.action.hit.pPush,
              color: 'var(--push)',
            },
            {
              label: 'Loss',
              value: hit?.pLoss ?? null,
              baseline: baseline?.action.hit.pLoss,
              color: 'var(--loss)',
            },
            {
              label: 'Bust',
              value: hit?.pBust ?? null,
              baseline: baseline?.action.hit.pBust,
              color: 'var(--bust)',
            },
          ]}
        />
      </div>

      <p className="hidden text-[11px] leading-relaxed text-[var(--text-muted)] sm:block">
        {active ? (
          <>
            The EV on each button is in bet units: an EV of{' '}
            {ev(active.action.stand.ev)} means that action returns, on average,{' '}
            {ev(active.action.stand.ev)} times your stake.{' '}
            {mode === 'noCount'
              ? 'Assumes a fresh shoe each hand — the basic-strategy baseline.'
              : "Uses the shoe's real composition; figures in parentheses are the change from not counting."}
          </>
        ) : (
          <>
            Once you have a hand, these odds are computed exactly from the
            cards left in the shoe, not a lookup table. Switch to "Counting" to
            see how they shift once the shoe's depletion is factored in.
          </>
        )}
      </p>
    </section>
  );
}
