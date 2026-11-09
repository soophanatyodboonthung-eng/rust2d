// Integration test: boots a real Colyseus server on an ephemeral port,
// connects a real @colyseus/sdk client, and verifies the world tick
// advances over state sync. This is the Phase 0 proof that the
// client <-> server pipeline works — not a mock.

import type { AddressInfo } from 'node:net';

import { Client, type Room } from '@colyseus/sdk';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { WorldState } from '@rust2d/shared';

import { createGameServer } from '../src/index.js';

describe('WorldRoom (live server)', () => {
  let port: number;
  let httpServer: Awaited<ReturnType<typeof createGameServer>>['httpServer'];
  let gameServer: Awaited<ReturnType<typeof createGameServer>>['gameServer'];
  let room: Room<WorldState>;

  beforeAll(async () => {
    ({ httpServer, gameServer } = await createGameServer());
    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    port = (httpServer.address() as AddressInfo).port;
    const client = new Client(`ws://127.0.0.1:${port}`);
    room = await client.joinOrCreate<WorldState>('world');
  }, 15000);

  afterAll(async () => {
    // Guard each step: if beforeAll failed, these may be undefined —
    // the real failure must not be masked by a cleanup TypeError.
    if (room) await room.leave().catch(() => undefined);
    if (gameServer) await gameServer.gracefullyShutdown().catch(() => undefined);
    if (httpServer) {
      httpServer.closeAllConnections();
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
  });

  it('serves /health', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('advances the world tick over state sync', async () => {
    const tick = await waitFor(
      () => room.state.tick,
      (t) => t > 0,
      5000,
    );
    expect(tick).toBeGreaterThan(0);
  });
});

async function waitFor<T>(read: () => T, ok: (v: T) => boolean, timeoutMs: number): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = read();
    if (ok(value)) return value;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timed out waiting (last value: ${String(value)})`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}
