import { useState } from 'react';
import { DecisionAnalysis, useBlackjack } from '../hooks/useBlackjack';
import { GameSnapshot, PlayerHand } from '../game/engine';
import { GameResult } from '../game/rules';
import { PlayerAction } from '../probability';
import HandView, { Tone, TONE_COLOR } from './HandView';
import Controls, { InsuranceOffer } from './Controls';
import { DealerOdds, ModeToggle, OddsMode, PlayerOdds } from './Odds';
import ShoeGauge from './ShoeGauge';
import TableInfo from './TableInfo';
import TableMarkings from './TableMarkings';
import { units } from '../lib/format';

const RESULT_TEXT: Record<GameResult, string> = {
  'player-blackjack': 'Blackjack!',
  'player-win': 'You win',
  push: 'Push',
  'player-loss': 'You lose',
  'dealer-blackjack': 'Dealer blackjack',
  surrender: 'Surrendered',
};

function outcomeTone(result: GameResult): Tone {
  if (result === 'player-blackjack' || result === 'player-win') return 'win';
  if (result === 'push') return 'push';
  return 'loss';
}

const toneOfNet = (net: number): Tone =>
  net > 0 ? 'win' : net < 0 ? 'loss' : 'push';

/** Short per-hand result, shown beside each hand once a split is settled. */
function handResultTag(h: PlayerHand): string {
  if (h.hand.isBust()) return 'Bust';
  switch (h.result) {
    case 'player-win':
      return 'Win';
    case 'push':
      return 'Push';
    default:
      return 'Loss';
  }
}

const unitsText = (n: number) =>
  `${units(n)} unit${Math.abs(n) === 1 ? '' : 's'}`;

/** Headline and detail for the settled hand, announced on the felt. */
function announce(s: GameSnapshot): { title: string; detail: string } {
  const net = s.net ?? 0;
  const insurance = s.insurance?.taken ? s.insurance : null;

  if (insurance?.evenMoney) return { title: 'Even money', detail: unitsText(net) };

  const title =
    s.hands.length === 1
      ? RESULT_TEXT[s.hands[0].result!]
      : net > 0
        ? 'You win'
        : net < 0
          ? 'You lose'
          : 'Push';

  let detail =
    net === 0 && !insurance && s.hands.length === 1 ? 'bet returned' : unitsText(net);
  if (s.hands.length > 1) detail += ' over 2 hands';
  if (insurance) {
    const paid = s.dealer.isBlackjack() ? 2 * insurance.bet : -insurance.bet;
    detail += ` · insurance ${units(paid)}`;
  }
  return { title, detail };
}

const actionEvs = (a: DecisionAnalysis): Record<PlayerAction, number> => ({
  hit: a.action.hitEv,
  stand: a.action.stand.ev,
  double: a.action.doubleEv,
  split: a.action.splitEv,
  surrender: a.action.surrenderEv,
});

export default function App() {
  const { snapshot, decision, insurance, edge, actions, canDouble, canSplit, canSurrender } =
    useBlackjack();
  const { phase, hands, activeHand, dealer, rules, count } = snapshot;
  const [mode, setMode] = useState<OddsMode>('noCount');

  const settled = phase === 'result';
  const net = snapshot.net ?? 0;
  const split = hands.length > 1;

  // One mode drives every figure on the table — the odds and the button EVs.
  const active = decision ? decision[mode] : null;
  const baseline = decision && mode === 'counting' ? decision.noCount : null;
  const live = phase === 'player' && active !== null;
  const stale = !live && active !== null;

  const evValues = live ? actionEvs(active) : null;
  const baseEvs = live && baseline ? actionEvs(baseline) : null;
  const evDeltas =
    evValues && baseEvs
      ? (Object.fromEntries(
          Object.entries(evValues).map(([k, v]) => [
            k,
            v - baseEvs[k as PlayerAction],
          ]),
        ) as Record<PlayerAction, number>)
      : null;

  const offer = insurance ? insurance[mode] : null;
  const offerBase = insurance && mode === 'counting' ? insurance.noCount : null;
  const insuranceOffer: InsuranceOffer | null = offer && {
    evenMoney: offer.evenMoney,
    takeEv: offer.takeEv,
    declineEv: offer.declineEv,
    takeDelta: offerBase ? offer.takeEv - offerBase.takeEv : undefined,
    declineDelta: offerBase ? offer.declineEv - offerBase.declineEv : undefined,
    best: offer.best,
  };

  const shownEdge = mode === 'counting' ? edge.counting : edge.noCount;
  const edgeDelta =
    mode === 'counting' && edge.counting !== null && edge.noCount !== null
      ? edge.counting - edge.noCount
      : null;

  const summary = settled ? announce(snapshot) : null;
  const announcement = summary ? (
    <div className="fade-up rounded-2xl bg-black/35 px-6 py-2 text-center shadow-lg backdrop-blur-sm">
      <div className="serif text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
        {summary.title}
      </div>
      <div
        className="tabular text-sm font-semibold"
        style={{
          color: net > 0 ? 'var(--win)' : net < 0 ? 'var(--loss)' : 'var(--text-muted)',
        }}
      >
        {summary.detail}
      </div>
    </div>
  ) : undefined;

  const dealerTone: Tone | null = settled
    ? ({ win: 'loss', loss: 'win', push: 'push' } as const)[toneOfNet(net)]
    : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-[56rem] flex-col gap-4 px-4 py-4 sm:gap-6 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h1 className="serif text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
          Blackjack Probabilities
        </h1>
        <div className="flex grow flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:grow-0 sm:gap-x-5">
          <ShoeGauge shoe={snapshot.shoe} decks={rules.decks} />
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
            flipHole
            outcome={dealerTone}
          />
        </div>

        <DealerOdds
          active={active}
          baseline={baseline}
          stale={stale}
          insurance={offer}
          insuranceBaseline={offerBase}
          style={{ gridArea: 'dealer-odds' }}
        />

        <TableMarkings
          rules={rules}
          announcement={announcement}
          style={{ gridArea: 'middle' }}
        />

        <div
          className="flex flex-wrap items-start justify-center gap-x-4 gap-y-3 sm:gap-x-8"
          style={{ gridArea: 'player' }}
        >
          {hands.map((h, i) => (
            <HandView
              key={i}
              hand={h.hand}
              label={split ? `Hand ${i + 1}` : 'You'}
              bet={h.bet}
              compact={split}
              active={split && phase === 'player' && i === activeHand}
              waiting={split && phase === 'player' && i !== activeHand}
              outcome={settled && h.result ? outcomeTone(h.result) : null}
              tag={
                settled && split && h.result ? (
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: TONE_COLOR[outcomeTone(h.result)] }}
                  >
                    {handResultTag(h)}
                  </span>
                ) : undefined
              }
            />
          ))}
        </div>

        <div style={{ gridArea: 'actions' }}>
          <Controls
            phase={phase}
            canDouble={canDouble}
            canSplit={canSplit}
            canSurrender={canSurrender}
            recommended={live ? active.action.best : null}
            evValues={evValues}
            evDeltas={evDeltas}
            insurance={insuranceOffer}
            nextHand={{
              edge: shownEdge,
              edgeDelta,
              newShoe: snapshot.reshuffleNext,
            }}
            onDeal={actions.deal}
            onHit={actions.hit}
            onStand={actions.stand}
            onDouble={actions.double}
            onSplit={actions.split}
            onSurrender={actions.surrender}
            onTakeInsurance={actions.takeInsurance}
            onDeclineInsurance={actions.declineInsurance}
            onPlayAgain={actions.playAgain}
          />
        </div>

        <PlayerOdds
          active={active}
          baseline={baseline}
          stale={stale}
          insurance={offer}
          insuranceBaseline={offerBase}
          mode={mode}
          handLabel={split ? `Hand ${activeHand + 1}` : undefined}
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
