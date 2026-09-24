import { useState } from 'react';
import { DecisionAnalysis, useBlackjack } from '../hooks/useBlackjack';
import { GameResult, netResult } from '../game/rules';
import HandView from './HandView';
import Controls from './Controls';
import { DealerOdds, ModeToggle, OddsMode, PlayerOdds } from './Odds';
import TableInfo from './TableInfo';
import TableMarkings from './TableMarkings';
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

const actionEvs = (a: DecisionAnalysis) => ({
  hit: a.action.hitEv,
  stand: a.action.stand.ev,
  double: a.action.doubleEv,
});

export default function App() {
  const { snapshot, decision, actions, canDouble } = useBlackjack();
  const { phase, player, dealer, result, rules, bet, count } = snapshot;
  const [mode, setMode] = useState<OddsMode>('noCount');

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

  // One mode drives every figure on the table — the odds and the button EVs.
  const active = decision ? decision[mode] : null;
  const baseline = decision && mode === 'counting' ? decision.noCount : null;
  const live = phase === 'player' && active !== null;
  const stale = !live && active !== null;

  const evValues = live ? actionEvs(active) : null;
  const baseEvs = live && baseline ? actionEvs(baseline) : null;
  const evDeltas =
    evValues && baseEvs
      ? {
          hit: evValues.hit - baseEvs.hit,
          stand: evValues.stand - baseEvs.stand,
          double: evValues.double - baseEvs.double,
        }
      : null;

  const announcement =
    phase === 'result' && result ? (
      <div className="fade-up rounded-2xl bg-black/35 px-6 py-2 text-center shadow-lg backdrop-blur-sm">
        <div className="serif text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
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
                  : 'var(--text-muted)',
          }}
        >
          {delta !== 0
            ? `${units(delta)} unit${Math.abs(delta) === 1 ? '' : 's'}`
            : 'bet returned'}
        </div>
      </div>
    ) : undefined;

  return (
    <div className="mx-auto flex min-h-screen max-w-[56rem] flex-col gap-4 px-4 py-4 sm:gap-6 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h1 className="serif text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
          Blackjack Probabilities
        </h1>
        <div className="flex grow flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:grow-0 sm:gap-x-5">
          <TableInfo count={count} />
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </header>

      <main className="table-layout flex-1 gap-x-12 gap-y-4 sm:gap-y-5">
        <div style={{ gridArea: 'dealer' }}>
          <HandView
            hand={dealer}
            label="Dealer"
            hideHole={snapshot.dealerHoleHidden}
            outcome={dealerOutcome}
          />
        </div>

        <DealerOdds
          active={active}
          baseline={baseline}
          stale={stale}
          style={{ gridArea: 'dealer-odds' }}
        />

        <TableMarkings
          rules={rules}
          announcement={announcement}
          style={{ gridArea: 'middle' }}
        />

        <div style={{ gridArea: 'player' }}>
          <HandView hand={player} label="You" outcome={playerOutcome} />
        </div>

        <div style={{ gridArea: 'actions' }}>
          <Controls
            snapshot={snapshot}
            canDouble={canDouble}
            recommended={live ? active.action.best : null}
            evValues={evValues}
            evDeltas={evDeltas}
            onDeal={actions.deal}
            onHit={actions.hit}
            onStand={actions.stand}
            onDouble={actions.double}
            onPlayAgain={actions.playAgain}
          />
        </div>

        <PlayerOdds
          active={active}
          baseline={baseline}
          stale={stale}
          mode={mode}
          style={{ gridArea: 'player-odds' }}
        />
      </main>

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
