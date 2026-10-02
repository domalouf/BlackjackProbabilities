import type { ReactNode } from 'react';
import { GamePhase } from '../game/engine';
import { PlayerAction } from '../probability';
import { ev, pctDelta, signedPct } from '../lib/format';

type Evs = Partial<Record<PlayerAction, number>>;

/** The insurance / even-money offer, as the buttons show it. */
export interface InsuranceOffer {
  evenMoney: boolean;
  takeEv: number;
  declineEv: number;
  /** Change from the no-count figures, shown in Counting mode. */
  takeDelta?: number;
  declineDelta?: number;
  best: 'take' | 'decline';
}

/** What's known about the next hand, shown between hands. */
export interface NextHand {
  /** Edge for the next hand, `null` while it's being worked out. */
  edge: number | null;
  /** Change from the no-count edge, shown in Counting mode. */
  edgeDelta: number | null;
  /** The next hand comes from a freshly shuffled shoe. */
  newShoe: boolean;
}

interface Props {
  phase: GamePhase;
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
  recommended: PlayerAction | null;
  /** EV in bet units for each action, `null` outside the player's turn. */
  evValues: Evs | null;
  /** Change in each EV from the no-count baseline, shown in Counting mode. */
  evDeltas: Evs | null;
  insurance: InsuranceOffer | null;
  nextHand: NextHand;
  onDeal: () => void;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onSplit: () => void;
  onSurrender: () => void;
  onTakeInsurance: () => void;
  onDeclineInsurance: () => void;
  onPlayAgain: () => void;
}

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

function PrimaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full bg-[var(--gold)] px-7 py-2.5 text-sm font-bold text-[var(--gold-ink)] shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition hover:brightness-105 active:translate-y-px ${FOCUS}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** A change from the no-count figure, in the count's up / down colors. */
function CountDelta({
  diff,
  className = '',
  children,
}: {
  diff: number;
  className?: string;
  children: ReactNode;
}) {
  const tone = diff > 0 ? 'up' : diff < 0 ? 'down' : null;
  return (
    <span
      className={`tabular rounded px-1 text-[10px] font-semibold leading-4 ${className}`}
      style={{
        color: tone ? `var(--count-${tone})` : 'var(--text-muted)',
        background: tone ? `var(--count-${tone}-bg)` : undefined,
      }}
    >
      {children}
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  best,
  evValue,
  evDelta,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  best?: boolean;
  evValue?: number;
  evDelta?: number;
}) {
  const showEv = evValue !== undefined && Number.isFinite(evValue);
  return (
    <button
      className={`relative flex min-w-[4.75rem] flex-col items-center rounded-xl bg-[var(--chip)] px-3 py-2 transition enabled:hover:bg-[var(--chip-hover)] enabled:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[5.25rem] ${FOCUS}`}
      style={{
        boxShadow: best
          ? '0 0 0 2px var(--gold), 0 2px 8px rgba(0,0,0,0.25)'
          : 'inset 0 0 0 1px var(--line), 0 2px 8px rgba(0,0,0,0.25)',
      }}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="text-sm font-bold">{label}</span>
      {showEv && (
        <span
          className="tabular text-[11px] font-semibold"
          style={{ color: evValue >= 0 ? 'var(--win)' : 'var(--loss)' }}
        >
          EV {ev(evValue)}
        </span>
      )}
      {showEv && evDelta !== undefined && Math.abs(evDelta) >= 0.0005 && (
        <CountDelta diff={evDelta} className="mt-0.5">
          {ev(evDelta)}
        </CountDelta>
      )}
      {best && (
        <span className="absolute -top-2 rounded-full bg-[var(--gold)] px-1.5 text-[9px] font-bold uppercase leading-4 tracking-wider text-[var(--gold-ink)]">
          Best
        </span>
      )}
    </button>
  );
}

function NextHandPanel({
  nextHand: { edge, edgeDelta, newShoe },
  action,
  onAction,
}: {
  nextHand: NextHand;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <p className="text-center text-xs text-[var(--text-muted)]" aria-live="polite">
        {edge === null ? (
          'Working out your edge on the next hand…'
        ) : (
          <>
            {newShoe && 'New shoe · '}
            Your edge next hand{' '}
            <span
              className="tabular font-bold"
              style={{ color: edge > 0 ? 'var(--win)' : 'var(--loss)' }}
            >
              {signedPct(edge)}
            </span>
            {edgeDelta !== null && Math.abs(edgeDelta) >= 0.00005 && (
              <>
                {' '}
                <CountDelta diff={edgeDelta}>{pctDelta(edgeDelta, 2)}</CountDelta> vs no
                count
              </>
            )}
          </>
        )}
      </p>
      <PrimaryButton onClick={onAction}>{action}</PrimaryButton>
    </div>
  );
}

export default function Controls({
  phase,
  canDouble,
  canSplit,
  canSurrender,
  recommended,
  evValues,
  evDeltas,
  insurance,
  nextHand,
  onDeal,
  onHit,
  onStand,
  onDouble,
  onSplit,
  onSurrender,
  onTakeInsurance,
  onDeclineInsurance,
  onPlayAgain,
}: Props) {
  if (phase === 'betting') {
    return <NextHandPanel nextHand={nextHand} action="Deal" onAction={onDeal} />;
  }

  if (phase === 'insurance' && insurance) {
    return (
      <div className="flex flex-col items-center gap-2.5">
        <p className="text-center text-xs text-[var(--text-muted)]">
          {insurance.evenMoney
            ? 'Dealer shows an Ace. Take even money (1:1 now), or play on for 3:2?'
            : 'Dealer shows an Ace. Insurance costs ½ unit and pays 2:1 if the dealer has blackjack.'}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <ActionButton
            label={insurance.evenMoney ? 'Even money' : 'Insurance'}
            onClick={onTakeInsurance}
            best={insurance.best === 'take'}
            evValue={insurance.takeEv}
            evDelta={insurance.takeDelta}
          />
          <ActionButton
            label={insurance.evenMoney ? 'Play on' : 'No insurance'}
            onClick={onDeclineInsurance}
            best={insurance.best === 'decline'}
            evValue={insurance.declineEv}
            evDelta={insurance.declineDelta}
          />
        </div>
      </div>
    );
  }

  if (phase === 'player') {
    const button = (
      action: PlayerAction,
      label: string,
      onClick: () => void,
      allowed = true,
    ) => (
      <ActionButton
        label={label}
        onClick={onClick}
        disabled={!allowed}
        best={recommended === action && allowed}
        evValue={allowed ? evValues?.[action] : undefined}
        evDelta={evDeltas?.[action]}
      />
    );
    return (
      <div className="flex flex-wrap justify-center gap-2.5">
        {button('hit', 'Hit', onHit)}
        {button('stand', 'Stand', onStand)}
        {button('double', 'Double', onDouble, canDouble)}
        {canSplit && button('split', 'Split', onSplit)}
        {canSurrender && button('surrender', 'Surrender', onSurrender)}
      </div>
    );
  }

  if (phase === 'dealer') {
    return (
      <p className="py-3 text-center text-sm text-[var(--text-muted)]">
        Dealer drawing…
      </p>
    );
  }

  return (
    <NextHandPanel nextHand={nextHand} action="Next hand" onAction={onPlayAgain} />
  );
}
