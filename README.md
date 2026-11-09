# Rust2D Online

2D top-down multiplayer survival game (Rust-like) — **Expo / React Native client** + **Colyseus (Node.js/TypeScript) server-authoritative** + **PostgreSQL**.

Current phase: **Phase 0 — repository foundation** (see `AGENTS.md`). No gameplay features yet.

## Layout

```
rust2d/
├── apps/
│   ├── mobile/        # Expo app (moved from the v1 single-player prototype)
│   └── server/        # Colyseus game server (Node 22+)
├── packages/
│   ├── shared/        # protocol, state schema, item/recipe/world data (data only, no logic)
│   ├── simulation/    # pure game logic — no I/O, no React, no Node APIs
│   └── config/        # shared tsconfig base
├── infra/             # Docker Compose (PostgreSQL for dev)
└── .github/workflows/ # CI + unsigned IPA build (macos-26-intel, SideStore flow)
```

## Quickstart

```sh
pnpm install

# game server (Colyseus, port 2567, /health endpoint)
pnpm dev:server

# mobile app (Expo)
pnpm dev:mobile

# checks
pnpm typecheck
pnpm lint
pnpm test
```

## Infrastructure

- Game server + PostgreSQL run on the owner's Ubuntu 24.04 VPS via Docker Compose (`infra/`).
- iOS testing: unsigned IPA built on GitHub Actions (macos-26-intel), installed via SideStore with a free Apple ID. No Apple Developer account needed.
- Full architecture and roadmap: see the master plan document (Rust2D Online Master Technical Plan, 2026-11-10).
