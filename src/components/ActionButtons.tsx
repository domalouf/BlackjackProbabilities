import React from 'react';
import { GameState } from '../game/gameState';

interface ActionButtonsProps {
  state: GameState;
  onHit: () => void;
  onStand: () => void;
  onDoubleDown: () => void;
}

export default function ActionButtons({
  state,
  onHit,
  onStand,
  onDoubleDown,
}: ActionButtonsProps) {
  const canDoubleDown =
    state.playerHand.getSize() === 2 &&
    state.currentBet <= state.balance;

  if (state.phase !== 'playing') {
    return null;
  }

  return (
    <div className="flex gap-4 justify-center mt-8">
      <button
        onClick={onHit}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition"
      >
        Hit
      </button>
      <button
        onClick={onStand}
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition"
      >
        Stand
      </button>
      <button
        onClick={onDoubleDown}
        disabled={!canDoubleDown}
        className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition"
      >
        Double Down
      </button>
    </div>
  );
}
