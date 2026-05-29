import React from 'react';
import { GameResult } from '../game/gameRules';
import { Hand } from '../game/hand';
import HandDisplay from './HandDisplay';

interface ResultModalProps {
  result: GameResult;
  playerHand: Hand;
  dealerHand: Hand;
  bet: number;
  balance: number;
  onPlayAgain: () => void;
}

export default function ResultModal({
  result,
  playerHand,
  dealerHand,
  bet,
  balance,
  onPlayAgain,
}: ResultModalProps) {
  let resultText = '';
  let resultColor = '';
  let payout = 0;

  switch (result) {
    case 'player-blackjack':
      resultText = 'Blackjack! You Win!';
      resultColor = 'text-green-400';
      payout = Math.round(bet * 1.5);
      break;
    case 'player-win':
      resultText = 'You Win!';
      resultColor = 'text-green-400';
      payout = bet;
      break;
    case 'push':
      resultText = 'Push - Draw';
      resultColor = 'text-yellow-400';
      payout = 0;
      break;
    case 'player-loss':
      resultText = 'You Lose';
      resultColor = 'text-red-400';
      payout = -bet;
      break;
    case 'dealer-blackjack':
      resultText = 'Dealer Blackjack - You Lose';
      resultColor = 'text-red-400';
      payout = -bet;
      break;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 text-white max-w-md w-full">
        <h2 className={`text-4xl font-bold text-center mb-8 ${resultColor}`}>
          {resultText}
        </h2>

        <div className="mb-8">
          <HandDisplay hand={playerHand} label="Your Hand" />
          <HandDisplay hand={dealerHand} label="Dealer Hand" />
        </div>

        <div className="bg-gray-700 rounded-lg p-6 mb-8 text-center">
          <p className="text-gray-400 text-sm mb-2">Payout</p>
          <p className={`text-3xl font-bold ${payout >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {payout > 0 ? '+' : ''}{payout > 0 || payout < 0 ? `$${Math.abs(payout)}` : 'Push'}
          </p>
          <p className="text-gray-400 text-sm mt-4 mb-2">New Balance</p>
          <p className="text-2xl font-bold text-green-400">${balance}</p>
        </div>

        <button
          onClick={onPlayAgain}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
