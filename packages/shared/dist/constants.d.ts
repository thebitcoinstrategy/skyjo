import type { CardValue } from './types/game.js';
export declare const MIN_PLAYERS = 2;
export declare const MAX_PLAYERS = 8;
export declare const INITIAL_FLIPS = 2;
export declare const ROOM_CODE_LENGTH = 4;
/**
 * Official Skyjo deck composition (150 cards total):
 * -2: 5 cards
 * -1: 10 cards
 *  0: 15 cards
 *  1-12: 10 cards each
 */
export declare const CARD_DISTRIBUTION: Record<CardValue, number>;
export declare const TOTAL_CARDS = 150;
/** Game ends when a player reaches this score */
export declare const END_SCORE = 100;
//# sourceMappingURL=constants.d.ts.map