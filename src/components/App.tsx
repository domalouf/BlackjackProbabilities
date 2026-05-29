import React, { useState } from 'react';
import { BlackjackGame } from '../game/gameState';
import BettingScreen from './BettingScreen';
import GameScreen from './GameScreen';
import ResultModal from './ResultModal';

function App() {
  const [game] = useState(() => new BlackjackGame(1000));
  const [, setGameState] = useState(game.getState());

  const updateGame = () => {
    setGameState({ ...game.getState() });
  };

  const state = game.getState();

  const handleBet = (amount: number) => {
    game.placeBet(amount);
    game.deal();
    updateGame();
  };

  const handleHit = () => {
    game.playerHit();
    updateGame();
  };

  const handleStand = () => {
    game.playerStand();
    updateGame();
  };

  const handleDoubleDown = () => {
    game.playerDoubleDown();
    updateGame();
  };

  const handlePlayAgain = () => {
    game.playAgain();
    updateGame();
  };

  return (
    <div className="min-h-screen bg-green-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {state.phase === 'betting' && (
          <BettingScreen
            balance={state.balance}
            onBet={handleBet}
          />
        )}

        {(state.phase === 'playing' || state.phase === 'dealer-turn') && (
          <GameScreen
            state={state}
            onHit={handleHit}
            onStand={handleStand}
            onDoubleDown={handleDoubleDown}
          />
        )}

        {state.phase === 'result' && state.result && (
          <ResultModal
            result={state.result}
            playerHand={state.playerHand}
            dealerHand={state.dealerHand}
            bet={state.currentBet}
            balance={state.balance}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </div>
    </div>
  );
}

export default App;
