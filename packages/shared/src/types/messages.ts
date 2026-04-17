import type { VisibleGameState, CardValue } from './game.js';

// ── Client -> Server Events ──

export interface CreateRoomPayload {
  nickname: string;
  avatar: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  nickname: string;
  avatar: string;
}

export interface FlipInitialCardPayload {
  cardIndex: number;
}

export interface PlaceDrawnCardPayload {
  cardIndex: number;
}

export interface FlipCardPayload {
  cardIndex: number;
}

export interface AddBotPayload {
  nickname: string;
}

export interface RemoveBotPayload {
  botId: string;
}

export interface StartSinglePlayerPayload {
  nickname: string;
  avatar: string;
  botCount?: number;
}

export interface RejoinRoomPayload {
  playerId: string;
  roomCode: string;
}

export type EmoteKind = 'thumbs-up' | 'tada' | 'sweat' | 'scream' | 'fire' | 'think';

export interface EmotePayload {
  emote: EmoteKind;
}

export interface EmoteBroadcastPayload {
  playerId: string;
  emote: EmoteKind;
}

export interface ClientEvents {
  'create-room': (payload: CreateRoomPayload) => void;
  'join-room': (payload: JoinRoomPayload) => void;
  'rejoin-room': (payload: RejoinRoomPayload) => void;
  'start-game': () => void;
  'start-single-player': (payload: StartSinglePlayerPayload) => void;
  'flip-initial-card': (payload: FlipInitialCardPayload) => void;
  'draw-from-pile': () => void;
  'draw-from-discard': () => void;
  'place-drawn-card': (payload: PlaceDrawnCardPayload) => void;
  'discard-drawn-card': () => void;
  'flip-card': (payload: FlipCardPayload) => void;
  'add-bot': (payload: AddBotPayload) => void;
  'remove-bot': (payload: RemoveBotPayload) => void;
  'play-again': () => void;
  'emote': (payload: EmotePayload) => void;
}

// ── Server -> Client Events ──

export interface LobbyPlayer {
  id: string;
  nickname: string;
  avatar: string;
  isHost: boolean;
  isBot: boolean;
}

export interface RoomCreatedPayload {
  roomCode: string;
  playerId: string;
  lobby: LobbyPlayer[];
}

export interface RoomJoinedPayload {
  roomCode: string;
  playerId: string;
  lobby: LobbyPlayer[];
}

export interface RejoinedPayload {
  roomCode: string;
  playerId: string;
  gameState: VisibleGameState;
  lobby: LobbyPlayer[];
}

export interface PlayerJoinedPayload {
  player: LobbyPlayer;
}

export interface PlayerLeftPayload {
  playerId: string;
}

export type AnimationEventType =
  | 'deal'
  | 'flip-card'
  | 'draw-from-pile'
  | 'draw-from-discard'
  | 'place-card'
  | 'discard-card'
  | 'column-eliminate'
  | 'round-end'
  | 'game-end';

export interface AnimationEventPayload {
  type: AnimationEventType;
  playerId: string;
  data: Record<string, unknown>;
}

export interface RoundHighlights {
  /** Player with the single highest-value card at round end, plus the value. */
  biggestPenalty: { playerId: string; value: number } | null;
  /** Player with the lowest raw card total this round. */
  bestPlayer: { playerId: string; rawTotal: number } | null;
  /** Total columns eliminated this round across all players. */
  columnsEliminated: number;
  /** Player IDs who ended the round with at least one -2 flipped. */
  luckyFlips: string[];
}

export interface RoundEndPayload {
  roundScores: Record<string, number>;
  totalScores: Record<string, number>;
  roundNumber: number;
  closerPlayerId: string;
  wasDoubled: boolean;
  /** All card values per player at round end (for counting animation) */
  playerCards: Record<string, number[]>;
  /** Fun round summary — populated by server, rendered in RoundRecap */
  highlights: RoundHighlights;
}

export interface GameEndPayload {
  finalScores: Record<string, number>;
  winnerId: string;
}

export interface ErrorPayload {
  message: string;
}

export interface ServerEvents {
  'room-created': (payload: RoomCreatedPayload) => void;
  'room-joined': (payload: RoomJoinedPayload) => void;
  'rejoined': (payload: RejoinedPayload) => void;
  'player-joined': (payload: PlayerJoinedPayload) => void;
  'player-left': (payload: PlayerLeftPayload) => void;
  'game-started': (payload: VisibleGameState) => void;
  'game-state-update': (payload: VisibleGameState) => void;
  'animation-event': (payload: AnimationEventPayload) => void;
  'round-ended': (payload: RoundEndPayload) => void;
  'game-ended': (payload: GameEndPayload) => void;
  'error': (payload: ErrorPayload) => void;
  'lobby-update': (payload: LobbyPlayer[]) => void;
  'emote': (payload: EmoteBroadcastPayload) => void;
}
