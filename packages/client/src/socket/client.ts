import { io, Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents } from '@skyjo/shared';

// Always connect through the same origin — in dev, Vite proxies
// /socket.io to the game server. This ensures it works from any
// device on the network, not just localhost.
export const socket: Socket<ServerEvents, ClientEvents> = io({
  autoConnect: false,
  transports: ['websocket', 'polling'],
});
