import { Server, Socket } from 'socket.io';
import crypto from 'crypto';
import type {
  ClientEvents,
  ServerEvents,
  CreateRoomPayload,
  JoinRoomPayload,
  FlipInitialCardPayload,
  PlaceDrawnCardPayload,
  FlipCardPayload,
  AddBotPayload,
  RemoveBotPayload,
  StartSinglePlayerPayload,
  EmotePayload,
  EmoteKind,
  LobbyPlayer,
} from '@skyjo/shared';
import { MAX_PLAYERS, MIN_PLAYERS } from '@skyjo/shared';
import { GameEngine } from './GameEngine.js';
import { Bot } from './Bot.js';
import { BotDifficulty } from './BotDifficulty.js';
import { generateRoomCode } from '../utils/roomCodes.js';

function log(room: string, ...args: unknown[]) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] [${room}]`, ...args);
}

function generatePlayerId(): string {
  return crypto.randomUUID();
}

interface RoomPlayer {
  id: string;       // Stable UUID (persists across reconnects)
  socketId: string;  // Current socket.id (changes on reconnect)
  nickname: string;
  avatar: string;
  isHost: boolean;
  isBot: boolean;
}

interface Room {
  code: string;
  players: RoomPlayer[];
  engine: GameEngine | null;
  hostId: string;  // Now stores the stable playerId, not socket.id
  botDifficulty: BotDifficulty;
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

// Map socketId -> roomCode (for quick room lookup from socket)
const socketRoomMap = new Map<string, string>();
// Map socketId -> stable playerId
const socketToPlayer = new Map<string, string>();
// Map playerId -> last emote timestamp (ms) for rate limiting
const lastEmoteAt = new Map<string, number>();
const EMOTE_COOLDOWN_MS = 2000;
const ALLOWED_EMOTES: ReadonlySet<EmoteKind> = new Set([
  'thumbs-up', 'tada', 'sweat', 'scream', 'fire', 'think',
]);

export class RoomManager {
  private rooms = new Map<string, Room>();
  private roomCodes = new Set<string>();

  createRoom(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    payload: CreateRoomPayload
  ): void {
    const code = generateRoomCode(this.roomCodes);
    const playerId = generatePlayerId();

    const player: RoomPlayer = {
      id: playerId,
      socketId: socket.id,
      nickname: payload.nickname,
      avatar: payload.avatar,
      isHost: true,
      isBot: false,
    };

    const room: Room = {
      code,
      players: [player],
      engine: null,
      hostId: playerId,
      botDifficulty: new BotDifficulty(),
    };

    this.rooms.set(code, room);
    this.roomCodes.add(code);
    socketRoomMap.set(socket.id, code);
    socketToPlayer.set(socket.id, playerId);

    socket.join(code);

    socket.emit('room-created', {
      roomCode: code,
      playerId,
      lobby: this.getLobbyPlayers(room),
    });
  }

  startSinglePlayer(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    payload: StartSinglePlayerPayload
  ): void {
    // Create room
    const code = generateRoomCode(this.roomCodes);
    const playerId = generatePlayerId();

    const player: RoomPlayer = {
      id: playerId,
      socketId: socket.id,
      nickname: payload.nickname,
      avatar: payload.avatar,
      isHost: true,
      isBot: false,
    };

    const room: Room = {
      code,
      players: [player],
      engine: null,
      hostId: playerId,
      botDifficulty: new BotDifficulty(),
    };

    // Add bots
    const botCount = Math.max(1, Math.min(7, payload.botCount ?? 3));
    const allBotNames = [
      'Anna', 'Ben', 'Clara', 'David', 'Elena', 'Felix', 'Greta', 'Hannah',
      'Ida', 'Jan', 'Katja', 'Lukas', 'Mia', 'Nils', 'Olga', 'Paul',
      'Romy', 'Stefan', 'Tina', 'Ulf', 'Vera', 'Werner', 'Xenia', 'Yara',
      'Zoe', 'Fritz', 'Heidi', 'Moritz', 'Lena', 'Tobias', 'Sophie', 'Kai',
      'Lotte', 'Rudi', 'Maja', 'Oskar', 'Pia', 'Lars', 'Emilia', 'Theo',
      'Elsa', 'Hugo', 'Nora', 'Anton', 'Frieda', 'Erik', 'Klara', 'Otto',
      'Rosa', 'Karl', 'Hilde', 'Gustav', 'Alma', 'Bruno', 'Marta', 'Willi',
      'Liesel', 'Franz', 'Gerda', 'Heinz', 'Erna', 'Kurt', 'Trudi', 'Sepp',
    ];
    // Shuffle and pick unique names
    const shuffled = [...allBotNames].sort(() => Math.random() - 0.5);
    const botEmojis = ['🤖', '🦊', '🐸', '🦁', '🐼', '🐱', '🐶'];
    for (let i = 0; i < botCount; i++) {
      const botId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      room.players.push({
        id: botId,
        socketId: '',
        nickname: shuffled[i % shuffled.length],
        avatar: botEmojis[i % botEmojis.length],
        isHost: false,
        isBot: true,
      });
    }

    this.rooms.set(code, room);
    this.roomCodes.add(code);
    socketRoomMap.set(socket.id, code);
    socketToPlayer.set(socket.id, playerId);
    socket.join(code);

    // Start the game immediately
    const playerInfos = room.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      isBot: p.isBot,
    }));

    room.engine = new GameEngine(playerInfos);
    room.engine.startRound();
    log(code, `Single-player game started! ${room.players.length} players: ${room.players.map(p => `${p.nickname}${p.isBot ? '(bot)' : ''}`).join(', ')}`);

    socket.emit('room-created', {
      roomCode: code,
      playerId,
      lobby: this.getLobbyPlayers(room),
    });

    const visibleState = room.engine.getVisibleState(playerId);
    socket.emit('game-started', visibleState);

    // Process bot initial flips
    this.processBotTurns(io, room);
  }

  joinRoom(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    payload: JoinRoomPayload
  ): void {
    const room = this.rooms.get(payload.roomCode.toUpperCase());
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.engine) {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    if (room.players.length >= MAX_PLAYERS) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    const playerId = generatePlayerId();
    const player: RoomPlayer = {
      id: playerId,
      socketId: socket.id,
      nickname: payload.nickname,
      avatar: payload.avatar,
      isHost: false,
      isBot: false,
    };

    room.players.push(player);
    socketRoomMap.set(socket.id, room.code);
    socketToPlayer.set(socket.id, playerId);

    socket.join(room.code);

    socket.emit('room-joined', {
      roomCode: room.code,
      playerId,
      lobby: this.getLobbyPlayers(room),
    });

    // Notify other players
    socket.to(room.code).emit('player-joined', {
      player: this.toLobbyPlayer(player),
    });
  }

  startGame(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>
  ): void {
    const room = this.getRoom(socket);
    if (!room) return;
    const pid = this.getPlayerId(socket);

    if (room.hostId !== pid) {
      socket.emit('error', { message: 'Only the host can start the game' });
      return;
    }

    if (room.players.length < MIN_PLAYERS) {
      socket.emit('error', { message: `Need at least ${MIN_PLAYERS} players` });
      return;
    }

    const playerInfos = room.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      isBot: p.isBot,
    }));

    room.engine = new GameEngine(playerInfos);
    room.engine.startRound();
    log(room.code, `Game started! ${room.players.length} players: ${room.players.map(p => `${p.nickname}${p.isBot ? '(bot)' : ''}`).join(', ')}`);

    // Send personalized initial game state to each player via game-started
    for (const player of room.players) {
      if (player.isBot) continue;
      const visibleState = room.engine.getVisibleState(player.id);
      io.to(player.socketId).emit('game-started', visibleState);
    }
  }

  flipInitialCard(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    payload: FlipInitialCardPayload
  ): void {
    const room = this.getRoom(socket);
    if (!room?.engine) return;
    const pid = this.getPlayerId(socket);
    if (!pid) return;

    const result = room.engine.flipInitialCard(pid, payload.cardIndex);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Broadcast animation event
    io.to(room.code).emit('animation-event', {
      type: 'flip-card',
      playerId: pid,
      data: { cardIndex: payload.cardIndex },
    });

    this.broadcastGameState(io, room);

    // If bots still need to flip, do so
    if (room.engine.state.phase === 'flipping_initial') {
      this.processBotTurns(io, room);
    }

    // If initial flips just completed and game started, kick off bot turns
    if (room.engine.state.phase === 'playing' || room.engine.state.phase === 'final_round') {
      this.processBotTurns(io, room);
    }
  }

  drawFromPile(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>
  ): void {
    const room = this.getRoom(socket);
    if (!room?.engine) return;
    const pid = this.getPlayerId(socket);
    if (!pid) return;

    const result = room.engine.drawFromPile(pid);
    if (!result.ok) {
      log(room.code, `Human drawFromPile FAILED: ${result.error}`);
      socket.emit('error', { message: result.error });
      return;
    }
    log(room.code, `Human drawFromPile OK. drawnCard=${room.engine.state.drawnCard}`);

    io.to(room.code).emit('animation-event', {
      type: 'draw-from-pile',
      playerId: pid,
      data: { value: room.engine.state.drawnCard },
    });

    this.broadcastGameState(io, room);
  }

  drawFromDiscard(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>
  ): void {
    const room = this.getRoom(socket);
    if (!room?.engine) return;
    const pid = this.getPlayerId(socket);
    if (!pid) return;

    const result = room.engine.drawFromDiscard(pid);
    if (!result.ok) {
      log(room.code, `Human drawFromDiscard FAILED: ${result.error}`);
      socket.emit('error', { message: result.error });
      return;
    }
    log(room.code, `Human drawFromDiscard OK. drawnCard=${room.engine.state.drawnCard}`);

    io.to(room.code).emit('animation-event', {
      type: 'draw-from-discard',
      playerId: pid,
      data: { value: room.engine.state.drawnCard },
    });

    this.broadcastGameState(io, room);
  }

  placeDrawnCard(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    payload: PlaceDrawnCardPayload
  ): void {
    const room = this.getRoom(socket);
    if (!room?.engine) return;
    const pid = this.getPlayerId(socket);
    if (!pid) return;

    const result = room.engine.placeDrawnCard(pid, payload.cardIndex);
    if (!result.ok) {
      log(room.code, `Human placeDrawnCard FAILED: ${result.error}`);
      socket.emit('error', { message: result.error });
      return;
    }
    log(room.code, `Human placeDrawnCard OK. cardIndex=${payload.cardIndex} colElim=${result.columnEliminated} phase=${room.engine.state.phase} turnPhase=${room.engine.state.turnPhase} currentIdx=${room.engine.state.currentPlayerIndex}`);

    io.to(room.code).emit('animation-event', {
      type: 'place-card',
      playerId: pid,
      data: { cardIndex: payload.cardIndex, columnEliminated: result.columnEliminated, replacedCard: result.replacedCard },
    });

    if (result.columnEliminated !== undefined) {
      io.to(room.code).emit('animation-event', {
        type: 'column-eliminate',
        playerId: pid,
        data: { column: result.columnEliminated },
      });
    }

    this.broadcastGameState(io, room);
    this.checkRoundEnd(io, room);
    this.processBotTurns(io, room);
  }

  discardDrawnCard(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>
  ): void {
    const room = this.getRoom(socket);
    if (!room?.engine) return;
    const pid = this.getPlayerId(socket);
    if (!pid) return;

    const result = room.engine.discardDrawnCard(pid);
    if (!result.ok) {
      log(room.code, `Human discardDrawnCard FAILED: ${result.error}`);
      socket.emit('error', { message: result.error });
      return;
    }
    log(room.code, `Human discardDrawnCard OK. phase=${room.engine.state.phase} turnPhase=${room.engine.state.turnPhase}`);

    io.to(room.code).emit('animation-event', {
      type: 'discard-card',
      playerId: pid,
      data: {},
    });

    this.broadcastGameState(io, room);
  }

  flipCard(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    payload: FlipCardPayload
  ): void {
    const room = this.getRoom(socket);
    if (!room?.engine) return;
    const pid = this.getPlayerId(socket);
    if (!pid) return;

    const result = room.engine.flipCard(pid, payload.cardIndex);
    if (!result.ok) {
      log(room.code, `Human flipCard FAILED: ${result.error}`);
      socket.emit('error', { message: result.error });
      return;
    }
    log(room.code, `Human flipCard OK. cardIndex=${payload.cardIndex} colElim=${result.columnEliminated} phase=${room.engine.state.phase} turnPhase=${room.engine.state.turnPhase} currentIdx=${room.engine.state.currentPlayerIndex}`);

    io.to(room.code).emit('animation-event', {
      type: 'flip-card',
      playerId: pid,
      data: { cardIndex: payload.cardIndex, columnEliminated: result.columnEliminated },
    });

    if (result.columnEliminated !== undefined) {
      io.to(room.code).emit('animation-event', {
        type: 'column-eliminate',
        playerId: pid,
        data: { column: result.columnEliminated },
      });
    }

    this.broadcastGameState(io, room);
    this.checkRoundEnd(io, room);
    this.processBotTurns(io, room);
  }

  addBot(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    payload: AddBotPayload
  ): void {
    const room = this.getRoom(socket);
    if (!room) return;
    const pid = this.getPlayerId(socket);

    if (room.hostId !== pid) {
      socket.emit('error', { message: 'Only the host can add bots' });
      return;
    }

    if (room.players.length >= MAX_PLAYERS) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    const botId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const bot: RoomPlayer = {
      id: botId,
      socketId: '',
      nickname: payload.nickname,
      avatar: '🤖',
      isHost: false,
      isBot: true,
    };

    room.players.push(bot);

    io.to(room.code).emit('lobby-update', this.getLobbyPlayers(room));
  }

  removeBot(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    payload: RemoveBotPayload
  ): void {
    const room = this.getRoom(socket);
    if (!room) return;
    const pid = this.getPlayerId(socket);

    if (room.hostId !== pid) {
      socket.emit('error', { message: 'Only the host can remove bots' });
      return;
    }

    room.players = room.players.filter((p) => p.id !== payload.botId);

    io.to(room.code).emit('lobby-update', this.getLobbyPlayers(room));
  }

  playAgain(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>
  ): void {
    const room = this.getRoom(socket);
    if (!room) {
      log('???', `play-again: no room found for socket ${socket.id}`);
      socket.emit('error', { message: 'Raum nicht gefunden' });
      return;
    }
    if (!room.engine) {
      log(room.code, `play-again: no engine`);
      return;
    }
    const pid = this.getPlayerId(socket);
    log(room.code, `play-again requested by ${pid} (host=${room.hostId})`);

    if (room.hostId !== pid) {
      socket.emit('error', { message: 'Only the host can start a new game' });
      return;
    }

    room.engine.startRound();
    log(room.code, `New round ${room.engine.state.roundNumber} started, phase=${room.engine.state.phase}`);
    this.broadcastGameState(io, room);
    this.processBotTurns(io, room);
  }

  handleDisconnect(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>
  ): void {
    const roomCode = socketRoomMap.get(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    socketRoomMap.delete(socket.id);
    socketToPlayer.delete(socket.id);

    log(roomCode, `Player disconnected: ${playerId} (socket=${socket.id})`);

    // If game not started, remove player from lobby
    if (!room.engine) {
      room.players = room.players.filter((p) => p.id !== playerId);

      if (room.players.filter(p => !p.isBot).length === 0) {
        this.rooms.delete(roomCode);
        this.roomCodes.delete(roomCode);
        return;
      }

      // Transfer host if needed
      if (room.hostId === playerId) {
        const newHost = room.players.find((p) => !p.isBot);
        if (newHost) {
          newHost.isHost = true;
          room.hostId = newHost.id;
        }
      }

      io.to(roomCode).emit('player-left', { playerId: playerId ?? socket.id });
      io.to(roomCode).emit('lobby-update', this.getLobbyPlayers(room));
    } else {
      // Game in progress — mark player as disconnected but keep room alive
      const enginePlayer = room.engine.state.players.find((p) => p.id === playerId);
      if (enginePlayer) {
        enginePlayer.connected = false;
      }

      // Schedule cleanup after 2 minutes if no humans reconnect
      if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
      room.cleanupTimer = setTimeout(() => {
        const hasConnectedHumans = room.players.some(
          (p) => !p.isBot && socketRoomMap.has(p.socketId)
        );
        if (!hasConnectedHumans) {
          log(roomCode, 'No humans reconnected after 2 min, cleaning up room');
          this.rooms.delete(roomCode);
          this.roomCodes.delete(roomCode);
        }
      }, 120_000);
    }
  }

  rejoinRoom(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    payload: { playerId: string; roomCode: string }
  ): void {
    const room = this.rooms.get(payload.roomCode);
    if (!room) {
      socket.emit('error', { message: 'Raum nicht mehr verfuegbar' });
      return;
    }

    // Find the player in the room by their stable ID
    const player = room.players.find((p) => p.id === payload.playerId && !p.isBot);
    if (!player) {
      socket.emit('error', { message: 'Spieler nicht im Raum gefunden' });
      return;
    }

    log(room.code, `Player rejoining: ${player.nickname} (${payload.playerId}) with new socket=${socket.id}`);

    // Update mappings
    player.socketId = socket.id;
    socketRoomMap.set(socket.id, room.code);
    socketToPlayer.set(socket.id, payload.playerId);

    // Cancel cleanup timer since a human is back
    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
      room.cleanupTimer = undefined;
    }

    // Re-join the socket.io room
    socket.join(room.code);

    // Mark player as connected in engine
    if (room.engine) {
      const enginePlayer = room.engine.state.players.find((p) => p.id === payload.playerId);
      if (enginePlayer) {
        enginePlayer.connected = true;
      }

      // Send current game state + lobby data
      const visibleState = room.engine.getVisibleState(payload.playerId);
      socket.emit('rejoined', {
        roomCode: room.code,
        playerId: payload.playerId,
        gameState: visibleState,
        lobby: this.getLobbyPlayers(room),
      });
    } else {
      // Game hasn't started yet — rejoin lobby
      socket.emit('room-joined', {
        roomCode: room.code,
        playerId: payload.playerId,
        lobby: this.getLobbyPlayers(room),
      });
    }
  }

  handleEmote(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    payload: EmotePayload
  ): void {
    if (!payload || !ALLOWED_EMOTES.has(payload.emote)) return;
    const room = this.getRoom(socket);
    const playerId = this.getPlayerId(socket);
    if (!room || !playerId) return;

    const now = Date.now();
    const last = lastEmoteAt.get(playerId) ?? 0;
    if (now - last < EMOTE_COOLDOWN_MS) return;
    lastEmoteAt.set(playerId, now);

    io.to(room.code).emit('emote', { playerId, emote: payload.emote });
  }

  private getRoom(socket: Socket): Room | null {
    const roomCode = socketRoomMap.get(socket.id);
    if (!roomCode) return null;
    return this.rooms.get(roomCode) || null;
  }

  private getPlayerId(socket: Socket): string | null {
    return socketToPlayer.get(socket.id) ?? null;
  }

  private getLobbyPlayers(room: Room): LobbyPlayer[] {
    return room.players.map((p) => this.toLobbyPlayer(p));
  }

  private toLobbyPlayer(p: RoomPlayer): LobbyPlayer {
    return {
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      isHost: p.isHost,
      isBot: p.isBot,
    };
  }

  private broadcastGameState(
    io: Server<ClientEvents, ServerEvents>,
    room: Room
  ): void {
    if (!room.engine) return;

    for (const player of room.players) {
      if (player.isBot) continue;
      const visibleState = room.engine.getVisibleState(player.id);
      io.to(player.socketId).emit('game-state-update', visibleState);
    }
  }

  private checkRoundEnd(
    io: Server<ClientEvents, ServerEvents>,
    room: Room
  ): void {
    if (!room.engine) return;

    if (room.engine.state.phase === 'round_over') {
      log(room.code, `Round over! Computing scores.`);
      const scores = room.engine.getRoundScores();
      io.to(room.code).emit('round-ended', scores);

      // getRoundScores() may change phase to 'game_over'
      const phaseAfterScoring = room.engine.state.phase as string;
      if (phaseAfterScoring === 'game_over') {
        const finalScores: Record<string, number> = {};
        let winnerId = '';
        let lowestScore = Infinity;

        for (const p of room.engine.state.players) {
          finalScores[p.id] = p.score;
          if (p.score < lowestScore) {
            lowestScore = p.score;
            winnerId = p.id;
          }
        }

        io.to(room.code).emit('game-ended', { finalScores, winnerId });
      }
    }
  }

  private processBotTurns(
    io: Server<ClientEvents, ServerEvents>,
    room: Room
  ): void {
    if (!room.engine) return;
    const engine = room.engine;
    const state = engine.state;

    // Handle bot initial flips — stagger each flip so animations play one at a time
    if (state.phase === 'flipping_initial') {
      // Collect all bot flips to schedule sequentially
      const flips: { player: typeof state.players[0]; tier: ReturnType<typeof room.botDifficulty.getTier> }[] = [];
      for (const player of state.players) {
        if (!player.isBot || player.initialFlipsRemaining <= 0) continue;
        const tier = room.botDifficulty.getTier();
        // Each remaining flip gets its own entry
        for (let i = 0; i < player.initialFlipsRemaining; i++) {
          flips.push({ player, tier });
        }
      }

      // Schedule each flip with staggered delays (800ms apart, first after 800-1500ms)
      const baseDelay = 800 + Math.random() * 700;
      const flipInterval = 800;

      flips.forEach((flip, idx) => {
        setTimeout(() => {
          if (!room.engine) return;
          const cardIndex = Bot.decideInitialFlip(flip.player, flip.tier);
          if (cardIndex < 0) return;

          const result = engine.flipInitialCard(flip.player.id, cardIndex);
          if (result.ok) {
            io.to(room.code).emit('animation-event', {
              type: 'flip-card',
              playerId: flip.player.id,
              data: { cardIndex },
            });
            this.broadcastGameState(io, room);
          }

          // After the last flip, check if game has started
          if (idx === flips.length - 1 && state.phase === 'playing') {
            setTimeout(() => this.processBotTurns(io, room), 500);
          }
        }, baseDelay + idx * flipInterval);
      });
      return;
    }

    // Handle bot regular turns
    if (state.phase !== 'playing' && state.phase !== 'final_round') return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer.isBot) {
      log(room.code, `Turn: ${currentPlayer.nickname} (human) — waiting for input. phase=${state.phase} turnPhase=${state.turnPhase}`);
      return;
    }

    const tier = room.botDifficulty.getTier();
    const mistakeRate = room.botDifficulty.getMistakeRate();

    log(room.code, `Bot turn: ${currentPlayer.nickname} (idx=${state.currentPlayerIndex}) phase=${state.phase} turnPhase=${state.turnPhase} tier=${tier}`);

    const executeBotActions = () => {
      const actions = Bot.decide(state, currentPlayer.id, tier, mistakeRate);
      log(room.code, `Bot ${currentPlayer.nickname} decides: ${JSON.stringify(actions.map(a => a.type))}`);

      // Chain actions sequentially with cumulative delays
      // flip-card (must_flip after discard) happens quickly; other actions get normal delay
      let cumulativeDelay = 0;

      for (const action of actions) {
        const actionDelay = action.type === 'flip-card'
          ? 200 + Math.random() * 200   // Quick flip after discard
          : 600 + Math.random() * 800;  // Normal delay for other actions
        cumulativeDelay += actionDelay;

        setTimeout(() => {
          // Guard: room/engine may have been cleaned up during the delay
          if (!room.engine) return;

          let result;
          log(room.code, `Bot ${currentPlayer.nickname} exec: ${action.type}${action.cardIndex !== undefined ? ` cardIndex=${action.cardIndex}` : ''} phase=${engine.state.phase} turnPhase=${engine.state.turnPhase}`);

          switch (action.type) {
            case 'draw-from-pile':
              result = engine.drawFromPile(currentPlayer.id);
              if (result.ok) {
                io.to(room.code).emit('animation-event', {
                  type: 'draw-from-pile',
                  playerId: currentPlayer.id,
                  data: { value: engine.state.drawnCard },
                });
              }
              break;

            case 'draw-from-discard':
              result = engine.drawFromDiscard(currentPlayer.id);
              if (result.ok) {
                io.to(room.code).emit('animation-event', {
                  type: 'draw-from-discard',
                  playerId: currentPlayer.id,
                  data: { value: engine.state.drawnCard },
                });
              }
              break;

            case 'place-drawn-card':
              result = engine.placeDrawnCard(currentPlayer.id, action.cardIndex!);
              if (result.ok) {
                io.to(room.code).emit('animation-event', {
                  type: 'place-card',
                  playerId: currentPlayer.id,
                  data: { cardIndex: action.cardIndex, columnEliminated: result.columnEliminated, replacedCard: result.replacedCard },
                });
                if (result.columnEliminated !== undefined) {
                  io.to(room.code).emit('animation-event', {
                    type: 'column-eliminate',
                    playerId: currentPlayer.id,
                    data: { column: result.columnEliminated },
                  });
                }
              }
              break;

            case 'discard-drawn-card':
              result = engine.discardDrawnCard(currentPlayer.id);
              if (result.ok) {
                io.to(room.code).emit('animation-event', {
                  type: 'discard-card',
                  playerId: currentPlayer.id,
                  data: {},
                });
              }
              break;

            case 'flip-card':
              result = engine.flipCard(currentPlayer.id, action.cardIndex!);
              if (result.ok) {
                io.to(room.code).emit('animation-event', {
                  type: 'flip-card',
                  playerId: currentPlayer.id,
                  data: { cardIndex: action.cardIndex, columnEliminated: result.columnEliminated },
                });
                if (result.columnEliminated !== undefined) {
                  io.to(room.code).emit('animation-event', {
                    type: 'column-eliminate',
                    playerId: currentPlayer.id,
                    data: { column: result.columnEliminated },
                  });
                }
              }
              break;
          }

          if (!result || !result.ok) {
            log(room.code, `!! Bot ${currentPlayer.nickname} action FAILED: ${action.type} -> ${result?.error ?? 'no result'}`);
          } else {
            log(room.code, `Bot ${currentPlayer.nickname} action OK: ${action.type} -> phase=${engine.state.phase} turnPhase=${engine.state.turnPhase} currentIdx=${engine.state.currentPlayerIndex}`);
          }

          this.broadcastGameState(io, room);
        }, cumulativeDelay);
      }

      // After all bot actions complete, check for next bot turn or round end
      setTimeout(() => {
        if (!room.engine) return;
        log(room.code, `Bot ${currentPlayer.nickname} actions done. phase=${engine.state.phase} turnPhase=${engine.state.turnPhase} currentIdx=${engine.state.currentPlayerIndex}`);
        this.checkRoundEnd(io, room);
        // If next player is also a bot, process their turn too
        if (state.phase === 'playing' || state.phase === 'final_round') {
          const nextPlayer = state.players[state.currentPlayerIndex];
          if (nextPlayer?.isBot) {
            log(room.code, `Next bot: ${nextPlayer.nickname} (idx=${state.currentPlayerIndex})`);
            this.processBotTurns(io, room);
          } else if (nextPlayer) {
            log(room.code, `Next player: ${nextPlayer.nickname} (human, idx=${state.currentPlayerIndex})`);
          } else {
            log(room.code, `!! No next player at idx=${state.currentPlayerIndex}, players=${state.players.length}`);
          }
        } else {
          log(room.code, `Game not in play phase: ${state.phase}`);
        }
      }, cumulativeDelay + 1000);
    };

    // Initial delay before bot starts its turn
    const initialDelay = 800 + Math.random() * 1200;
    setTimeout(executeBotActions, initialDelay);
  }
}
