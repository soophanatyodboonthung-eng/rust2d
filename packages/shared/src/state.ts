// Colyseus state schema — the single source of truth shared by server
// and client. Phase 0 carries only a tick counter: the room proves the
// state-sync pipeline works without any gameplay. Players, entities and
// chunks arrive in Phase 2.
//
// Written with the `schema()` + `t.*` builder API, NOT the `@type()`
// decorators. Reason (verified 2026-11-10): tsx, the server runner,
// transpiles decorators with TC39 standard semantics, while
// @colyseus/schema's `@type()` decorators are legacy-style — the server
// crashes at import (`target` is undefined in annotations.ts). The
// builder API is the current, non-deprecated API in @colyseus/schema
// 5.x, produces identical wire behaviour, and works under tsx,
// vitest/esbuild and Metro alike. All future schema classes must use
// this API — no `@type()` decorators anywhere in the repo.

import { schema, t, type SchemaType } from '@colyseus/schema';

export const WorldState = schema(
  {
    tick: t.number().default(0),
  },
  'WorldState',
);

export type WorldState = SchemaType<typeof WorldState>;
