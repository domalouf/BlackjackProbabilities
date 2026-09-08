import { useEffect, useState, type ReactNode } from 'react';
import { GameSnapshot } from '../game/engine';
import { money } from '../lib/format';

interface Props {
  snapshot: GameSnapshot;
  canDouble: boolean;
  recommended: 'hit' | 'stand' | 'double' | null;
  onDeal: (amount: number) => void;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onPlayAgain: () => void;
}

const CHIPS = [1, 5, 25, 100, 500];

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

export default function Controls({
  snapshot,
  canDouble,
  recommended,
  onDeal,
  onHit,
  onStand,
  onDouble,
  onPlayAgain,
}: Props) {
  const [bet, setBet] = useState(1);

  useEffect(() => {
    if (bet > snapshot.balance) setBet(snapshot.balance);
  }, [snapshot.balance, bet]);

  if (snapshot.phase === 'betting') {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => setBet((b) => Math.min(b + c, snapshot.balance))}
              disabled={bet + c > snapshot.balance}
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold transition disabled:opacity-40"
            >
              +{money(c)}
            </button>
          ))}
          <button
            onClick={() => setBet(0)}
            className="text-sm text-[var(--text-muted)] underline-offset-2 hover:underline"
          >
            clear
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="tabular text-lg font-bold">Bet {money(bet)}</div>
          <Btn
            variant="primary"
            onClick={() => onDeal(bet)}
            disabled={bet <= 0 || bet > snapshot.balance}
          >
            Deal
          </Btn>
        </div>
      </div>
    );
  }

  if (snapshot.phase === 'player') {
    return (
      <div className="flex flex-wrap gap-2">
        <Btn onClick={onHit} hint={recommended === 'hit'}>
          Hit
        </Btn>
        <Btn onClick={onStand} hint={recommended === 'stand'}>
          Stand
        </Btn>
        <Btn
          onClick={onDouble}
          disabled={!canDouble}
          hint={recommended === 'double' && canDouble}
        >
          Double
        </Btn>
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
