import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import { registerSocketHandlers } from './socket/handlers.js';
import type { ClientEvents, ServerEvents } from '@skyjo/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = Fastify({ logger: true });

await app.register(fastifyCors, {
  origin: process.env.NODE_ENV === 'production' ? true : '*',
});

// In production, serve the built client
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  await app.register(fastifyStatic, {
    root: clientDist,
    prefix: '/',
  });

  // SPA fallback
  app.setNotFoundHandler((_req, reply) => {
    return reply.sendFile('index.html');
  });
}

// Health check
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: Date.now() };
});

// Start Fastify first, then attach Socket.IO to its underlying http server
await app.listen({ port: PORT, host: HOST });

const io = new Server<ClientEvents, ServerEvents>(app.server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? true : '*',
  },
  transports: ['websocket', 'polling'],
});

registerSocketHandlers(io);

console.log(`Skyjo server running on http://${HOST}:${PORT}`);

export { app, io };
