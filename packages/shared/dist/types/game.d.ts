export type CardValue = -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export interface CardSlot {
    value: CardValue;
    faceUp: boolean;
}
/** What the client sees — hidden cards have value: null */
export interface VisibleCardSlot {
    value: CardValue | null;
    faceUp: boolean;
}
export type GamePhase = 'waiting' | 'flipping_initial' | 'playing' | 'final_round' | 'round_over' | 'game_over';
export type TurnPhase = 'draw' | 'place_or_discard' | 'must_flip' | 'place_discard';
export interface PlayerState {
    id: string;
    nickname: string;
    avatar: string;
    cards: CardSlot[];
    score: number;
    roundScores: number[];
    connected: boolean;
    isBot: boolean;
    initialFlipsRemaining: number;
}
/** What the client receives — other players' face-down cards have null values */
export interface VisiblePlayerState {
    id: string;
    nickname: string;
    avatar: string;
    cards: VisibleCardSlot[];
    score: number;
    roundScores: number[];
    connected: boolean;
    isBot: boolean;
    initialFlipsRemaining: number;
}
export interface GameState {
    phase: GamePhase;
    turnPhase: TurnPhase | null;
    players: PlayerState[];
    currentPlayerIndex: number;
    drawPile: CardValue[];
    discardPile: CardValue[];
    drawnCard: CardValue | null;
    roundNumber: number;
    triggeringPlayerIndex: number | null;
    finalRoundTurnsLeft: number;
}
/** Sanitized game state sent to a specific client */
export interface VisibleGameState {
    phase: GamePhase;
    turnPhase: TurnPhase | null;
    players: VisiblePlayerState[];
    currentPlayerIndex: number;
    drawPileCount: number;
    discardTop: CardValue | null;
    drawnCard: CardValue | null;
    roundNumber: number;
    triggeringPlayerIndex: number | null;
    finalRoundTurnsLeft: number;
}
export declare const ROWS = 4;
export declare const COLS = 3;
export declare const CARDS_PER_PLAYER: number;
/** Get column index (0-2) for a card at given index */
export declare function getCol(cardIndex: number): number;
/** Get row index (0-3) for a card at given index */
export declare function getRow(cardIndex: number): number;
/** Get card index from column and row */
export declare function getCardIndex(col: number, row: number): number;
/** Get all card indices in a column */
export declare function getColumnIndices(col: number): number[];
//# sourceMappingURL=game.d.ts.map