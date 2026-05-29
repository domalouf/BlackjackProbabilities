# Blackjack Probabilities

A React-based blackjack game with integrated probability calculations.

## Features (Phase 1)

- Play blackjack against the dealer
- Hit, Stand, and Double Down actions
- Chip-based betting system
- Real-time balance tracking
- Proper Ace handling (11 unless bust, then 1)
- Full game flow: betting → dealing → player actions → dealer play → results

## Tech Stack

- **Frontend:** React + TypeScript
- **Styling:** Tailwind CSS
- **Build:** Vite
- **Deployment:** Static site (Nginx)

## Project Structure

```
src/
├── game/               # Pure game logic (no React)
│   ├── card.ts        # Card types and utilities
│   ├── deck.ts        # Deck class with shuffle/deal
│   ├── hand.ts        # Hand class with value calculation
│   ├── gameRules.ts   # Dealer logic and winner determination
│   └── gameState.ts   # Main game state machine
├── components/        # React components
│   ├── App.tsx        # Main game orchestrator
│   ├── BettingScreen.tsx
│   ├── GameScreen.tsx
│   ├── HandDisplay.tsx
│   ├── ActionButtons.tsx
│   └── ResultModal.tsx
└── index.css         # Tailwind styles
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

This creates a `dist` folder with optimized static files ready to deploy to Nginx.

## Game Rules (Phase 1)

- **Hit:** Draw another card
- **Stand:** End your turn
- **Double Down:** Double your bet, draw exactly one card, then stand
- **Dealer Rules:** Hits on 16 or less, stands on 17+
- **Ace Handling:** Aces count as 11 unless the hand would bust, then as 1
- **Payouts:**
  - Blackjack (21 on deal): 1.5x your bet
  - Win: 1x your bet (you get 2x total)
  - Push (tie): Your original bet back
  - Loss: You lose your bet

## Future Phases

### Phase 2: Probability Display
- Add win/loss/tie probability calculations
- Display odds at each decision point
- Educational overlay showing hand probabilities

### Phase 3: Polish
- Card animations
- Sound effects
- Session stats panel
- Settings and preferences

## Deployment

To deploy to your Raspberry Pi with Nginx:

1. Build the project: `npm run build`
2. Copy the `dist` folder to your Nginx static files directory
3. Serve via Nginx on your Cloudflare tunnel

## License

MIT
