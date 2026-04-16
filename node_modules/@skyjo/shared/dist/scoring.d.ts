import type { CardSlot, PlayerState } from './types/game.js';
/** Calculate the visible score for a player (sum of face-up card values) */
export declare function calculateVisibleScore(cards: CardSlot[]): number;
/** Calculate the total score for a player (sum of all card values) */
export declare function calculateTotalScore(cards: CardSlot[]): number;
/**
 * Check if a column has all cards face-up with matching values.
 * Returns the column index if found, or -1 if no column matches.
 */
export declare function findMatchingColumn(cards: CardSlot[]): number;
/**
 * Remove a column from the player's cards.
 * Returns the new cards array with the column removed.
 * Cards are re-indexed: remaining columns shift left.
 */
export declare function removeColumn(cards: CardSlot[], colToRemove: number): CardSlot[];
/** Check if all of a player's cards are face-up */
export declare function allCardsFaceUp(cards: CardSlot[]): boolean;
/**
 * Calculate the round score for each player.
 * If the triggering player doesn't have the lowest score, their score is doubled.
 */
export declare function calculateRoundScores(players: PlayerState[], triggeringPlayerIndex: number): number[];
//# sourceMappingURL=scoring.d.ts.map