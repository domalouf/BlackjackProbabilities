import React from 'react';
import { Hand } from '../game/hand';
import { cardToEmoji } from '../game/card';

interface HandDisplayProps {
  hand: Hand;
  label: string;
  hideFirstCard?: boolean;
}

export default function HandDisplay({ hand, label, hideFirstCard }: HandDisplayProps) {
  const cards = hand.getCards();
  const value = hand.getValue();

  return (
    <div className="mb-6">
      <p className="text-gray-300 text-sm mb-2">{label}</p>
      <div className="flex gap-3 mb-2">
        {cards.map((card, index) => (
          <div
            key={index}
            className="w-16 h-24 bg-white rounded-lg flex items-center justify-center text-2xl font-bold text-red-600 border-2 border-red-600 shadow-lg"
          >
            {hideFirstCard && index === 0 ? '?' : cardToEmoji(card)}
          </div>
        ))}
      </div>
      {!hideFirstCard && (
        <p className="text-lg font-semibold text-white">
          Value: <span className="text-yellow-400">{value}</span>
        </p>
      )}
    </div>
  );
}
