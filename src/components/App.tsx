import { useBlackjack } from '../hooks/useBlackjack';
import { GameResult, netResult } from '../game/rules';
import HandView from './HandView';
import Controls from './Controls';
import ProbabilityPanel from './ProbabilityPanel';
import SessionStats from './SessionStats';
import TableInfo from './TableInfo';
import { units } from '../lib/format';

const RESULT_TEXT: Record<GameResult, string> = {
  'player-blackjack': 'Blackjack!',
  'player-win': 'You win',
  push: 'Push',
  'player-loss': 'You lose',
  'dealer-blackjack': 'Dealer blackjack',
};

function outcomeTone(result: GameResult): 'win' | 'loss' | 'push' {
  if (result === 'player-blackjack' || result === 'player-win') return 'win';
  if (result === 'push') return 'push';
  return 'loss';
}

export default function App() {
  const { snapshot, decision, actions, canDouble } = useBlackjack();
  const { phase, player, dealer, result, rules, stats, bet, count } = snapshot;

  const playerOutcome =
    phase === 'result' && result ? outcomeTone(result) : null;
  const dealerOutcome =
    phase === 'result' && result
      ? outcomeTone(result) === 'win'
        ? 'loss'
        : outcomeTone(result) === 'loss'
          ? 'win'
          : 'push'
      : null;

  const delta = result ? netResult(result, bet, rules) : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-4 py-6 sm:py-10">
      <header>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Blackjack Probabilities
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          {rules.decks}-deck shoe · dealer{' '}
          {rules.hitSoft17 ? 'hits' : 'stands'} soft 17 · blackjack pays{' '}
          {rules.blackjackPayout === 1.5 ? '3:2' : `${rules.blackjackPayout}:1`}
        </p>
      </header>

      <div className="table-grid flex-1 gap-4">
        <div
          className="felt flex flex-1 flex-col gap-4 rounded-xl p-5 text-white shadow-sm sm:flex-row sm:gap-6 sm:p-7"
          style={{ gridArea: 'table' }}
        >
          <div className="flex flex-1 flex-col justify-between gap-8">
            <HandView
              hand={dealer}
              label="Dealer"
              hideHole={snapshot.dealerHoleHidden}
              outcome={dealerOutcome}
            />

            {phase === 'result' && result && (
              <div className="fade-up text-center">
                <div className="text-2xl font-extrabold tracking-tight">
                  {RESULT_TEXT[result]}
                </div>
                <div
                  className="tabular text-sm font-semibold"
                  style={{
                    color:
                      delta > 0
                        ? 'var(--win)'
                        : delta < 0
                          ? 'var(--loss)'
                          : 'rgba(255,255,255,0.75)',
                  }}
                >
                  {delta !== 0
                    ? `${units(delta)} unit${Math.abs(delta) === 1 ? '' : 's'}`
                    : 'push'}
                </div>
              </div>
            )}

            {phase === 'betting' && (
              <p className="text-center text-sm text-white/70">
                Deal to play — 1 unit per hand.
              </p>
            )}

            <HandView hand={player} label="You" outcome={playerOutcome} />
          </div>

          <TableInfo count={count} />
        </div>

        <div
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          style={{ gridArea: 'controls' }}
        >
          <Controls
            snapshot={snapshot}
            canDouble={canDouble}
            recommended={
              phase === 'player' ? decision?.action.best ?? null : null
            }
            onDeal={actions.deal}
            onHit={actions.hit}
            onStand={actions.stand}
            onDouble={actions.double}
            onPlayAgain={actions.playAgain}
          />
        </div>

        <ProbabilityPanel
          snapshot={snapshot}
          decision={decision}
          style={{ gridArea: 'odds' }}
        />

        <div style={{ gridArea: 'stats' }}>
          <SessionStats stats={stats} />
        </div>
      </div>

      <footer className="text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
        Probabilities are exact: every dealer draw is enumerated against the
        cards actually left in the shoe. Play money only.{' '}
        <a
          className="underline underline-offset-2"
          href="https://github.com/domalouf/BlackjackProbabilities"
        >
          Source
        </a>
      </footer>
    </div>
  );
}
