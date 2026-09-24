import type { ReactNode } from 'react';
import { GameSnapshot } from '../game/engine';
import { ev } from '../lib/format';

type Action = 'hit' | 'stand' | 'double';

interface Props {
  snapshot: GameSnapshot;
  canDouble: boolean;
  recommended: Action | null;
  /** EV in bet units for each action, `null` outside the player's turn. */
  evValues: Record<Action, number> | null;
  /** Change in each EV from the no-count baseline, shown in Counting mode. */
  evDeltas: Record<Action, number> | null;
  onDeal: () => void;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
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
      className={`relative flex min-w-[5.5rem] flex-col items-center rounded-xl bg-[var(--chip)] px-4 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition enabled:hover:bg-[var(--chip-hover)] enabled:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[6.5rem] ${FOCUS}`}
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
      {showEv && evDelta !== undefined && (
        <span className="tabular text-[10px] font-medium text-[var(--text-muted)]">
          ({ev(evDelta)})
        </span>
      )}
      {best && (
        <span className="absolute -top-2 rounded-full bg-[var(--gold)] px-1.5 text-[9px] font-bold uppercase leading-4 tracking-wider text-[var(--gold-ink)]">
          Best
        </span>
      )}
    </button>
  );
}

export default function Controls({
  snapshot,
  canDouble,
  recommended,
  evValues,
  evDeltas,
  onDeal,
  onHit,
  onStand,
  onDouble,
  onPlayAgain,
}: Props) {
  if (snapshot.phase === 'betting') {
    return (
      <div className="flex flex-col items-center gap-2">
        <PrimaryButton onClick={onDeal}>Deal</PrimaryButton>
        <p className="text-center text-xs text-[var(--text-muted)]">
          Every hand bets 1 unit — double down to raise it to 2.
        </p>
      </div>
    );
  }

  if (snapshot.phase === 'player') {
    return (
      <div className="flex flex-wrap justify-center gap-3">
        <ActionButton
          label="Hit"
          onClick={onHit}
          best={recommended === 'hit'}
          evValue={evValues?.hit}
          evDelta={evDeltas?.hit}
        />
        <ActionButton
          label="Stand"
          onClick={onStand}
          best={recommended === 'stand'}
          evValue={evValues?.stand}
          evDelta={evDeltas?.stand}
        />
        <ActionButton
          label="Double"
          onClick={onDouble}
          disabled={!canDouble}
          best={recommended === 'double' && canDouble}
          evValue={canDouble ? evValues?.double : undefined}
          evDelta={evDeltas?.double}
        />
      </div>
    );
  }

  if (snapshot.phase === 'dealer') {
    return (
      <p className="text-center text-sm text-[var(--text-muted)]">
        Dealer drawing…
      </p>
    );
  }

  return (
    <div className="flex justify-center">
      <PrimaryButton onClick={onPlayAgain}>Next hand</PrimaryButton>
    </div>
  );
}
