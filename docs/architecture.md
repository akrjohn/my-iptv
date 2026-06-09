# MY IPTV Architecture

## Goals

The architecture should support a shared IPTV engine with platform-specific apps for LG webOS, Android, and iOS.

Primary goals:

- Support M3U/M3U8 playlists, XMLTV EPG, and Xtream Codes sources
- Normalize all sources into a common internal catalog
- Keep source parsing and sync logic reusable across platforms
- Provide TV-first playback and navigation on LG webOS
- Support mobile-first management on Android and iOS
- Remain local-first, with optional sync later

## High-Level System

```text
External Sources
  M3U/M3U8 playlist URL or file
  XMLTV EPG URL or file
  Xtream Codes API

Shared IPTV Core
  Source connectors
  Parsers
  Normalization
  Source diagnostics
  EPG matching
  Favorites and profiles model
  Parental controls model

Platform Apps
  LG webOS TV app
  Android app
  iOS app

Platform Services
  Playback engine
  Local storage
  Remote/touch navigation
  Secure credential storage
  Optional cloud sync
```

## Recommended Repository Shape

```text
apps/
  webos-tv/
    LG webOS application shell
    TV navigation and player UI
  mobile/
    Android/iOS application shell
    Touch-first setup and management UI

packages/
  iptv-core/
    M3U parser
    Xtream client
    XMLTV parser
    Normalized data models
    Source diagnostics
    EPG matching
    Platform capability model
  storage/
    Repository interfaces
    IndexedDB/local database adapters
    Credential store interfaces
  playback/
    Shared playback state model
    Platform playback abstractions
  ui-models/
    View models shared by TV and mobile

docs/
  Product and engineering documentation
```

This structure keeps the app from becoming webOS-only while still allowing the LG TV experience to be optimized properly.

## Source Model

Every user-provided source should be stored as a source record.

```ts
type SourceType = "m3u" | "xtream";

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

type Source = {
  id: string;
  type: SourceType;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  syncStatus: "idle" | "syncing" | "success" | "failed";
  syncError?: SourceSyncError;
};

type M3uSource = Source & {
  type: "m3u";
  playlistUrl?: string;
  epgUrl?: string;
};

type XtreamSource = Source & {
  type: "xtream";
  serverUrl: string;
  usernameRef: string;
  passwordRef: string;
};
```

Credentials should not be stored directly in ordinary app state. Platform-specific secure storage should be used where available.

## Platform Capabilities

Each app shell should expose its capabilities explicitly. The shared core should not assume that every platform can play the same streams, store credentials the same way, or use the same input model.

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

The first webOS/browser MVP should target HLS playback first. MPEG-TS, DASH, subtitles, and advanced audio track support should be treated as platform-specific enhancements once real device behavior is verified.

## Normalized Catalog Model

M3U and Xtream data should be converted into the same internal channel model.

```ts
type Channel = {
  id: string;
  sourceId: string;
  externalId?: string;
  name: string;
  normalizedName: string;
  group?: string;
  logoUrl?: string;
  streamUrl: string;
  streamFormat?: "hls" | "mpegts" | "unknown";
  tvgId?: string;
  tvgName?: string;
  isHidden: boolean;
  isFavorite: boolean;
  parentalLocked: boolean;
  lastValidatedAt?: string;
  validationStatus?: "untested" | "playable" | "failed";
};

type Program = {
  id: string;
  channelId: string;
  sourceId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  category?: string;
};

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

The UI should depend on this normalized model, not directly on raw M3U or Xtream responses.

User edits should be stored as overrides instead of mutating raw source data. This lets the app refresh playlists and Xtream catalogs without losing user curation.

## Source Connectors

### M3U Connector

Responsibilities:

- Fetch playlist URL or read uploaded file
- Parse `#EXTM3U` and `#EXTINF` records
- Extract `tvg-id`, `tvg-name`, `tvg-logo`, `group-title`, and stream URL
- Tolerate malformed attributes
- Deduplicate obvious repeats
- Emit diagnostics for broken or suspicious records

### XMLTV Connector

Responsibilities:

- Fetch XMLTV guide
- Parse channels and programs
- Match programs to normalized channels
- Cache EPG data by source
- Support current/next lookup efficiently

### Xtream Connector

Responsibilities:

- Authenticate using server URL, username, and password
- Fetch account metadata where available
- Fetch live categories
- Fetch live streams
- Fetch EPG data where available
- Later: fetch VOD and series categories

## Source Doctor

Source Doctor should operate after sync and produce a diagnostics report.

```ts
type SourceHealthReport = {
  sourceId: string;
  generatedAt: string;
  totalChannels: number;
  playableChannels?: number;
  failedChannels?: number;
  duplicateGroups: number;
  missingLogos: number;
  epgMatchedChannels: number;
  epgUnmatchedChannels: number;
  likelyRestrictedChannels: number;
  recommendations: SourceRecommendation[];
};

type SourceRecommendation = {
  id: string;
  type:
    | "hide_failed_streams"
    | "merge_duplicates"
    | "match_epg"
    | "hide_restricted"
    | "normalize_names";
  title: string;
  description: string;
  impact: number;
};
```

Initial diagnostics can be metadata-only. Stream validation should be rate-limited because large playlists can contain thousands of channels.

```ts
type StreamValidationJob = {
  sourceId: string;
  channelIds: string[];
  concurrency: number;
  timeoutMs: number;
  createdAt: string;
};
```

The first Source Doctor implementation should use cheap metadata checks: total channels, groups, missing logos, duplicate names, malformed entries, likely restricted categories, and missing stream URLs. Stream validation should come later through a cancellable queue.

## Playback Architecture

Playback should be abstracted because webOS, Android, and iOS have different media capabilities.

```ts
type PlaybackSession = {
  channelId: string;
  streamUrl: string;
  startedAt: string;
  state: "idle" | "loading" | "playing" | "paused" | "buffering" | "failed";
  error?: PlaybackError;
};

type PlaybackController = {
  load(channel: Channel): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seek?(seconds: number): Promise<void>;
};
```

Platform recommendations:

- LG webOS: native HTML video first, HLS support depending on model, webOS media APIs where needed
- Android: native player layer or React Native video/ExoPlayer if using React Native
- iOS: AVPlayer-backed playback, especially for HLS

Playback compatibility should be tracked per platform and per channel. Browser playback success does not guarantee LG webOS playback success, and iOS/Android may support different containers through native players.

## Storage Architecture

The app should use a repository layer so storage can vary by platform.

Stored locally:

- Sources
- Channel catalog
- EPG cache
- Favorites
- Recent channels
- Hidden channels/groups
- Profiles
- Parental settings
- Source health reports

Recommended local storage:

- webOS: IndexedDB for catalog and EPG cache, secure handling for credentials where possible
- Android: SQLite/Room or React Native storage adapter, encrypted storage for credentials
- iOS: SQLite/Core Data or React Native storage adapter, Keychain for credentials

Credential storage should use a platform adapter:

```ts
type CredentialStore = {
  setSecret(key: string, value: string): Promise<void>;
  getSecret(key: string): Promise<string | null>;
  deleteSecret(key: string): Promise<void>;
};
```

On webOS, the available secure storage mechanism must be validated against the LG SDK. If strong secure storage is unavailable, the implementation should classify credentials as local-device stored, mask them in UI, exclude them from logs, and provide clear delete-source/delete-data controls.

## Network Strategy

IPTV sources often behave differently in browser-based clients than native media players.

Risks to handle:

- Playlist, XMLTV, logo, or Xtream endpoints may block cross-origin browser requests
- Some sources may use HTTP instead of HTTPS
- XMLTV files may be large, compressed, or slow
- Stream URLs may be playable by the media element but not fetchable by JavaScript

The app should distinguish these failure modes with typed sync errors. The MVP should start client-only, but the architecture should leave room for an optional proxy service if legitimate user-provided sources are blocked by CORS or need server-side fetching.

## Sync Flow

```text
User adds source
  Validate source settings
  Fetch source data
  Parse raw data
  Normalize catalog
  Match EPG
  Run Source Doctor diagnostics
  Persist catalog and health report
  Refresh UI
```

Sync should be cancellable and resumable where possible. Large playlists should stream parsing work in chunks to avoid freezing the UI.

## LG webOS App

The webOS app should prioritize:

- Directional remote navigation
- Obvious focus states
- Fast channel switching
- Full-screen playback
- Minimal overlays
- Low memory usage
- Virtualized lists for channels and EPG
- Clear recovery from playback errors

Primary screens:

- Source setup
- Live TV browser
- Full-screen player
- TV guide
- Favorites
- Settings
- Source Doctor

## Mobile Apps

Android and iOS should prioritize:

- Source setup and editing
- Search
- Favorites management
- Custom group ordering
- Source Doctor review and fixes
- EPG matching repair
- Optional phone-as-remote behavior
- Optional playback on phone

Mobile should not simply mirror the TV app. It should handle tasks that are awkward with a TV remote.

Mobile implementation should be deferred until the TV/web MVP proves the shared core. Early mobile thinking should influence data models, but it should not force premature UI or playback abstractions.

## Optional Cloud Sync

Cloud sync should be added only after local-first behavior is reliable.

Sync candidates:

- Sources, without exposing raw credentials unless encrypted
- Favorites
- Hidden channels
- Custom groups
- Profiles
- Recent channels
- EPG matching overrides

Cloud sync should be opt-in and transparent.

## Security and Privacy

Security requirements:

- Never log passwords or full credential URLs
- Mask credentials in UI
- Store secrets in platform secure storage where possible
- Use HTTPS where source URLs support it
- Allow users to delete all local data
- Keep viewing history local unless sync is explicitly enabled

## Technical Risks

### Playback Compatibility

Not every stream will play on every platform. Some IPTV sources use codecs, containers, or transport formats unsupported by a given device.

Mitigation:

- Detect stream format where possible
- Show clear playback errors
- Track failed streams
- Prefer HLS for broad compatibility
- Allow fallback streams for duplicates

### Large Playlist Performance

Some playlists contain tens of thousands of entries.

Mitigation:

- Chunk parsing
- Virtualized lists
- Indexed local storage
- Background sync where supported
- Rate-limited stream validation

### EPG Matching Quality

Guide data often does not match channel names perfectly.

Mitigation:

- Use `tvg-id` first
- Fall back to `tvg-name`
- Apply normalized/fuzzy name matching
- Allow manual overrides

### App Store Review

IPTV apps may receive scrutiny from app stores.

Mitigation:

- Do not bundle unauthorized content
- Use clear content-neutral language
- Make user-provided sources explicit
- Include acceptable use language

## Initial Engineering Milestones

1. Create shared TypeScript data models
2. Build M3U parser and tests
3. Build normalized catalog repository
4. Build webOS-friendly TV browser prototype
5. Add basic playback
6. Add favorites and recents
7. Add Source Doctor metadata diagnostics
8. Add XMLTV current/next EPG support
9. Add Xtream live TV connector
10. Add mobile management shell after the TV/web MVP is stable
