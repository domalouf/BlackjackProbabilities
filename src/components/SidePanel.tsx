import { useState } from 'react';
import { GameState } from '../game/gameState';
import { getPayoutMultiplier, GameResult } from '../game/gameRules';

interface SidePanelProps {
  state: GameState;
  onBet: (amount: number) => void;
  onPlayAgain: () => void;
}

const CHIP_VALUES = [5, 10, 50, 100, 250];

export default function SidePanel({ state, onBet, onPlayAgain }: SidePanelProps) {
  const [currentBet, setCurrentBet] = useState(0);

  const addChip = (value: number) => {
    if (currentBet + value <= state.balance) {
      setCurrentBet(currentBet + value);
    }
  };

  const clearBet = () => setCurrentBet(0);

  const handleDeal = () => {
    if (currentBet > 0) {
      onBet(currentBet);
      setCurrentBet(0);
    }
  };

  const renderBetting = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Place Your Bet</h2>

      <div className="mb-4">
        <p className="text-gray-400 text-sm">Balance</p>
        <p className="text-xl font-bold text-green-400">${state.balance}</p>
      </div>

      <div className="mb-4">
        <p className="text-gray-400 text-sm">Current Bet</p>
        <p className="text-2xl font-bold text-yellow-400">${currentBet}</p>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {CHIP_VALUES.map((v) => (
          <button
            key={v}
            onClick={() => addChip(v)}
            className="bg-blue-600 hover:bg-blue-700 py-2 px-2 rounded font-bold text-sm"
          >
            ${v}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        <button onClick={clearBet} className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded">Clear</button>
        <button onClick={handleDeal} disabled={currentBet === 0} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded disabled:bg-gray-600">Deal</button>
      </div>

      <p className="text-gray-400 text-sm">Select chips then press Deal to start.</p>
    </div>
  );

  const renderResult = () => {
    if (!state.result) return null;
    const multiplier = getPayoutMultiplier(state.result);
    const net = Math.round(state.currentBet * (multiplier - 1));

    let resultText = '';
    switch (state.result) {
      case 'player-blackjack':
        resultText = 'Blackjack! You Win!';
        break;
      case 'player-win':
        resultText = 'You Win!';
        break;
      case 'push':
        resultText = 'Push - Draw';
        break;
      case 'player-loss':
        resultText = 'You Lose';
        break;
      case 'dealer-blackjack':
        resultText = 'Dealer Blackjack - You Lose';
        break;
    }

    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">{resultText}</h2>

        <div className="mb-4">
          <p className="text-gray-400 text-sm">Bet</p>
          <p className="text-xl font-bold text-yellow-400">${state.currentBet}</p>
        </div>

        <div className="mb-4 bg-gray-700 rounded p-3">
          <p className="text-gray-400 text-sm">Payout</p>
          <p className={`text-xl font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>{net >= 0 ? '+' : ''}${Math.abs(net)}</p>
        </div>

        <div className="mb-4">
          <p className="text-gray-400 text-sm">New Balance</p>
          <p className="text-xl font-bold text-green-400">${state.balance}</p>
        </div>

        <button onClick={onPlayAgain} className="w-full bg-green-600 hover:bg-green-700 py-2 rounded font-bold">Play Again</button>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 text-white">
      {state.phase === 'betting' && renderBetting()}
      {(state.phase === 'playing' || state.phase === 'dealer-turn') && (
        <div>
          <h2 className="text-2xl font-bold mb-4">In Hand</h2>
          <p className="text-gray-400">Balance</p>
          <p className="text-xl font-bold text-green-400">${state.balance}</p>
          <p className="text-gray-400 mt-2">Bet</p>
          <p className="text-lg font-bold text-yellow-400">${state.currentBet}</p>
        </div>
      )}
      {state.phase === 'result' && renderResult()}
    </div>
  );
}
