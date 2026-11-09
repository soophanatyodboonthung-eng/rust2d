// Rust2D game server entry point.
//
// Colyseus 0.18 wiring (verified against @colyseus/core 0.18.27 types):
// - The HTTP server is created bare (no custom request handler). The
//   Colyseus Server owns matchmaking routes (`/matchmake/*`) and the
//   WebSocket upgrade; custom routes are added through the `express`
//   option, which receives the transport's Express-compatible app.
// - `serverless()` prepares matchmaking + HTTP routes and returns the
//   underlying http.Server WITHOUT binding a port, so tests can listen
//   on an ephemeral port. (Passing a hand-written request handler that
//   404s everything, as in the first draft, breaks matchmaking — the
//   client gets `MatchMakeError: Not Found`.)
//
// Exported as a factory so tests can boot the server without touching
// the real port.

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';

import { serverConfig } from './config.js';
import { WorldRoom } from './rooms/WorldRoom.js';

export async function createGameServer() {
  const httpServer = createServer();
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
    express: (app) => {
      app.get('/health', (_req, res) => res.json({ ok: true }));
    },
  });
  gameServer.define('world', WorldRoom);
  await gameServer.serverless();
  return { httpServer, gameServer };
}

const isEntryPoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntryPoint) {
  const { httpServer } = await createGameServer();
  httpServer.listen(serverConfig.PORT, serverConfig.HOST, () => {
    console.log(`[server] Rust2D listening on ${serverConfig.HOST}:${serverConfig.PORT}`);
    console.log(`[server] health: http://${serverConfig.HOST}:${serverConfig.PORT}/health`);
  });
}
