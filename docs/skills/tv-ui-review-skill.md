# TV UI Review Skill

Use this skill when reviewing or changing the LG webOS/browser TV interface.

## Purpose

MY IPTV is TV-first, but it must also be comfortable to preview on a laptop during development.

## Review Checklist

- Verify the screen at laptop browser zoom `100%`.
- Verify the screen still feels like a 10-foot TV interface on large viewports.
- Check that all actionable content is reachable without browser zoom changes.
- Check that focus states are obvious and not clipped.
- Check that text does not overlap adjacent panels or controls.
- Check that buttons have stable dimensions and do not resize the layout when focused.
- Check that no placeholder diagnostic labels appear in the UI.

## Screen Rules

### Live TV

- Keep the page as a fixed TV surface.
- Use internal scrolling for the channel list.
- Keep category, channel list, and program details visible at the same time.
- Avoid making the whole Live TV page vertically scroll during normal TV browsing.

### Player

- Keep the player fixed to the viewport.
- Use the actual video element as the primary surface.
- Avoid decorative background images where video should appear.
- Keep overlay text readable but minimal.
- Native browser controls are acceptable for prototype review, but future TV playback should use custom remote-first controls.

### Source Setup

- Allow vertical scrolling on laptop viewports.
- Keep source type cards, form fields, test connection, and sync actions reachable.
- Include user-provided-content language.
- Do not imply the app provides channels.

### Source Doctor

- Allow vertical scrolling on laptop viewports.
- Keep metrics visible near the top.
- Ensure cleanup recommendations are reachable.
- Show only real supported metrics in the MVP.
- Do not claim cloud logo fetching, dead-stream validation, or 24-hour failure history until implemented.

### Settings

- Allow vertical scrolling on laptop viewports.
- Keep source management and disclaimer reachable.
- Keep clear-data and privacy controls visually distinct.

## Implementation Notes

- Prefer CSS breakpoints over global transform scaling.
- Keep the `1500px` breakpoint as the current laptop-preview threshold unless a future review shows a better value.
- Non-player document screens can scroll.
- Live TV and Player should remain fixed, app-like surfaces.
