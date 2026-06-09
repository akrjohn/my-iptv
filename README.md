# MY IPTV

MY IPTV is a user-configurable IPTV media interface for LG webOS first, with future Android and iOS companion support.

The app does not provide channels or media content. Users bring their own authorized playlist URLs, XMLTV guide URLs, or Xtream Codes credentials.

## Planned Stack

- React + TypeScript + Vite for the TV/web app
- Shared TypeScript IPTV core
- Vitest for parser/core tests
- LG webOS packaging later
- Mobile companion later

## Project Structure

```text
apps/webos-tv        TV-first React app shell
packages/iptv-core   Shared IPTV models, M3U parser, diagnostics
docs                 Vision, architecture, roadmap, review docs
```

## Getting Started

```sh
pnpm install
pnpm dev:webos
```

Run tests:

```sh
pnpm test
```

## Documentation

- [Vision](docs/vision.md)
- [Architecture](docs/architecture.md)
- [Architecture Review](docs/architecture-review.md)
- [Feature List](docs/feature-list.md)
- [Development Skills](docs/skills/development-skills.md)
