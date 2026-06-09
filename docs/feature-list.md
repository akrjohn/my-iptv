# MY IPTV Feature List

## Release Strategy

The product should be built in phases. Each phase should produce a usable app while adding a meaningful layer of differentiation.

## Phase 0: Foundation

Goal: establish the shared IPTV core and project structure.

- Shared TypeScript data models for sources, channels, programs, profiles, and playback sessions
- Source repository interface
- Local storage adapter
- Credential store interface
- Platform capability model
- Basic app settings model
- Typed sync error and diagnostics model
- Logging rules that avoid exposing credentials
- Unit test setup for parser and normalization logic

Acceptance criteria:

- M3U, Xtream, and EPG concepts can be represented in one normalized model
- App code can read/write sources and channels through repository interfaces
- Credentials are never stored in plain app state logs
- Platform capabilities can describe playback, storage, and input differences

## Phase 1: M3U Live TV MVP

Goal: let a user add an M3U/M3U8 playlist and watch live channels on LG webOS.

- Add playlist URL screen
- Fetch remote M3U/M3U8 playlist
- Parse `#EXTINF` records
- Extract channel name, logo, group, `tvg-id`, `tvg-name`, and stream URL
- Normalize channel catalog
- Browse groups
- Browse channels within a group
- Search channels
- Play selected channel
- Full-screen player overlay
- Channel up/down
- Last channel shortcut
- Favorites
- Recent channels
- Persist source and catalog locally
- Basic sync status and sync error display
- Metadata-only Source Doctor summary
- Basic duplicate-name and missing-logo counts

Acceptance criteria:

- User can add a playlist URL, browse parsed channels, and play a channel
- Favorites and recents persist across app restarts
- Large channel lists remain navigable without visible UI freezing
- User can see a basic source health summary after playlist sync

## Phase 2: TV UX Polish

Goal: make the LG webOS experience feel purpose-built for TV.

- Remote-first focus management
- Large visible focus states
- Virtualized channel list
- Fast group switching
- Loading skeletons or progress states
- Playback error overlay
- Retry playback action
- Hide channel action
- Favorite toggle from player overlay
- Settings screen
- Clear source deletion flow
- TV-safe responsive layout
- Browser-runnable keyboard navigation for testing without a TV

Acceptance criteria:

- All core flows work using directional remote controls
- Focus never gets trapped or lost in normal navigation
- Playback failures are understandable and recoverable
- Core flows can be tested locally with keyboard arrows, Enter, and Escape/Back

## Phase 3: EPG Basics

Goal: show current and upcoming program information.

- Add XMLTV URL support for M3U sources
- Fetch and parse XMLTV guide
- Match EPG channels by `tvg-id`
- Match fallback by `tvg-name` and normalized channel name
- Show current/next program in channel list
- Show current/next program in player overlay
- Cache EPG data locally
- EPG refresh setting
- EPG sync status

Acceptance criteria:

- Channels with matching guide data show current and next programs
- EPG data persists locally and refreshes on schedule or manual sync
- Unmatched channels do not break browsing or playback

## Phase 4: Source Doctor Cleanup MVP

Goal: turn the early Source Doctor report into a useful cleanup workflow.

- Expanded source health summary
- Duplicate channel detection by normalized name
- EPG matched/unmatched count when guide data exists
- Hidden channels count
- Likely adult/restricted category detection
- Channel override model
- Basic recommendations list
- Apply recommendation: hide channels missing stream URLs
- Apply recommendation: hide likely restricted categories
- Apply recommendation: normalize channel names

Acceptance criteria:

- User can view expanded source health after sync
- User can apply at least three cleanup actions
- Cleanup actions are reversible
- Cleanup is stored as user overrides, not destructive edits to source data

## Phase 5: Xtream Codes Live TV

Goal: support Xtream Codes credentials as a second source type.

- Add Xtream account screen
- Server URL, username, and password fields
- Connection test
- Fetch account status where available
- Fetch live categories
- Fetch live streams
- Normalize Xtream live channels into shared catalog
- Fetch short EPG data where available
- Sync status and error handling
- Secure credential storage adapter
- Delete Xtream source and credentials
- Typed errors for auth, network, parse, and blocked request failures

Acceptance criteria:

- User can add Xtream credentials and browse live channels
- Xtream channels appear in the same UI model as M3U channels
- Credentials are masked in the UI and excluded from logs
- The app can delete stored Xtream credentials for a source

## Phase 6: Advanced Source Doctor

Goal: make source cleanup a signature feature.

- Stream validation queue
- Rate-limited playable/dead stream checks
- Cancellable validation jobs
- Dead stream count
- Duplicate stream grouping
- Merge duplicate channel variants
- Preferred quality selection
- Backup stream fallback
- Missing logo repair suggestions
- Manual EPG matching screen
- EPG match confidence score

Acceptance criteria:

- User can identify and hide dead streams
- User can merge duplicate channel variants
- User can manually fix guide matches
- Stream validation does not block browsing or playback

## Phase 7: Profiles and Parental Controls

Goal: support household use cases safely.

- Create profile
- Rename profile
- Delete profile
- Per-profile favorites
- Per-profile recent channels
- PIN setup
- PIN unlock screen
- Lock groups
- Lock channels
- Hide restricted categories by default
- Auto-lock likely restricted channels from Source Doctor

Acceptance criteria:

- Locked content requires PIN before playback
- Favorites and recents can differ by profile
- Restricted groups can be hidden from child profiles

## Phase 8: Mobile Companion

Goal: use Android and iOS for setup and management tasks.

This phase should start only after the TV/web MVP has stable M3U playback, local persistence, favorites, and basic Source Doctor reporting.

- Mobile app shell
- Add/edit sources
- View source sync status
- View Source Doctor report
- Apply cleanup recommendations
- Search channels
- Manage favorites
- Reorder custom groups
- Hide/unhide channels
- Edit EPG matches
- Optional phone playback

Acceptance criteria:

- User can manage sources and favorites from mobile
- Mobile UI is touch-first, not a scaled-down TV UI
- Shared IPTV core is reused by mobile and TV apps

## Phase 9: Cross-Device Features

Goal: make TV and mobile work together.

- Optional user account
- Encrypted settings sync
- Sync favorites
- Sync hidden channels
- Sync custom groups
- Sync EPG overrides
- Phone-as-remote discovery
- Send channel to TV
- Continue watching from another device

Acceptance criteria:

- Sync is opt-in
- Users can delete synced data
- Phone can trigger playback on paired TV

## Phase 10: VOD and Series

Goal: support richer Xtream libraries where available.

- Fetch VOD categories
- Fetch VOD streams
- VOD detail page
- Resume VOD playback
- Fetch series categories
- Fetch series list
- Series detail page
- Season and episode browsing
- Continue watching shelf
- Parental controls for VOD and series

Acceptance criteria:

- VOD and series are separated clearly from live TV
- Live TV MVP remains fast and uncluttered
- Resume behavior works across app restarts

## Cross-Cutting Requirements

### Performance

- Channel browsing should remain smooth with large playlists
- Lists should be virtualized when needed
- Sync should not block playback
- EPG parsing should avoid freezing the UI
- Stream validation should be queued, throttled, and cancellable

### Accessibility and Usability

- Strong focus indicators on TV
- Readable text from couch distance
- Touch targets sized appropriately on mobile
- Clear empty, loading, success, and error states
- Browser-based keyboard controls should approximate TV remote controls during development

### Privacy and Security

- No bundled unauthorized content
- No credential logging
- Mask sensitive fields
- Local-first storage
- Clear delete-data controls
- Optional sync only after explicit user choice
- Platform credential storage capability should be documented before Xtream release

### Network and Playback

- HLS should be the first supported playback target
- Non-HLS streams should be treated as best-effort until platform support is verified
- Sync errors should distinguish network failure, CORS blocking, authentication failure, parse failure, and unsupported format
- The architecture should allow an optional proxy service later for legitimate user-provided sources that cannot be fetched client-side

### Compliance

- Product copy must state that users provide their own authorized sources
- Demo sources must be lawful and clearly identified
- App store screenshots and descriptions should avoid suggesting access to paid or unauthorized channels
- First-run experience should include user-provided-content language

## First Build Backlog

Recommended first sprint:

- Project skeleton
- Shared `iptv-core` package
- Channel and source models
- M3U parser
- Parser tests with sample playlists
- Local catalog storage
- Basic TV channel browser
- Basic video player
- Favorites
- Recent channels
- Basic Source Doctor metadata report

Recommended second sprint:

- XMLTV parser
- Current/next EPG display
- Source sync status
- Channel search
- Better remote focus handling
- Typed sync errors
- Channel override model

Recommended third sprint:

- Xtream connector
- Xtream source setup
- Xtream live categories and streams
- Secure credential adapter
- Source Doctor cleanup actions
