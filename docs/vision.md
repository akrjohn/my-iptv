# MY IPTV Vision

## Product Vision

MY IPTV is a user-configurable, cross-platform IPTV media interface for people who want a clean, reliable way to organize and watch their own authorized streaming sources.

The product does not provide channels, playlists, or media content. Instead, it helps users connect external M3U/M3U8 playlists, XMLTV guides, and Xtream Codes accounts, then turns those inputs into a polished viewing experience across LG webOS TVs, Android, and iOS.

## Positioning

Most IPTV players compete on basic compatibility: add a playlist, browse a long list, and play a stream. MY IPTV should stand out by helping users manage the messy reality of IPTV sources.

The app should feel like a premium media command center:

- Fast and remote-friendly on TV
- Simple and touch-friendly on mobile
- Clear about source health and playback issues
- Helpful with playlist cleanup and EPG matching
- Privacy-first and content-neutral

## Product Principles

### Bring Your Own Content

MY IPTV acts as a media interface, not a content provider. Users supply their own authorized sources through playlist URLs, uploaded M3U/M3U8 files, XMLTV guide URLs, or Xtream Codes credentials.

### One IPTV Brain, Many Platform Shells

Playlist parsing, Xtream sync, EPG parsing, channel normalization, favorites, parental controls, and source diagnostics should live in shared core logic. LG webOS, Android, and iOS should each receive platform-specific UI and playback layers.

### TV Is for Watching, Mobile Is for Managing

The LG webOS app should prioritize lean-back viewing: fast browsing, readable layouts, obvious focus states, quick channel switching, and minimal playback overlays.

The Android and iOS apps should be better at setup and management: adding sources, editing favorites, fixing EPG matches, reordering groups, and optionally controlling the TV app.

### Make Source Problems Understandable

IPTV sources are often incomplete, duplicated, mislabeled, or unreliable. MY IPTV should help users understand what is wrong instead of failing silently.

The signature product feature should be Source Doctor: a diagnostic and cleanup assistant that scans sources and reports playable channels, dead streams, duplicate channels, missing logos, unmatched EPG data, and likely restricted categories.

### Privacy Is a Feature

The app should be local-first by default. Viewing data, playlist sources, credentials, favorites, and parental settings should remain on the device unless the user explicitly enables account-based sync.

## Target Users

### TV-First Viewer

Wants a smooth cable-like viewing experience on LG webOS. Cares about fast channel switching, favorites, EPG, and reliable playback.

### Playlist Power User

Uses large M3U or Xtream sources and needs help organizing, filtering, cleaning duplicates, and fixing EPG metadata.

### Household Manager

Needs profiles, parental controls, favorites per user, hidden categories, and predictable behavior for shared devices.

### Multi-Device User

Wants to manage playlists and favorites on mobile, then watch on TV. May want phone-as-remote behavior and cross-device continuity.

## Differentiators

### Source Doctor

Source Doctor analyzes each connected source and gives users a clear health summary:

- Total channels found
- Playable channels
- Dead or unreachable streams
- Missing logos
- Duplicate channels
- EPG match rate
- Hidden or locked categories
- Xtream account status when available

It should offer one-click fixes such as hiding dead streams, merging duplicates, matching guide data, creating clean groups, and hiding restricted categories.

### Smart Channel Cleanup

The app should normalize messy channel names, detect duplicates, group variants such as SD/HD/FHD/4K, and let users pick preferred streams.

### EPG Matching Assistant

The app should match EPG data using `tvg-id`, `tvg-name`, channel name, logo hints, and fuzzy matching. Users should be able to fix unmatched channels from a simple interface.

### Remote-First TV UX

The TV app should be designed around directional navigation and media keys, not adapted from a desktop UI.

### Mobile Companion

Mobile should become the control center for setup, source management, favorites, guide repair, and optional TV control.

## MVP Definition

The first complete MVP should prove that the app can turn a user-provided IPTV source into a usable TV viewing experience.

MVP scope:

- Add M3U/M3U8 playlist URL
- Parse channels, logos, groups, and stream URLs
- Browse channels by group
- Play HLS streams where supported by the platform
- Favorite channels
- Persist source, channels, favorites, and recent channels
- Support basic XMLTV current/next EPG metadata
- Provide basic source diagnostics
- Support LG webOS remote navigation

Xtream Codes support should follow once the playlist foundation is stable.

## Long-Term Direction

MY IPTV can evolve into a full cross-platform media interface:

- LG webOS TV app
- Android phone/tablet app
- iOS/iPadOS app
- Optional encrypted sync
- Phone-as-TV-remote
- Advanced EPG grid
- Profiles and parental controls
- VOD and series support for sources that provide them
- Playback quality diagnostics
- Backup stream selection
- Custom user groups and curated library management

## Content and Compliance Boundary

MY IPTV should not ship with pirated streams, paid channel lists, or unauthorized media content. Public demo playlists may be used only if they are lawful and clearly labeled as examples.

Recommended product language:

> MY IPTV does not provide channels, playlists, or media content. Users are responsible for supplying authorized playlist URLs, files, or provider credentials.
