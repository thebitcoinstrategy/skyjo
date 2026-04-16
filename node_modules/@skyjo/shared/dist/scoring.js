import { COLS, getColumnIndices } from './types/game.js';
/** Calculate the visible score for a player (sum of face-up card values) */
export function calculateVisibleScore(cards) {
    return cards
        .filter((card) => card.faceUp)
        .reduce((sum, card) => sum + card.value, 0);
}
/** Calculate the total score for a player (sum of all card values) */
export function calculateTotalScore(cards) {
    return cards.reduce((sum, card) => sum + card.value, 0);
}
/**
 * Check if a column has all cards face-up with matching values.
 * Returns the column index if found, or -1 if no column matches.
 */
export function findMatchingColumn(cards) {
    for (let col = 0; col < COLS; col++) {
        const indices = getColumnIndices(col);
        const columnCards = indices.map((i) => cards[i]);
        // All must be face-up
        if (!columnCards.every((c) => c.faceUp))
            continue;
        // All must have the same value
        const firstValue = columnCards[0].value;
        if (columnCards.every((c) => c.value === firstValue)) {
            return col;
        }
    }
    return -1;
}
/**
 * Remove a column from the player's cards.
 * Returns the new cards array with the column removed.
 * Cards are re-indexed: remaining columns shift left.
 */
export function removeColumn(cards, colToRemove) {
    const newCards = [];
    for (let col = 0; col < COLS; col++) {
        if (col === colToRemove)
            continue;
        const indices = getColumnIndices(col);
        for (const i of indices) {
            newCards.push({ ...cards[i] });
        }
    }
    return newCards;
}
/** Check if all of a player's cards are face-up */
export function allCardsFaceUp(cards) {
    return cards.every((card) => card.faceUp);
}
/**
 * Calculate the round score for each player.
 * If the triggering player doesn't have the lowest score, their score is doubled.
 */
export function calculateRoundScores(players, triggeringPlayerIndex) {
    const rawScores = players.map((p) => calculateTotalScore(p.cards));
    const triggerScore = rawScores[triggeringPlayerIndex];
    const lowestScore = Math.min(...rawScores);
    return rawScores.map((score, i) => {
        if (i === triggeringPlayerIndex && score > lowestScore) {
            return score * 2; // penalty: doubled
        }
        return score;
    });
}
//# sourceMappingURL=scoring.js.map