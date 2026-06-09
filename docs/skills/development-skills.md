# Development Skills

These are the project-specific working skills future agents should apply while building MY IPTV.

## IPTV Core Skill

Use when building source parsing, normalization, EPG matching, Source Doctor, favorites, recents, profiles, or parental controls.

Rules:

- Keep logic platform-neutral.
- Add unit tests for parser behavior.
- Handle malformed source data defensively.
- Return typed errors instead of ambiguous strings.
- Do not log credentials or private playlist URLs.

## TV UX Skill

Use when building LG webOS or browser-runnable TV screens.

Rules:

- Design for directional remote navigation first.
- Support keyboard arrows, Enter, and Escape during local development.
- Keep focus states large and obvious.
- Avoid dense desktop-style controls.
- Use stable dimensions for channel rows, rails, and player controls.

## Playback Skill

Use when building video playback or stream validation.

Rules:

- Treat HLS as the MVP playback target.
- Record playback failures with platform and reason when possible.
- Do not block browsing while validating streams.
- Use cancellable, throttled validation jobs for large playlists.

## Privacy and Compliance Skill

Use when handling sources, credentials, logs, onboarding, screenshots, or app descriptions.

Rules:

- State that users provide their own authorized content.
- Do not bundle unauthorized streams.
- Mask credentials in UI.
- Keep local-first behavior unless sync is explicitly enabled.
- Provide clear delete-source and delete-local-data flows.
