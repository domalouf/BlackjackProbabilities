import React from 'react';
import { GameState } from '../game/gameState';
import HandDisplay from './HandDisplay';
import ActionButtons from './ActionButtons';

interface GameScreenProps {
  state: GameState;
  onHit: () => void;
  onStand: () => void;
  onDoubleDown: () => void;
}

export default function GameScreen({
  state,
  onHit,
  onStand,
  onDoubleDown,
}: GameScreenProps) {
  const dealerPhase = state.phase === 'dealer-turn' || state.phase === 'result';

  return (
    <div className="bg-gray-800 rounded-lg p-8 text-white">
      <div className="mb-8 text-center">
        <p className="text-gray-400 text-sm mb-1">Balance</p>
        <p className="text-2xl font-bold text-green-400">${state.balance}</p>
        <p className="text-gray-400 text-sm mt-2">Bet: ${state.currentBet}</p>
      </div>

      <div className="border-t border-gray-600 pt-6 pb-6 mb-6">
        <HandDisplay
          hand={state.dealerHand}
          label="Dealer"
          hideFirstCard={!dealerPhase && state.phase === 'playing'}
        />
      </div>

      <div className="border-b border-gray-600 pb-6">
        <HandDisplay
          hand={state.playerHand}
          label="You"
        />
      </div>

      <ActionButtons
        state={state}
        onHit={onHit}
        onStand={onStand}
        onDoubleDown={onDoubleDown}
      />

      {state.phase === 'dealer-turn' && (
        <div className="text-center mt-8">
          <p className="text-gray-400 animate-pulse">Dealer is playing...</p>
        </div>
      )}
    </div>
  );
}
