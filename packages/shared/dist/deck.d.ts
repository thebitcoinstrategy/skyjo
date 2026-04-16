import type { CardValue } from './types/game.js';
/** Create a fresh unshuffled deck of 150 Skyjo cards */
export declare function createDeck(): CardValue[];
/** Fisher-Yates shuffle (in-place, returns same array) */
export declare function shuffleDeck(deck: CardValue[]): CardValue[];
/** Create a shuffled deck ready for play */
export declare function createShuffledDeck(): CardValue[];
//# sourceMappingURL=deck.d.ts.map