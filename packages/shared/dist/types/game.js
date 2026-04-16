export const ROWS = 4;
export const COLS = 3;
export const CARDS_PER_PLAYER = ROWS * COLS; // 12
/** Get column index (0-2) for a card at given index */
export function getCol(cardIndex) {
    return Math.floor(cardIndex / ROWS);
}
/** Get row index (0-3) for a card at given index */
export function getRow(cardIndex) {
    return cardIndex % ROWS;
}
/** Get card index from column and row */
export function getCardIndex(col, row) {
    return col * ROWS + row;
}
/** Get all card indices in a column */
export function getColumnIndices(col) {
    return Array.from({ length: ROWS }, (_, row) => col * ROWS + row);
}
//# sourceMappingURL=game.js.map