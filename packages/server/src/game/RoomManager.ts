import { Server, Socket } from 'socket.io';
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
  LobbyPlayer,
} from '@skyjo/shared';
import { MAX_PLAYERS, MIN_PLAYERS } from '@skyjo/shared';
import { GameEngine } from './GameEngine.js';
import { Bot } from './Bot.js';
import { BotDifficulty } from './BotDifficulty.js';
import { generateRoomCode } from '../utils/roomCodes.js';

interface RoomPlayer {
  id: string;
  socketId: string;
  nickname: string;
  avatar: string;
  isHost: boolean;
  isBot: boolean;
}

interface Room {
  code: string;
  players: RoomPlayer[];
  engine: GameEngine | null;
  hostId: string;
  botDifficulty: BotDifficulty;
}

// Map socketId -> roomCode
const socketRoomMap = new Map<string, string>();

export class RoomManager {
  private rooms = new Map<string, Room>();
  private roomCodes = new Set<string>();

  createRoom(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    payload: CreateRoomPayload
  ): void {
    const code = generateRoomCode(this.roomCodes);
    const playerId = socket.id;

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

    socket.join(code);

    socket.emit('room-created', {
      roomCode: code,
      playerId,
      lobby: this.getLobbyPlayers(room),
    });
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

    const playerId = socket.id;
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

    if (room.hostId !== socket.id) {
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

    // Send personalized game state to each player
    this.broadcastGameState(io, room);
  }

  flipInitialCard(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    payload: FlipInitialCardPayload
  ): void {
    const room = this.getRoom(socket);
    if (!room?.engine) return;

    const result = room.engine.flipInitialCard(socket.id, payload.cardIndex);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Broadcast animation event
    io.to(room.code).emit('animation-event', {
      type: 'flip-card',
      playerId: socket.id,
      data: { cardIndex: payload.cardIndex },
    });

    this.broadcastGameState(io, room);

    // If bots need to flip, do so
    if (room.engine.state.phase === 'flipping_initial') {
      this.processBotTurns(io, room);
    }
  }

  drawFromPile(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>
  ): void {
    const room = this.getRoom(socket);
    if (!room?.engine) return;

    const result = room.engine.drawFromPile(socket.id);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(room.code).emit('animation-event', {
      type: 'draw-from-pile',
      playerId: socket.id,
      data: {},
    });

    this.broadcastGameState(io, room);
  }

  drawFromDiscard(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>
  ): void {
    const room = this.getRoom(socket);
    if (!room?.engine) return;

    const result = room.engine.drawFromDiscard(socket.id);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(room.code).emit('animation-event', {
      type: 'draw-from-discard',
      playerId: socket.id,
      data: {},
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

    const result = room.engine.placeDrawnCard(socket.id, payload.cardIndex);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(room.code).emit('animation-event', {
      type: 'place-card',
      playerId: socket.id,
      data: { cardIndex: payload.cardIndex, columnEliminated: result.columnEliminated },
    });

    if (result.columnEliminated !== undefined) {
      io.to(room.code).emit('animation-event', {
        type: 'column-eliminate',
        playerId: socket.id,
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

    const result = room.engine.discardDrawnCard(socket.id);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(room.code).emit('animation-event', {
      type: 'discard-card',
      playerId: socket.id,
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

    const result = room.engine.flipCard(socket.id, payload.cardIndex);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(room.code).emit('animation-event', {
      type: 'flip-card',
      playerId: socket.id,
      data: { cardIndex: payload.cardIndex, columnEliminated: result.columnEliminated },
    });

    if (result.columnEliminated !== undefined) {
      io.to(room.code).emit('animation-event', {
        type: 'column-eliminate',
        playerId: socket.id,
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

    if (room.hostId !== socket.id) {
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

    if (room.hostId !== socket.id) {
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
    if (!room?.engine) return;

    if (room.hostId !== socket.id) {
      socket.emit('error', { message: 'Only the host can start a new game' });
      return;
    }

    room.engine.startRound();
    this.broadcastGameState(io, room);
    this.processBotTurns(io, room);
  }

  handleDisconnect(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>
  ): void {
    const roomCode = socketRoomMap.get(socket.id);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    socketRoomMap.delete(socket.id);

    // If game not started, remove player
    if (!room.engine) {
      room.players = room.players.filter((p) => p.socketId !== socket.id);

      if (room.players.length === 0) {
        this.rooms.delete(roomCode);
        this.roomCodes.delete(roomCode);
        return;
      }

      // Transfer host if needed
      if (room.hostId === socket.id) {
        const newHost = room.players.find((p) => !p.isBot);
        if (newHost) {
          newHost.isHost = true;
          room.hostId = newHost.id;
        }
      }

      io.to(roomCode).emit('player-left', { playerId: socket.id });
      io.to(roomCode).emit('lobby-update', this.getLobbyPlayers(room));
    } else {
      // Mark player as disconnected in game
      const player = room.engine.state.players.find((p) => p.id === socket.id);
      if (player) {
        player.connected = false;
      }

      io.to(roomCode).emit('player-left', { playerId: socket.id });
      this.broadcastGameState(io, room);

      // If all human players disconnected, clean up
      const hasConnectedHumans = room.players.some(
        (p) => !p.isBot && socketRoomMap.has(p.socketId)
      );
      if (!hasConnectedHumans) {
        this.rooms.delete(roomCode);
        this.roomCodes.delete(roomCode);
      }
    }
  }

  private getRoom(socket: Socket): Room | null {
    const roomCode = socketRoomMap.get(socket.id);
    if (!roomCode) return null;
    return this.rooms.get(roomCode) || null;
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

    // Handle bot initial flips
    if (state.phase === 'flipping_initial') {
      for (const player of state.players) {
        if (!player.isBot || player.initialFlipsRemaining <= 0) continue;

        const tier = room.botDifficulty.getTier();
        const delay = 800 + Math.random() * 1200; // 800-2000ms

        setTimeout(() => {
          while (player.initialFlipsRemaining > 0) {
            const cardIndex = Bot.decideInitialFlip(player, tier);
            if (cardIndex < 0) break;

            const result = engine.flipInitialCard(player.id, cardIndex);
            if (result.ok) {
              io.to(room.code).emit('animation-event', {
                type: 'flip-card',
                playerId: player.id,
                data: { cardIndex },
              });
            }
          }

          this.broadcastGameState(io, room);

          // Check if all initial flips done -> game might have started playing
          if (state.phase === 'playing') {
            this.processBotTurns(io, room);
          }
        }, delay);
      }
      return;
    }

    // Handle bot regular turns
    if (state.phase !== 'playing' && state.phase !== 'final_round') return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer.isBot) return;

    const tier = room.botDifficulty.getTier();
    const mistakeRate = room.botDifficulty.getMistakeRate();

    const executeBotActions = () => {
      const actions = Bot.decide(state, currentPlayer.id, tier, mistakeRate);

      for (const action of actions) {
        const actionDelay = 600 + Math.random() * 800;

        setTimeout(() => {
          let result;

          switch (action.type) {
            case 'draw-from-pile':
              result = engine.drawFromPile(currentPlayer.id);
              if (result.ok) {
                io.to(room.code).emit('animation-event', {
                  type: 'draw-from-pile',
                  playerId: currentPlayer.id,
                  data: {},
                });
              }
              break;

            case 'draw-from-discard':
              result = engine.drawFromDiscard(currentPlayer.id);
              if (result.ok) {
                io.to(room.code).emit('animation-event', {
                  type: 'draw-from-discard',
                  playerId: currentPlayer.id,
                  data: {},
                });
              }
              break;

            case 'place-drawn-card':
              result = engine.placeDrawnCard(currentPlayer.id, action.cardIndex!);
              if (result.ok) {
                io.to(room.code).emit('animation-event', {
                  type: 'place-card',
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

          this.broadcastGameState(io, room);
        }, actionDelay);
      }

      // After all bot actions, check for next bot turn or round end
      const totalDelay = actions.length * 1400 + 500;
      setTimeout(() => {
        this.checkRoundEnd(io, room);
        // If next player is also a bot, process their turn too
        if (state.phase === 'playing' || state.phase === 'final_round') {
          const nextPlayer = state.players[state.currentPlayerIndex];
          if (nextPlayer?.isBot) {
            this.processBotTurns(io, room);
          }
        }
      }, totalDelay);
    };

    // Initial delay before bot starts its turn
    const initialDelay = 800 + Math.random() * 1200;
    setTimeout(executeBotActions, initialDelay);
  }
}
