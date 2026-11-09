// One room = one world. Phase 0: the room only advances the world tick
// (20/s) so the state-sync pipeline can be verified end to end.
// Gameplay systems (movement, gather, combat, ...) arrive in Phase 2+.

import { Client, Room } from '@colyseus/core';

import { TICK_MS, WORLD_SEED, WorldState } from '@rust2d/shared';
import { advanceTick, createWorld } from '@rust2d/simulation';

// Colyseus 0.18 types rooms by their options, not by state directly:
// `Room<{ state: WorldState }>` — the state type is extracted from the
// options (`ExtractRoomState<T>`). The old `Room<WorldState>` form no
// longer compiles.
export class WorldRoom extends Room<{ state: WorldState }> {
  maxClients = 20;

  private simWorld = createWorld(WORLD_SEED);

  onCreate() {
    this.setState(new WorldState());
    this.setSimulationInterval(() => {
      advanceTick(this.simWorld);
      this.state.tick = this.simWorld.tick;
    }, TICK_MS);
  }

  onJoin(client: Client) {
    console.log(`[world] client joined: ${client.sessionId} (${this.clients.length} connected)`);
  }

  onLeave(client: Client) {
    console.log(`[world] client left: ${client.sessionId} (${this.clients.length} connected)`);
  }
}
