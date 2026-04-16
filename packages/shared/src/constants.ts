import type { CardValue } from './types/game.js';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const INITIAL_FLIPS = 2;
export const ROOM_CODE_LENGTH = 4;

/**
 * Official Skyjo deck composition (150 cards total):
 * -2: 5 cards
 * -1: 10 cards
 *  0: 15 cards
 *  1-12: 10 cards each
 */
export const CARD_DISTRIBUTION: Record<CardValue, number> = {
  [-2]: 5,
  [-1]: 10,
  [0]: 15,
  [1]: 10,
  [2]: 10,
  [3]: 10,
  [4]: 10,
  [5]: 10,
  [6]: 10,
  [7]: 10,
  [8]: 10,
  [9]: 10,
  [10]: 10,
  [11]: 10,
  [12]: 10,
};

export const TOTAL_CARDS = 150;

/** Game ends when a player reaches this score */
export const END_SCORE = 100;
