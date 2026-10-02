import type { CSSProperties, ReactNode } from 'react';
import { DecisionAnalysis, DualDecisionAnalysis } from '../hooks/useBlackjack';
import {
  chanceDealerReaches,
  DealerDistribution,
  InsuranceDecision,
} from '../probability';
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
  /** The insurance offer, while it's open — replaces the regular odds. */
  insurance?: InsuranceDecision | null;
  /** No-count insurance figures to diff against, in Counting mode. */
  insuranceBaseline?: InsuranceDecision | null;
  style?: CSSProperties;
}

const fmt = (value: number | null) => (value === null ? '—' : pct(value));

/** Changes smaller than this (0.05pp) round to nothing and aren't shown. */
const NOISE = 0.0005;

/** How far counting moved a figure from its no-count value, 0 if not at all. */
const shift = (value: number | null, base?: number): number => {
  if (value === null || base === undefined) return 0;
  const diff = value - base;
  return Math.abs(diff) < NOISE ? 0 : diff;
};

function DeltaBadge({ diff, digits = 1 }: { diff: number; digits?: number }) {
  if (diff === 0) return null;
  const up = diff > 0;
  return (
    <span
      className="tabular rounded px-1 text-[10px] font-semibold leading-4"
      style={{
        color: up ? 'var(--count-up)' : 'var(--count-down)',
        background: up ? 'var(--count-up-bg)' : 'var(--count-down-bg)',
      }}
    >
      {pctDelta(diff, digits)}
    </span>
  );
}

/**
 * One bar's fill, split so the change from not counting stands out: the share
 * both shoes agree on in the bar's own color, then whatever counting added in
 * solid sky, or whatever it took away hatched in orchid.
 */
function ShiftedFill({
  label,
  value,
  base,
  color,
  scale,
  rounded,
}: {
  label: string;
  value: number | null;
  base?: number;
  color: string;
  /** The figure that spans the full bar. */
  scale: number;
  rounded?: boolean;
}) {
  const v = value ?? 0;
  const diff = shift(value, base);
  const width = (x: number) => `${(Math.max(x, 0) / scale) * 100}%`;
  return (
    <div
      className={`flex h-full ${rounded ? 'overflow-hidden rounded-full' : ''}`}
      title={`${label}: ${fmt(value)}${diff ? ` (${pctDelta(diff)} vs no count)` : ''}`}
    >
      <div
        className="h-full transition-[width] duration-300"
        style={{ width: width(diff < 0 ? v : v - diff), background: color }}
      />
      <div
        className={`h-full transition-[width] duration-300 ${diff < 0 ? 'count-removed' : ''}`}
        style={{
          width: width(Math.abs(diff)),
          // Even a tenth of a point should show as a sliver, not vanish.
          minWidth: diff ? 3 : 0,
          background: diff > 0 ? 'var(--count-up)' : undefined,
        }}
      />
    </div>
  );
}

/** Room a figure takes in a bar: its no-count value too, if counting cut it. */
const footprint = (value: number | null, base?: number): number =>
  (value ?? 0) - Math.min(shift(value, base), 0);

/** What the sky and orchid in the bars mean, beside each Counting heading. */
function CountKey() {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap" title="Change from not counting">
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-3 rounded-sm bg-[var(--count-up)]" />
        up
      </span>
      <span className="flex items-center gap-1">
        <span className="count-removed inline-block h-2 w-3 rounded-sm" />
        down
      </span>
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
  // A segment that shrank keeps its old footprint (hatched), so the bar spans
  // the larger of each figure; the change is a few points, the stretch small.
  const span = Math.max(
    segments.reduce((sum, s) => sum + footprint(s.value, s.baseline), 0),
    1,
  );
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--track)] sm:h-3">
        {segments.map((s) => {
          const room = footprint(s.value, s.baseline);
          return (
            <div
              key={s.label}
              className="h-full transition-[width] duration-300"
              style={{ width: `${(room / span) * 100}%` }}
            >
              <ShiftedFill
                label={s.label}
                value={s.value}
                base={s.baseline}
                color={s.color}
                scale={room || 1}
              />
            </div>
          );
        })}
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
            <DeltaBadge diff={shift(s.value, s.baseline)} />
          </span>
        ))}
      </div>
    </div>
  );
}

interface BarRow {
  label: string;
  value: number | null;
  base?: number;
  highlight?: string;
}

function BarRows({ rows, scale }: { rows: BarRow[]; scale?: number }) {
  const counting = rows.some((r) => r.base !== undefined);
  const max =
    scale ??
    Math.max(...rows.map((r) => Math.max(r.value ?? 0, r.base ?? 0)), 0.01);
  return (
    <div className="space-y-1 sm:space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span
            className="tabular w-8 shrink-0 text-right text-xs"
            style={{ color: r.highlight ?? 'var(--text-muted)' }}
          >
            {r.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--track)] sm:h-3">
            <ShiftedFill
              label={r.label}
              value={r.value}
              base={r.base}
              color={r.highlight ?? 'var(--neutral)'}
              scale={max}
              rounded
            />
          </div>
          <span className="tabular w-12 text-right text-xs font-semibold">
            {fmt(r.value)}
          </span>
          {counting && (
            <span className="flex w-12 shrink-0 justify-end">
              <DeltaBadge diff={shift(r.value, r.base)} />
            </span>
          )}
        </div>
      ))}
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
  return (
    <BarRows
      rows={[
        { label: '17', value: dist && dist.p17, base: baseline?.p17 },
        { label: '18', value: dist && dist.p18, base: baseline?.p18 },
        { label: '19', value: dist && dist.p19, base: baseline?.p19 },
        { label: '20', value: dist && dist.p20, base: baseline?.p20 },
        {
          label: '21',
          value: dist && chanceDealerReaches(dist, 21),
          base: baseline && chanceDealerReaches(baseline, 21),
        },
        {
          label: 'Bust',
          value: dist && dist.pBust,
          base: baseline?.pBust,
          highlight: 'var(--win)',
        },
      ]}
    />
  );
}

function caption(stale: boolean, baseline: DecisionAnalysis | null) {
  if (stale) return 'at your last decision';
  if (baseline) return <CountKey />;
  return null;
}

const dimmed = (stale: boolean, active: DecisionAnalysis | null): CSSProperties => ({
  opacity: stale || !active ? 0.55 : 1,
  transition: 'opacity 150ms',
});

/** Where the dealer's hand will finish — shown beside the dealer's cards. */
export function DealerOdds({
  active,
  baseline,
  stale,
  insurance,
  insuranceBaseline,
  style,
}: OddsProps) {
  if (insurance) {
    const p = insurance.pDealerBlackjack;
    const base = insuranceBaseline?.pDealerBlackjack;
    return (
      <section className="mx-auto w-full max-w-md lg:max-w-none" style={style}>
        <Heading
          title="Dealer's hole card"
          aside={insuranceBaseline ? <CountKey /> : null}
        />
        <BarRows
          scale={1}
          rows={[
            { label: 'Ten', value: p, base, highlight: 'var(--loss)' },
            {
              label: 'Other',
              value: 1 - p,
              base: base === undefined ? undefined : 1 - base,
            },
          ]}
        />
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
          A ten under the Ace is blackjack. The dealer checks once you've
          decided on insurance.
        </p>
      </section>
    );
  }

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

/** Insurance explained, while the offer is open. */
function InsuranceOdds({
  insurance,
  baseline,
}: {
  insurance: InsuranceDecision;
  baseline?: InsuranceDecision | null;
}) {
  const p = insurance.pDealerBlackjack;
  return (
    <div>
      <Heading title={insurance.evenMoney ? 'Even money' : 'Insurance'} />
      <StackedBar
        segments={[
          {
            label: 'Dealer blackjack',
            value: p,
            baseline: baseline?.pDealerBlackjack,
            color: 'var(--loss)',
          },
          {
            label: 'No blackjack',
            value: 1 - p,
            baseline: baseline ? 1 - baseline.pDealerBlackjack : undefined,
            color: 'var(--neutral)',
          },
        ]}
      />
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
        {insurance.evenMoney ? (
          <>
            Even money locks in +1 whatever the hole card is. Playing on pays
            +1.5 unless the dealer also has blackjack, which pushes — worth{' '}
            {ev(insurance.declineEv)} on average.
          </>
        ) : (
          <>
            Insurance wins +1 (2:1 on its ½ unit) when the dealer has
            blackjack and loses ½ otherwise, so it only pays when more than a
            third of the unseen cards are tens — here it's worth{' '}
            {ev(insurance.takeEv)}.
          </>
        )}
      </p>
    </div>
  );
}

/** What standing or taking a card does to your hand — beside your cards. */
export function PlayerOdds({
  active,
  baseline,
  stale,
  insurance,
  insuranceBaseline,
  mode,
  handLabel,
  style,
}: OddsProps & {
  mode: OddsMode;
  /** Which hand the odds are for, once a pair has been split. */
  handLabel?: string;
}) {
  if (insurance) {
    return (
      <section className="mx-auto w-full max-w-md lg:max-w-none" style={style}>
        <InsuranceOdds insurance={insurance} baseline={insuranceBaseline} />
      </section>
    );
  }

  const stand = active?.action.stand;
  const hit = active?.action.hit;
  const prefix = handLabel ? `${handLabel} · ` : '';
  return (
    <section
      className="mx-auto flex w-full max-w-md flex-col gap-3 sm:gap-4 lg:max-w-none"
      style={{ ...style, ...dimmed(stale, active) }}
    >
      <div>
        <Heading
          title={`${prefix}If you stand now`}
          aside={caption(stale, baseline)}
        />
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
        <Heading title={`${prefix}If you hit once, then stand`} />
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
            {active.canSplit && 'Split counts both hands, in units of your first bet. '}
            {mode === 'noCount'
              ? 'Assumes a fresh shoe each hand — the basic-strategy baseline.'
              : "Uses the shoe's real composition. Sky marks what the count adds to each chance, hatched orchid what it takes away."}
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
