# AGENTS.md

## Project

MY IPTV is a user-configurable IPTV media interface for LG webOS first, with future Android and iOS companion support.

The app does not provide channels, playlists, or media content. Users provide their own authorized M3U/M3U8 playlists, XMLTV EPG URLs, or Xtream Codes credentials.

## Current Direction

- Build a browser-runnable LG webOS-style TV app first.
- Use React, TypeScript, and Vite for the TV/web shell.
- Keep IPTV parsing, normalization, diagnostics, and shared models in `packages/iptv-core`.
- Keep mobile-ready architecture in mind, but do not build mobile until the TV/web MVP proves the core.
- Use HLS-first playback for MVP.
- Treat non-HLS streams as best-effort until platform support is verified.
- Current UI direction is based on the Stitch "Cinematic Charcoal" design: dark neutral surfaces, electric-cyan focus states, large TV typography, and compact laptop-preview breakpoints.

## Repository Shape

```text
apps/
  webos-tv/
    React/Vite TV app shell

packages/
  iptv-core/
    Shared IPTV models, parsers, normalization, diagnostics

docs/
  Product, architecture, feature, and workflow docs
```

## Engineering Rules

- Prefer TypeScript.
- Keep shared business logic out of platform apps.
- Store user cleanup as overrides instead of mutating raw source data.
- Never log passwords, full credential URLs, or private playlist URLs.
- Use typed errors for sync failures.
- Keep playback platform-aware through capability checks.
- Add tests for parsers and normalization logic before relying on them in UI.
- Keep UI remote-first: arrow keys, Enter/OK, Back/Escape, obvious focus states.
- Preserve laptop preview usability while keeping TV-first composition. Non-player document screens may scroll on desktop; player and Live TV should remain fixed, TV-like surfaces.
- Do not add decorative placeholder imagery where real video/content should render. The player should use the video element as the primary surface.

## Product Guardrails

- Do not bundle unauthorized streams.
- Use local sample fixtures only for development.
- Include user-provided-content language in setup flows.
- Favor privacy-first, local-first behavior.
- Make source problems understandable through Source Doctor.

## Useful Commands

```sh
pnpm install
pnpm test
pnpm dev:webos
pnpm build
```

If dependencies are not installed yet, `pnpm install` is required before these commands run.

## Current Checkpoint

As of the first UI checkpoint:

- `apps/webos-tv` contains a React/Vite TV shell with Live TV, Source Setup, Source Doctor, Settings, and Player screens.
- `packages/iptv-core` contains shared models, an M3U parser, channel normalization, and metadata-only Source Doctor reporting.
- The app uses local sample playlist data only.
- Verified commands: `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- The workspace is not currently a git repository.
