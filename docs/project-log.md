# Project Log

## 2026-06-08: Initial Scaffold and UI Direction

### Completed

- Created the monorepo scaffold with `apps/webos-tv` and `packages/iptv-core`.
- Added React, TypeScript, Vite, Vitest, and pnpm workspace configuration.
- Added shared IPTV models, M3U parsing, channel normalization, and metadata-only Source Doctor reporting.
- Added parser and Source Doctor tests.
- Added initial product docs:
  - `docs/vision.md`
  - `docs/architecture.md`
  - `docs/architecture-review.md`
  - `docs/feature-list.md`
- Added `AGENTS.md` and project-specific development skills.
- Converted Stitch design direction into a React UI:
  - Live TV browser
  - Source Setup
  - Source Doctor
  - Settings
  - Full-screen Player

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```

The dev server was running at:

```text
http://localhost:5173/
```

### Desktop Review Learnings

The UI is TV-first, so its default 10-foot layout can feel oversized on laptop screens. We added a laptop-preview breakpoint below `1500px`.

Important UI findings:

- Live TV works best as a fixed TV surface with internal channel-list scrolling.
- Player should remain full-screen and fixed to the viewport.
- Source Setup, Source Doctor, and Settings need vertical scrolling on laptop viewports.
- Source Doctor recommendations must remain reachable below the fold.
- Source Setup form actions must remain reachable below the fold.
- Do not show diagnostic labels such as `TV layout` in the final UI.

### Current Limitations

- Source Setup is visual only; it does not yet fetch user-entered playlists.
- Favorites and recents are visual/model placeholders.
- Player uses browser-native controls plus custom overlay; future TV player should move toward custom remote-first controls.
- No XMLTV parsing yet.
- No Xtream Codes connector yet.
- No persistent storage yet.
- Workspace is not initialized as a git repository.

### Recommended Next Build Step

Implement real source setup and local persistence:

1. Let users paste an M3U/M3U8 URL.
2. Fetch and parse the playlist.
3. Save source, channels, selected source, favorites, and recents locally.
4. Show typed sync errors for network, CORS, parse, and empty-source failures.
5. Keep demo fixture as fallback/sample data.
