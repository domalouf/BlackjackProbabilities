import { Hand } from './hand';

export function shouldDealerHit(dealerHand: Hand): boolean {
  // Dealer hits on 16 or less, stands on 17+
  return dealerHand.getValue() < 17;
}

export type GameResult = 'player-win' | 'player-loss' | 'push' | 'player-blackjack' | 'dealer-blackjack';

export function determineWinner(
  playerHand: Hand,
  dealerHand: Hand
): GameResult {
  const playerValue = playerHand.getValue();
  const dealerValue = dealerHand.getValue();
  const playerBlackjack = playerHand.isBlackjack();
  const dealerBlackjack = dealerHand.isBlackjack();

  // Both have blackjack
  if (playerBlackjack && dealerBlackjack) {
    return 'push';
  }

  // Player has blackjack
  if (playerBlackjack) {
    return 'player-blackjack';
  }

  // Dealer has blackjack
  if (dealerBlackjack) {
    return 'dealer-blackjack';
  }

  // Player busts
  if (playerHand.isBust()) {
    return 'player-loss';
  }

  // Dealer busts
  if (dealerHand.isBust()) {
    return 'player-win';
  }

  // Compare values
  if (playerValue > dealerValue) {
    return 'player-win';
  } else if (playerValue < dealerValue) {
    return 'player-loss';
  } else {
    return 'push';
  }
}

export function getPayoutMultiplier(result: GameResult): number {
  switch (result) {
    case 'player-blackjack':
      return 2.5; // 1.5x + original bet back
    case 'player-win':
      return 2; // 1x + original bet back
    case 'push':
      return 1; // Original bet back
    case 'player-loss':
    case 'dealer-blackjack':
      return 0; // Lost
  }
}
