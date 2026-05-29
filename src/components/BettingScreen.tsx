import React, { useState } from 'react';

interface BettingScreenProps {
  balance: number;
  onBet: (amount: number) => void;
}

const CHIP_VALUES = [5, 10, 50, 100, 250];

export default function BettingScreen({ balance, onBet }: BettingScreenProps) {
  const [currentBet, setCurrentBet] = useState(0);

  const addChip = (value: number) => {
    if (currentBet + value <= balance) {
      setCurrentBet(currentBet + value);
    }
  };

  const clearBet = () => {
    setCurrentBet(0);
  };

  const handleDeal = () => {
    if (currentBet > 0) {
      onBet(currentBet);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-8 text-white text-center">
      <h1 className="text-4xl font-bold mb-4">Blackjack</h1>
      
      <div className="mb-8">
        <p className="text-gray-400 text-sm">Balance</p>
        <p className="text-3xl font-bold text-green-400">${balance}</p>
      </div>

      <div className="mb-8">
        <p className="text-gray-400 text-sm mb-2">Current Bet</p>
        <p className="text-4xl font-bold text-yellow-400">${currentBet}</p>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-6">
        {CHIP_VALUES.map((value) => (
          <button
            key={value}
            onClick={() => addChip(value)}
            className="bg-blue-600 hover:bg-blue-700 py-3 px-2 rounded-lg font-bold text-sm transition"
          >
            ${value}
          </button>
        ))}
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={clearBet}
          className="flex-1 bg-gray-600 hover:bg-gray-700 py-3 px-4 rounded-lg font-bold transition"
        >
          Clear
        </button>
        <button
          onClick={handleDeal}
          disabled={currentBet === 0}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 py-3 px-4 rounded-lg font-bold transition"
        >
          Deal
        </button>
      </div>

      <p className="text-gray-400 text-sm">Select chips to place your bet, then click Deal</p>
    </div>
  );
}
