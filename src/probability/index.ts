/**
 * Exact blackjack probability engine.
 *
 * Everything here is pure and framework-free: give it card-value buckets and a
 * shoe composition, get back exact odds and expected values. The React app is
 * just one consumer.
 */

export * from './deckMath';
export * from './dealer';
export * from './player';
