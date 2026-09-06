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
- Player expected values (stand / hit / double) are derived from that dealer
  distribution, with the hit branch playing on optimally. EV is reported in bet
  units, and the highest-EV action is flagged as the best play.

Because it reads the live shoe, the odds shift as the shoe depletes — exactly
what a card counter is tracking.

The engine (`src/probability/`) is pure and framework-free; the React app is
just one consumer. It's covered by 30-plus tests that check it against published
dealer-bust and expected-value tables (`npm test`).

## House rules

Las Vegas 6-deck standard, set in `src/game/rules.ts`:

| Rule | Value |
| --- | --- |
| Decks | 6, reshuffled at 75% penetration |
| Dealer soft 17 | Hits |
| Blackjack pays | 3:2 |
| Double down | Any first two cards |
| Insurance / split | Not implemented |

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
│   ├── player.ts       Stand/hit/double EV, bust odds, best action
│   └── *.test.ts       Validated against published tables
├── game/               Game rules and state machine (no React)
│   ├── card.ts  shoe.ts  hand.ts  rules.ts  engine.ts
│   └── *.test.ts
├── hooks/useBlackjack.ts   Bridges the engine to React
├── components/         UI
└── lib/format.ts       Number formatting
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

## License

MIT
