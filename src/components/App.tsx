import { useState } from 'react';
import { BlackjackGame } from '../game/gameState';
import GameScreen from './GameScreen';
import SidePanel from './SidePanel';

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
    <div className="min-h-screen flex items-center justify-center p-4 table-bg">
      <div className="w-full max-w-4xl flex gap-6">
        <div className="flex-1">
          <GameScreen
            state={state}
            onHit={handleHit}
            onStand={handleStand}
            onDoubleDown={handleDoubleDown}
          />
        </div>

        <div className="w-80">
          <SidePanel state={state} onBet={handleBet} onPlayAgain={handlePlayAgain} />
        </div>
      </div>
    </div>
  );
}

export default App;
