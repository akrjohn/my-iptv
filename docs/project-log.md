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

## 2026-06-09: Real M3U Source Sync and Local Catalog

### Completed

- Added a shared `syncM3uPlaylist` helper in `packages/iptv-core`.
- Added typed sync outcomes for successful sync, empty playlists, parse failures, CORS-blocked browser fetches, provider auth rejection, rate limits, and network failures.
- Wired Source Setup to accept a user-provided M3U/M3U8 URL and sync it into the app state.
- Added local catalog persistence for sources, channels, selected source, favorites, and recents.
- Kept the demo local playlist as the first-run fallback.
- Updated Live TV, Source Doctor, Settings, and Player favorite controls to use the active catalog instead of only the static fixture.

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Browser verification passed with a mocked playlist response:

- Source Setup enabled sync only after alias and URL were entered.
- Mocked M3U sync navigated back to Live TV.
- Parsed channels rendered in the channel list.
- Synced source and channel catalog were saved to local storage.
- No browser console errors were observed.

### Current Limitations

- Browser-based M3U fetch can still fail for legitimate user playlists that block CORS.
- The Test Connection and delete-source actions are still visual only.
- Persistence currently uses `localStorage`; a future TV-ready storage adapter should move catalog data to IndexedDB.
- Favorites and recents persist, but there is no dedicated Favorites or Recents screen yet.

### Recommended Next Build Step

Add source management actions and sync recovery:

1. Implement Test Connection against the same typed sync path without saving channels.
2. Add delete-source and clear-local-data flows.
3. Add a resync action for the active source.
4. Show failed saved sources in Settings with recovery actions.
5. Start evaluating IndexedDB as the durable webOS catalog store.

## 2026-06-09: Player Overlay Controls

### Completed

- Replaced reliance on browser-native video controls with visible TV-style overlay controls.
- Added Play/Pause and Mute/Unmute buttons to the player overlay.
- Added keyboard handling so Space or Enter toggles playback from the player surface.
- Kept Favorite available in the player overlay.
- Fixed the laptop-preview player overlay grid so Play/Pause, Mute, and Favorite do not clip or stretch.

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Browser verification confirmed:

- Play/Pause, Mute/Unmute, and Favorite buttons are visible in the player overlay.
- Buttons use stable hit areas at the laptop-preview breakpoint.
- No browser console errors were observed.

### Remaining Player Controls

- Make Channel Up/Down functional.
- Add Last Channel.
- Add Info/Overlay Toggle.
- Add playback error and buffering states.
- Consider subtitles/audio-track controls only when the stream exposes those capabilities.

### Recommended Next Build Step

Keep source management as the main product next step, then follow with functional player controls:

1. Implement Test Connection, delete-source, clear-local-data, and resync.
2. Add functional Channel Up/Down and Last Channel.
3. Add Retry Stream and playback failure display.
4. Add overlay show/hide behavior for remote-first viewing.

## 2026-06-09: Player Seek and Exit Controls

### Completed

- Added explicit Back to Live TV control in the player header.
- Added Escape and Backspace handling to exit the player back to Live TV.
- Added 10-second rewind and 10-second forward controls.
- Added ArrowLeft and ArrowRight keyboard handling for 10-second seek.
- Disabled seek controls automatically when the stream does not expose a seekable range.
- Added player copy that distinguishes seek-enabled playback from pure live streams where seeking is unavailable.

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Browser verification confirmed:

- Back to Live TV, Back 10 seconds, Forward 10 seconds, Play/Pause, and Mute/Unmute are visible.
- Escape exits the player back to Live TV.
- The Back to Live TV button exits the player back to Live TV.
- No browser console errors were observed.

### Remaining Player Controls

All first-pass player controls are now implemented. The next player work should focus on polish, accessibility, and real device behavior.

## 2026-06-09: Player Info and Overlay Toggle

### Completed

- Added an Info control that hides the player overlay.
- Added `I` keyboard handling to toggle the overlay.
- Added auto-hide behavior after a short delay while playback is healthy.
- Revealed the overlay again on player interaction and channel-control keyboard input.
- Kept compact buffering, retrying, and failed statuses visible while the full overlay is hidden.
- Fixed keyboard focus behavior so Escape still exits the player after hiding the overlay from a focused control.

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Browser verification confirmed:

- Info hides the player overlay.
- `I` toggles the overlay back on and off.
- ArrowUp reveals the overlay while switching channels.
- Escape exits back to Live TV even after the overlay was hidden.
- No browser console errors were observed.

### Recommended Next Build Step

Return to source management:

1. Implement Test Connection without saving channels.
2. Add delete-source and clear-local-data flows.
3. Add active-source resync.
4. Show saved source failures in Settings with recovery actions.
5. Start moving durable catalog storage from `localStorage` toward IndexedDB.

## 2026-06-09: Source Management Actions

### Completed

- Added Test Connection for user-entered M3U/M3U8 URLs without saving the source.
- Added active-source and row-level Resync actions for saved playlist sources.
- Preserved matching favorites and recents during resync.
- Added Delete Source while keeping the demo catalog as the fallback source.
- Added Clear Local Data to reset the app to the demo catalog.
- Added Settings feedback for working, success, and error states.
- Kept playlist URLs out of status messages.

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Browser verification with a mocked playlist confirmed:

- Test Connection parsed two channels and did not save a new source.
- Sync saved the source and displayed two channels.
- Resync updated the saved source to three channels.
- Delete Source removed the user source and fell back to the demo catalog.
- Clear Local Data reset the app to the demo catalog.
- No browser console errors were observed.

### Recommended Next Build Step

Move durable catalog persistence from `localStorage` toward IndexedDB:

1. Add a small storage adapter interface for catalog load/save/reset.
2. Implement an IndexedDB-backed catalog store for sources and channels.
3. Keep `localStorage` migration support for existing prototype data.
4. Add storage failure handling and a reset path.
5. Verify large playlist catalogs do not exceed browser storage limits or freeze the UI.

## 2026-06-09: IndexedDB Catalog Storage

### Completed

- Added an app-local catalog storage adapter.
- Moved catalog persistence from synchronous `localStorage` writes to IndexedDB.
- Added a fallback localStorage adapter for environments without IndexedDB.
- Added one-time migration from the prototype `localStorage` catalog key into IndexedDB.
- Removed migrated legacy localStorage data after successful IndexedDB write.
- Kept demo catalog fallback when storage load fails or saved data is unusable.
- Added explicit storage reset during Clear Local Data.

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Browser verification confirmed:

- Synced source catalog persisted in IndexedDB across page reload.
- The legacy `localStorage` catalog migrated into IndexedDB.
- The legacy `localStorage` key was removed after migration.
- No browser console errors were observed.

### Recommended Next Build Step

Add channel search and remote-first list navigation polish:

1. Implement channel search against active catalog name/group metadata.
2. Keep search usable from keyboard and remote-style focus.
3. Add empty search state and clear action.
4. Preserve fixed Live TV layout while filtering.
5. Consider list virtualization for large playlists after search is functional.

### Recommended Next Build Step

Add loading/skeleton states and progress indicators:

1. Add a loading skeleton for initial sync and channel list population.
2. Add progress states during source sync operations.
3. Add a smooth scrollbar for non-touch environments.
4. Test against a synthetic catalog with 10,000+ channels.

## 2026-06-08: Virtualized Channel List

### Completed

- Installed `@tanstack/react-virtual` for list virtualization.
- Virtualized the Live TV channel list so only visible rows are rendered.
- Used `measureElement` for accurate row height measurement (handles dynamic content).
- Replaced `margin-bottom` on channel cards with `padding-bottom` on virtual row wrappers.
- Updated keyboard focus: ArrowDown from search scrolls to and focuses the first result.
- Preserved TV-sized row dimensions, focus states, and responsive breakpoints.

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```

### Recommended Next Build Step

Add scrollbar styling for non-touch environments:

1. Style the scrollbar to match the TV aesthetic.
2. Add overlay/toggle info button to the player.
3. Implement hide channel action in the player or channel list.
4. Add favorite toggle from player overlay.
5. Consider keyboard-accessible source selection in Live TV.

## 2026-06-08: Loading Skeletons and Sync Progress

### Completed

- Added shimmer skeleton cards for channel list initial state (5 skeleton cards matching channel card layout).
- Added indeterminate progress bar to Source Setup form during sync and test connection operations.
- Wired Source Doctor "Refresh All" button to resync the current source, with spinning icon and "Refreshing" text.
- Added `@keyframes` for shimmer, spin, and sync-progress-indeterminate animations.
- Skeleton cards respect the laptop breakpoint (smaller dimensions, tighter gap).
- Progress bar uses accent color with sliding indeterminate fill.

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```

### Recommended Next Build Step

Consider loading/skeleton states and infinite scroll or paginated sync for very large playlists:

1. Add a loading skeleton for initial sync.
2. Add progress states during source sync operations.
3. Layer on a smooth scrollbar for non-touch environments.
4. Test against a synthetic catalog with 10,000+ channels.

## 2026-06-09: Channel Search

### Completed

- Wired the rail Search action to open search from anywhere in the app.
- Added an in-surface Live TV search panel.
- Search matches channel name, normalized name, group, `tvg-name`, and `tvg-id`.
- Added clear and empty search states.
- Added keyboard behavior:
  - Search input receives focus when opened.
  - Escape clears/closes search.
  - ArrowDown moves focus into results.
  - Enter from the input starts the first matching channel.
- Preserved the fixed Live TV layout while filtering.

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Browser verification with a seeded catalog confirmed:

- Rail Search focuses the search input.
- Searching `sports` returned one matching channel.
- Empty search state appears for no matches.
- Escape clears/closes search.
- Enter from the search input opens the player for the first matching channel.
- No browser console errors were observed.

### Recommended Next Build Step

Add loading/skeleton states and progress indicators:

1. Add a loading skeleton for initial sync and channel list population.
2. Add progress states during source sync operations.
3. Add a smooth scrollbar for non-touch environments.
4. Test against a synthetic catalog with 10,000+ channels.

## 2026-06-09: Player Retry and Playback Status

### Completed

- Added a Retry control to the player overlay.
- Added playback status display for loading, playing, buffering, retrying, and failed states.
- Wired video `waiting`, `stalled`, `canplay`, `playing`, and `error` events into the status display.
- Reloaded and replayed the current stream when Retry is pressed.
- Marked channels as `playable` or `failed` in local catalog state without logging stream URLs.

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Browser verification confirmed:

- Retry is visible in the player overlay.
- A simulated video error shows `Playback failed`.
- Failed playback marks the active channel as failed in local catalog state.
- No browser console errors were observed.

### Remaining Player Controls

- Add Info/Overlay Toggle.

## 2026-06-09: Functional Player Channel Navigation

### Completed

- Made player Channel Up and Channel Down controls functional.
- Added ArrowUp and ArrowDown keyboard handling for channel switching.
- Added a Last Channel button for returning to the previous stream.
- Added `L` keyboard handling for Last Channel.
- Kept the player open while switching streams.
- Updated recents when changing channels from inside the player.

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Browser verification confirmed:

- Channel Up changed `Demo News HD` to `Demo Sports FHD`.
- Channel Down changed back to `Demo News HD`.
- Last Channel returned to the previous stream.
- ArrowUp and ArrowDown switched channels.
- Recents updated after player channel changes.
- No browser console errors were observed.

### Remaining Player Controls

- Add Retry/Reload Stream.
- Add Info/Overlay Toggle.
- Add playback error and buffering states.

## 2026-06-09: Phase 2 Polish and LG TV Deployment Prep

### Completed

- Added dedicated Favorites and Recents screens to complete the Phase 1/2 shelf work.
- Added app-level keyboard shortcuts for browser-runnable TV navigation.
- Kept search from leaking across non-Live TV views.
- Added an LG webOS deployment guide with both browser-preview and sideload paths.

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```

## 2026-06-09: webOS App Metadata and Icon

### Completed

- Added a webOS `appinfo.json` manifest under `apps/webos-tv/public/`.
- Added matching vector icons for regular and large webOS packaging.
- Kept the icon style aligned with the existing charcoal/cyan TV direction.

### Verification

```sh
pnpm build
```

## 2026-06-09: Favorite Toggle Feedback

### Completed

- Added transient on-screen feedback when a channel is added to or removed from favorites.
- Added a shared favorite action message helper with tests.

### Verification

```sh
pnpm test
pnpm typecheck
pnpm build
```

## 2026-06-08: Favorites and Recents Shelves

### Completed

- Added dedicated Favorites and Recents screens to the TV shell.
- Added Favorites and Recents entries to the navigation rail.
- Wired favorites and recent playback history into shelf views with preserved ordering.
- Kept hidden channels out of shelf results.
- Added unit tests for shelf ordering and filtering helpers.

### Verification

These commands passed:

```sh
pnpm test
pnpm typecheck
pnpm build
```
