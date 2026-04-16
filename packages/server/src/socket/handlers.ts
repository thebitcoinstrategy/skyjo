import { Server, Socket } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@skyjo/shared';
import { RoomManager } from '../game/RoomManager.js';

const roomManager = new RoomManager();

export function registerSocketHandlers(
  io: Server<ClientEvents, ServerEvents>
): void {
  io.on('connection', (socket: Socket<ClientEvents, ServerEvents>) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('create-room', (payload) => {
      roomManager.createRoom(io, socket, payload);
    });

    socket.on('join-room', (payload) => {
      roomManager.joinRoom(io, socket, payload);
    });

    socket.on('start-game', () => {
      roomManager.startGame(io, socket);
    });

    socket.on('start-single-player', (payload) => {
      roomManager.startSinglePlayer(io, socket, payload);
    });

    socket.on('flip-initial-card', (payload) => {
      roomManager.flipInitialCard(io, socket, payload);
    });

    socket.on('draw-from-pile', () => {
      roomManager.drawFromPile(io, socket);
    });

    socket.on('draw-from-discard', () => {
      roomManager.drawFromDiscard(io, socket);
    });

    socket.on('place-drawn-card', (payload) => {
      roomManager.placeDrawnCard(io, socket, payload);
    });

    socket.on('discard-drawn-card', () => {
      roomManager.discardDrawnCard(io, socket);
    });

    socket.on('flip-card', (payload) => {
      roomManager.flipCard(io, socket, payload);
    });

    socket.on('add-bot', (payload) => {
      roomManager.addBot(io, socket, payload);
    });

    socket.on('remove-bot', (payload) => {
      roomManager.removeBot(io, socket, payload);
    });

    socket.on('play-again', () => {
      roomManager.playAgain(io, socket);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      roomManager.handleDisconnect(io, socket);
    });
  });
}
