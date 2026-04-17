import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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

// Version check — used by the client to detect new deploys and force a
// reload when the currently-running bundle is stale.
const BUILD_ID = (() => {
  try {
    const indexHtml = path.resolve(__dirname, '../../client/dist/index.html');
    const stat = fs.statSync(indexHtml);
    const buf = fs.readFileSync(indexHtml);
    return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10) + '-' + stat.mtimeMs;
  } catch {
    return String(Date.now());
  }
})();

app.get('/api/version', async (_req, reply) => {
  reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
  return { version: process.env.APP_VERSION ?? 'unknown', build: BUILD_ID };
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
