import type { ReactNode } from 'react';
import { GameSnapshot } from '../game/engine';
import { ev } from '../lib/format';

interface Props {
  snapshot: GameSnapshot;
  canDouble: boolean;
  recommended: 'hit' | 'stand' | 'double' | null;
  /** EV in bet units for each action, `null` outside the player's turn. */
  evValues: { hit: number; stand: number; double: number } | null;
  onDeal: () => void;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onPlayAgain: () => void;
}

function Btn({
  children,
  onClick,
  disabled,
  variant = 'default',
  hint,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'ghost';
  hint?: boolean;
}) {
  const base =
    'relative rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40';
  const styles =
    variant === 'primary'
      ? { background: 'var(--accent)', color: '#fff' }
      : variant === 'ghost'
        ? { background: 'transparent', color: 'var(--text-muted)' }
        : { background: 'var(--surface-2)', color: 'var(--text)' };
  return (
    <button
      className={base}
      style={{
        ...styles,
        outline: hint ? '2px solid var(--accent)' : undefined,
        outlineOffset: 2,
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  hint,
  evValue,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  hint?: boolean;
  evValue?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Btn onClick={onClick} disabled={disabled} hint={hint}>
        {children}
      </Btn>
      {evValue !== undefined && Number.isFinite(evValue) && (
        <span
          className="tabular text-[11px] font-semibold"
          style={{ color: evValue >= 0 ? 'var(--win)' : 'var(--loss)' }}
        >
          {ev(evValue)}
        </span>
      )}
    </div>
  );
}

export default function Controls({
  snapshot,
  canDouble,
  recommended,
  evValues,
  onDeal,
  onHit,
  onStand,
  onDouble,
  onPlayAgain,
}: Props) {
  if (snapshot.phase === 'betting') {
    return (
      <div className="flex items-center gap-3">
        <Btn variant="primary" onClick={onDeal}>
          Deal
        </Btn>
        <p className="text-sm text-[var(--text-muted)]">
          Every hand bets 1 unit — double down to raise it to 2.
        </p>
      </div>
    );
  }

  if (snapshot.phase === 'player') {
    return (
      <div className="flex flex-wrap gap-3">
        <ActionButton
          onClick={onHit}
          hint={recommended === 'hit'}
          evValue={evValues?.hit}
        >
          Hit
        </ActionButton>
        <ActionButton
          onClick={onStand}
          hint={recommended === 'stand'}
          evValue={evValues?.stand}
        >
          Stand
        </ActionButton>
        <ActionButton
          onClick={onDouble}
          disabled={!canDouble}
          hint={recommended === 'double' && canDouble}
          evValue={evValues?.double}
        >
          Double
        </ActionButton>
      </div>
    );
  }

  if (snapshot.phase === 'dealer') {
    return (
      <p className="text-sm text-[var(--text-muted)]">Dealer drawing…</p>
    );
  }

  return (
    <Btn variant="primary" onClick={onPlayAgain}>
      Next hand
    </Btn>
  );
}
