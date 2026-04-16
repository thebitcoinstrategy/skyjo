import { CARD_DISTRIBUTION } from './constants.js';
/** Create a fresh unshuffled deck of 150 Skyjo cards */
export function createDeck() {
    const deck = [];
    for (const [valueStr, count] of Object.entries(CARD_DISTRIBUTION)) {
        const value = Number(valueStr);
        for (let i = 0; i < count; i++) {
            deck.push(value);
        }
    }
    return deck;
}
/** Fisher-Yates shuffle (in-place, returns same array) */
export function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}
/** Create a shuffled deck ready for play */
export function createShuffledDeck() {
    return shuffleDeck(createDeck());
}
//# sourceMappingURL=deck.js.map