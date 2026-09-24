# Blackjack Probabilities

A playable blackjack game that shows the **exact** probability of every outcome
as you play — your chance of winning if you stand, of busting if you hit, and of
the dealer busting or landing on each total.

Live: [domalouf.com/blackjack](https://domalouf.com/blackjack/)

## What makes the numbers "exact"

Most odds tools quote figures from a precomputed basic-strategy table that
assumes an infinitely large deck. This one enumerates the actual game tree:

- The dealer's outcome distribution is computed by recursing over **every card
  the dealer could draw**, weighting each branch by its true probability given
  the cards left in the shoe. Card counts go down as cards come out — no
  infinite-deck shortcut.
- It conditions on the US **peek rule**: once the dealer has checked for
  blackjack, every downstream probability is renormalised on "dealer does not
  have a natural".
- Player expected values (stand / hit / double / split / surrender) are derived
  from that dealer distribution, with the hit branch playing on optimally. EV is
  reported in bet units, and the highest-EV action is flagged as the best play.
- Insurance is priced from the exact share of tens among the cards the hole
  card could be.
- Before each hand it works out **your edge**: the exact EV of the whole round —
  every opening deal, each played perfectly — against the shoe as it stands.
  With a full shoe that's the house edge (−0.58% under these rules); as the shoe
  depletes it swings with the count, and the suggested bet follows it.

Because it reads the live shoe, the odds shift as the shoe depletes — exactly
what a card counter is tracking.

Every calculation is memoised on (hand, cards left in the shoe), so the same
state reached by drawing cards in a different order is solved once. That keeps
a single decision well under a second, and the edge — about 500 full decision
analyses — runs across a small pool of Web Workers in a second or two.

One approximation, the standard one: a split is valued as twice the EV of one
split hand. That's exact for the first hand; for the second it ignores which
cards the first hand drew, which moves the figure by a few thousandths of a bet.

The engine (`src/probability/`) is pure and framework-free; the React app is
just one consumer. It's covered by tests that check it against published
dealer-bust, expected-value and basic-strategy tables (`npm test`).

## House rules

Las Vegas 6-deck standard, set in `src/game/rules.ts`:

| Rule | Value |
| --- | --- |
| Decks | 6, reshuffled at 75% penetration |
| Dealer soft 17 | Hits |
| Dealer peeks | For blackjack under a 10 or Ace |
| Blackjack pays | 3:2 |
| Double down | Any first two cards, including after a split |
| Split | Any pair of equal value, once (two hands); split aces get one card each; 21 after a split pays 1:1 |
| Surrender | Late (after the peek), first two cards only |
| Insurance | Offered against an Ace, pays 2:1; even money on a blackjack |
| Bet | 1, 2, 4 or 8 units a hand |

## Tech stack

- React 18 + TypeScript, Vite
- Tailwind CSS
- Vitest for the engine tests
- Deploys as a static site behind nginx

## Project structure

```
src/
├── probability/        Pure exact-odds engine (no React)
│   ├── deckMath.ts     Card-value buckets, hand-value arithmetic
│   ├── dealer.ts       Exact dealer outcome distribution
│   ├── player.ts       Stand/hit/double/split/surrender EV, best action
│   ├── insurance.ts    Insurance and even money
│   ├── edge.ts         Exact EV of a whole round (the player's edge)
│   └── *.test.ts       Validated against published tables
├── game/               Game rules and state machine (no React)
│   ├── card.ts  shoe.ts  hand.ts  rules.ts  engine.ts
│   └── *.test.ts
├── workers/edge.worker.ts  Runs edge calculations off the main thread
├── hooks/useBlackjack.ts   Bridges the engine to React
├── components/         UI
└── lib/                Formatting, bet sizing, the edge worker pool
```

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine + rules tests
npm run build      # -> dist/
```

## Deployment

The site is served from the `blackjack/` sub-path of the web root on the
Raspberry Pi that runs [domalouf.com](https://domalouf.com) (nginx in the
HealthBoard docker-compose stack).

```bash
./deploy/deploy.sh
```

This runs the tests, builds with `base=/blackjack/`, and rsyncs `dist/` to
`pi:HealthBoard/piStuff/website/blackjack/`. Static files are live immediately —
no nginx reload. Override the target with `PI_DEST=...` or the base path with
`BASE_PATH=...` to host it elsewhere.

The app ships **zero external requests** (no web fonts, no CDN, no remote
images), so it runs under the Pi's strict `default-src 'self'` CSP unchanged.
The edge workers and the felt texture are separate same-origin files, never
`blob:` or `data:` URIs, which that policy would block.

## License

MIT
