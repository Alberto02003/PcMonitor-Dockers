# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

PcMonitor-Dockers is a **Tauri 2 desktop application** (React 19 frontend + Rust backend) for monitoring remote Linux servers via SSH. It displays real-time system metrics, manages Docker containers, and provides an SSH terminal — all from a Windows desktop app. No backend database or REST API; data is stored locally in Tauri Stronghold (AES-256-GCM encrypted).

## Build & Development Commands

```bash
npm run dev              # Vite dev server only (no Tauri shell)
npm run tauri:dev        # Full desktop app with hot reload
npm run tauri:build      # Production build (NSIS + MSI installers)
npm run build            # Frontend-only production build
npm run lint             # ESLint
npm run test             # Vitest in watch mode
npm run test:run         # Single test run
npm run test:coverage    # Coverage report (v8)
npm run release:patch    # Bump patch version and tag
npm run release:minor    # Bump minor version
npm run release:major    # Bump major version
```

Run a single test file: `npx vitest run test/database.test.js`

## Architecture

**Frontend (src/):** React 19 + Vite 7, no TypeScript. Components use JSX with co-located CSS files.

- **Pages:** `SelectionPage` (connection management) and `MonitoringPage` (live monitoring dashboard). `TerminalWindow` for external terminal.
- **State:** Zustand stores in `src/stores/` — `connectionsStore` (encrypted via Stronghold), `alertsStore`, `metricsStore`.
- **Hooks:** `src/hooks/` — `useRealTimeData` (polling metrics), `useTranslation` (ES/EN i18n), `useConnections`, `useAlerts`, `useAutoUpdater`, `useTheme`, etc.
- **Services:** `src/services/tauri.js` — IPC bridge wrapping all Tauri invoke calls to the Rust backend.
- **i18n:** `src/i18n/es.json` and `en.json`, runtime language switching stored in localStorage.

**Backend (src-tauri/src/):** Rust modules exposed as Tauri commands.

- `ssh.rs` — SSH connection management (ssh2 crate)
- `metrics.rs` / `metrics_advanced.rs` — System metrics collection via SSH commands
- `docker.rs` — Docker/Docker Compose operations via CLI over SSH
- `security.rs` / `crypto.rs` — Stronghold integration, AES-256-GCM encryption
- `websocket.rs` — WebSocket server for real-time data streaming
- `lib.rs` — Tauri command registration and plugin setup

**IPC pattern:** Frontend calls functions in `src/services/tauri.js` → Tauri `invoke()` → Rust command handlers in `lib.rs` → delegated to domain modules.

## Code Conventions

- Each component lives in its own folder: `ComponentName/ComponentName.jsx` + `ComponentName.css`
- Component-scoped CSS; avoid mixing with global styles
- Component assets go inside their own folder
- Bilingual support (Spanish/English) — all user-facing strings go through the i18n system
- Version is tracked in three places: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` (use release scripts to keep in sync)

## Testing

Tests live in `test/` and use Vitest with jsdom environment. Tests mock Tauri APIs (see `test/setup.js`). Test files are organized by fase (fase1 through fase4) covering database, SSH, metrics, Docker, security, hooks, stores, i18n, and more.

## Release & CI

Push a `v*` tag to trigger `.github/workflows/release.yml` which builds Windows installers and creates a GitHub Release with auto-generated bilingual release notes. The Tauri updater checks GitHub Releases via `latest.json`.
