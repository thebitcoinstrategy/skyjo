// Types
export type {
  CardValue,
  CardSlot,
  VisibleCardSlot,
  GamePhase,
  TurnPhase,
  PlayerState,
  VisiblePlayerState,
  GameState,
  VisibleGameState,
} from './types/game.js';

export {
  ROWS,
  COLS,
  CARDS_PER_PLAYER,
  getCol,
  getRow,
  getCardIndex,
  getColumnIndices,
} from './types/game.js';

// Messages
export type {
  CreateRoomPayload,
  JoinRoomPayload,
  FlipInitialCardPayload,
  PlaceDrawnCardPayload,
  FlipCardPayload,
  AddBotPayload,
  RemoveBotPayload,
  StartSinglePlayerPayload,
  ClientEvents,
  LobbyPlayer,
  RoomCreatedPayload,
  RoomJoinedPayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  AnimationEventType,
  AnimationEventPayload,
  RoundEndPayload,
  GameEndPayload,
  ErrorPayload,
  ServerEvents,
} from './types/messages.js';

// Constants
export {
  MIN_PLAYERS,
  MAX_PLAYERS,
  INITIAL_FLIPS,
  ROOM_CODE_LENGTH,
  CARD_DISTRIBUTION,
  TOTAL_CARDS,
  END_SCORE,
} from './constants.js';

// Deck
export { createDeck, shuffleDeck, createShuffledDeck } from './deck.js';

// Scoring
export {
  calculateVisibleScore,
  calculateTotalScore,
  findMatchingColumn,
  removeColumn,
  allCardsFaceUp,
  calculateRoundScores,
} from './scoring.js';
