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

export type GamePhase =
  | 'waiting'
  | 'flipping_initial'
  | 'playing'
  | 'final_round'
  | 'round_over'
  | 'game_over';

export type TurnPhase =
  | 'draw'           // player must draw from pile or discard
  | 'place_or_discard' // player drew from pile, must place or discard
  | 'must_flip'      // player discarded drawn card, must flip one face-down card
  | 'place_discard'  // player drew from discard, must place it (can't discard it back)
  ;

export interface PlayerState {
  id: string;
  nickname: string;
  avatar: string;
  cards: CardSlot[];        // 12 cards in column-major order: [col0row0, col0row1, col0row2, col0row3, col1row0, ...]
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
  drawnCard: CardValue | null;  // card currently held by the active player
  roundNumber: number;
  triggeringPlayerIndex: number | null;  // who triggered the final round
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
  drawnCard: CardValue | null;  // only non-null for the active player
  roundNumber: number;
  triggeringPlayerIndex: number | null;
  finalRoundTurnsLeft: number;
}

export const ROWS = 4;
export const COLS = 3;
export const CARDS_PER_PLAYER = ROWS * COLS; // 12

/** Get column index (0-2) for a card at given index */
export function getCol(cardIndex: number): number {
  return Math.floor(cardIndex / ROWS);
}

/** Get row index (0-3) for a card at given index */
export function getRow(cardIndex: number): number {
  return cardIndex % ROWS;
}

/** Get card index from column and row */
export function getCardIndex(col: number, row: number): number {
  return col * ROWS + row;
}

/** Get all card indices in a column */
export function getColumnIndices(col: number): number[] {
  return Array.from({ length: ROWS }, (_, row) => col * ROWS + row);
}
