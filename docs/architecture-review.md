# Architecture Review

## Review Summary

The current plan is viable and has a strong product angle. The most important architectural decision is already correct: build a shared IPTV core and keep LG webOS, Android, and iOS as platform-specific shells.

The standout strategy is also sound. Source Doctor, EPG matching, playlist cleanup, and mobile-assisted management are stronger differentiators than simply supporting another playlist format.

The plan is ready to move toward implementation, but a few areas should be tightened before coding begins:

- Define platform strategy more explicitly
- Treat playback as a first-class integration risk
- Clarify webOS credential storage limitations
- Add network/CORS/proxy strategy
- Push mobile companion work behind a credible TV MVP
- Define minimum compliance and content policy requirements early

## Overall Assessment

Recommendation: proceed, with architecture refinements.

Confidence level: medium-high for MVP, medium for full cross-platform product.

The MVP should focus on LG webOS-style TV UX using a web app foundation that can run in a browser during development. This keeps the first build testable without TV hardware while still pointing toward webOS packaging later.

The larger cross-platform vision is achievable, but it should not drive the first implementation into premature abstraction. The shared core should be real, but the UI and playback layers should be allowed to differ significantly by platform.

## What Is Working Well

### Shared IPTV Core

The plan correctly separates source ingestion from presentation. M3U, XMLTV, and Xtream should feed a normalized catalog so the UI does not care where a channel came from.

This is the right foundation for:

- Adding Xtream after M3U
- Supporting mobile later
- Building Source Doctor
- Improving EPG matching over time
- Testing parser logic independently from platform apps

### Source Doctor Differentiation

Source Doctor is a strong product bet. IPTV users often deal with messy playlists, duplicates, missing EPG, broken logos, and unreliable streams. Making those issues visible and fixable gives the app a clear reason to exist beyond playback.

Source Doctor should begin as metadata diagnostics, then gradually add stream validation.

### TV and Mobile Role Separation

The vision that TV is for watching and mobile is for managing is right. Editing sources, resolving EPG matches, and organizing favorites are awkward with a TV remote. Watching and quick browsing are natural on TV.

This split can become one of the app's best user experience advantages.

### Local-First Privacy

Local-first storage is a good default for trust, app-store review posture, and early implementation. Optional sync should wait until the local product is stable.

## Key Risks

### Risk 1: Playback Compatibility Is Under-Specified

The current architecture abstracts playback, but playback will be one of the hardest parts of the product.

Risks:

- Some streams may be HLS, MPEG-TS, DASH, or direct transport streams
- LG webOS support varies by TV model and OS version
- Browser playback may pass while TV playback fails
- iOS strongly favors HLS through AVPlayer
- Android can support more formats through ExoPlayer, but not through a plain web view

Recommendation:

- Make playback capability detection part of the architecture
- Store playback failure reasons per channel
- Build test fixtures for known-good HLS streams
- Treat non-HLS streams as best-effort until platform support is proven
- Add a playback compatibility matrix to the docs before release planning

### Risk 2: WebOS Secure Storage May Be Limited

The docs say credentials should use secure storage where possible. That is directionally correct, but webOS may not offer the same secure credential primitives as iOS Keychain or Android encrypted storage.

Risks:

- Xtream credentials may need to be stored locally for automatic refresh
- Plain IndexedDB storage is not ideal for credentials
- Users may expect the TV app to remember credentials

Recommendation:

- Create a `CredentialStore` interface from the beginning
- On webOS, document the available secure storage mechanism after SDK validation
- If only local app storage is available, mask credentials in UI and avoid logs, but clearly classify it as local-device storage rather than strong secure storage
- Consider mobile-first source setup later, where mobile can hold credentials and sync source tokens/settings only if a secure sync design exists

### Risk 3: Network and CORS Behavior Needs a Strategy

Browser-based IPTV apps often hit CORS restrictions when fetching playlist URLs, XMLTV files, logos, and stream URLs.

Risks:

- A playlist URL may be reachable by a native player but not fetchable by browser JavaScript
- Logos may fail because of CORS or mixed content
- XMLTV sources may be large, slow, compressed, or cross-origin blocked
- Xtream endpoints may not set browser-friendly headers

Recommendation:

- Add a network strategy section to the architecture
- Decide whether MVP is client-only or allows an optional proxy
- For webOS MVP, test real fetch behavior early in browser and emulator
- Design source sync errors that distinguish auth failure, network failure, CORS failure, parse failure, and unsupported format

### Risk 4: Phase Order May Delay the Standout Feature Too Long

Source Doctor appears in Phase 4, after TV UX polish and EPG basics. That is reasonable technically, but product differentiation might arrive too late.

Recommendation:

- Add a lightweight Source Doctor report in Phase 1 or Phase 2
- Start with cheap diagnostics:
  - total channels
  - groups
  - missing logos
  - duplicate names
  - malformed entries
  - missing stream URLs
- Save stream validation for later

This lets the product's identity show up early without blocking playback MVP.

### Risk 5: Mobile Companion Could Expand Scope Too Early

Android and iOS support is desirable, but building mobile too early could slow the TV MVP.

Recommendation:

- Keep shared core mobile-ready
- Do not build the mobile app until M3U playback, favorites, source storage, and basic diagnostics work on the TV/web shell
- Use responsive browser views for early mobile concept testing before committing to React Native or Capacitor

### Risk 6: App Store and Platform Review Needs Product-Level Guardrails

The docs already include a content boundary. This should become a build requirement, not just copy.

Recommendation:

- Do not bundle live channel sources unless they are clearly legal demo streams
- Add first-run language explaining user-provided content
- Avoid screenshots that imply included premium channels
- Add source deletion and data deletion flows early
- Keep audit-friendly logs that do not include credentials or stream URLs where possible

## Recommended Architecture Adjustments

### Add Capability Interfaces

Define platform capabilities explicitly so each shell can report what it supports.

```ts
type PlatformCapabilities = {
  playback: {
    hls: boolean;
    mpegTs: boolean;
    dash: boolean;
    subtitles: boolean;
    audioTrackSelection: boolean;
    pictureInPicture: boolean;
  };
  storage: {
    indexedDb: boolean;
    secureCredentials: boolean;
    backgroundSync: boolean;
  };
  input: {
    remote: boolean;
    keyboard: boolean;
    touch: boolean;
    mediaKeys: boolean;
  };
};
```

This prevents the shared app logic from assuming all platforms behave the same.

### Add Source Sync Error Types

Use typed sync failures instead of a plain error string.

```ts
type SourceSyncErrorCode =
  | "network_unreachable"
  | "cors_blocked"
  | "authentication_failed"
  | "unsupported_format"
  | "parse_failed"
  | "empty_source"
  | "rate_limited"
  | "unknown";

type SourceSyncError = {
  code: SourceSyncErrorCode;
  message: string;
  recoverable: boolean;
};
```

This will make Source Doctor and setup troubleshooting much better.

### Add Credential Store Interface

```ts
type CredentialStore = {
  setSecret(key: string, value: string): Promise<void>;
  getSecret(key: string): Promise<string | null>;
  deleteSecret(key: string): Promise<void>;
};
```

Each platform can provide the strongest available implementation.

### Add Stream Validation Queue

Stream validation should not be a simple loop over channels. It needs throttling, cancellation, and persistence.

```ts
type StreamValidationJob = {
  sourceId: string;
  channelIds: string[];
  concurrency: number;
  timeoutMs: number;
  createdAt: string;
};
```

Initial validation can be limited to selected channels, favorites, or a small sample per group.

### Add Manual Overrides Model

Do not mutate raw source data to reflect user cleanup. Store user overrides separately.

```ts
type ChannelOverride = {
  channelId: string;
  displayName?: string;
  group?: string;
  logoUrl?: string;
  hidden?: boolean;
  parentalLocked?: boolean;
  epgChannelId?: string;
  preferredVariantId?: string;
};
```

This allows re-syncing sources without losing user curation.

## Recommended MVP Scope

The most credible first build:

1. Browser-runnable TV app shell
2. M3U playlist URL input
3. M3U parser with tests
4. Normalized channel catalog
5. Grouped channel browser
6. Keyboard/remote-style navigation
7. HLS playback through HTML video
8. Favorites and recents
9. Basic local persistence
10. Lightweight Source Doctor metadata report

This build can be tested without an LG TV and still moves directly toward webOS.

## Decision Points Before Coding

### Frontend Platform

Recommended: React + TypeScript for the webOS/web shell.

Reasoning:

- Easy browser testing
- Good fit for TV UI
- Shared TypeScript models
- Can later share logic with React Native or Capacitor

### Mobile Strategy

Recommended: defer final mobile choice.

Short-term:

- Keep shared core TypeScript
- Build responsive admin views if useful

Later choose:

- Capacitor if the mobile app is mostly web-based management
- React Native if native playback and polished mobile UX are important

### Playback Scope

Recommended MVP playback scope:

- HLS first
- HTML video first
- Do not promise MPEG-TS or every IPTV stream in MVP

### Sync Scope

Recommended MVP sync scope:

- Local-only
- Manual refresh
- Scheduled refresh later
- Cloud sync deferred

## Final Verdict

The plan is working as an initial product and engineering direction. It has a clear architecture, a credible MVP path, and a real differentiator.

The biggest correction is to make platform capabilities, credential storage, CORS/network behavior, and playback compatibility explicit before implementation. Those are the areas most likely to create surprises later.

Recommended next step: update the architecture and feature list with the review adjustments, then start a project skeleton around the shared IPTV core and browser-runnable TV shell.
