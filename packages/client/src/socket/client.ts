import { io, Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents } from '@skyjo/shared';

const URL =
  import.meta.env.PROD
    ? window.location.origin
    : 'http://localhost:3000';

export const socket: Socket<ServerEvents, ClientEvents> = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});
