# NoPixel V Minigames & Tools

Web-based practice trainers and utility tools for GTA RP (NoPixel V mechanics).

## Available Minigames & Tools

### Lockpick (`/minigames/lockpick`)

Practice trainer for the NoPixel V lockpick spam minigame.

- **Controls**: On computers, press `E` to tap; on touch devices, tap the lock. Mouse clicks remain disabled on computer layouts to match in-game mechanics.
- **Game Modes**:
  - **3-Progressive**: Standard 3-stage heist lock (Easy &rarr; Medium &rarr; Hard). Completing each stage grants a brief pause before the next lock activates.
  - **Maxing**: Endless mode where decay rate and tap resistance increase every level. Tracks and saves your personal best streak and completion time to IndexedDB.
  - **Single**: Practice against a fixed difficulty (`easy`, `medium`, `hard`) or custom physics.

### Coming Soon

- **Store Safe**: Combination dial audio cracker trainer.
- **Factory**: Production layout and throughput calculator.

## Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) (Svelte 5 runes) + TypeScript
- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [lucide-svelte](https://lucide.dev/)
- **Storage**: [idb-keyval](https://github.com/jakearchibald/idb-keyval) (IndexedDB persistence)
- **Audio**: Web Audio API (procedural synthesis)
- **Deployment**: Static build via `@sveltejs/adapter-static` (`prerender = true`, `ssr = false`)

## Project Structure

```
nopixelV/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── layout/         # Launcher, navigation sidebar overlay
│   │   │   └── minigames/      # Game views (LockpickView, SafeDialView)
│   │   ├── db/
│   │   │   └── storage.ts      # IndexedDB stats persistence
│   │   └── engine/
│   │       ├── audio.ts        # Procedural Web Audio synthesizer
│   │       └── lockpick/       # Pure headless domain engine (logic, types, constants)
│   └── routes/                 # SvelteKit pages and route guards
└── tests/
    └── minigames/              # Vitest headless engine unit tests
```

## Getting Started

Make sure you have [Bun](https://bun.sh/) installed:

```sh
# Install dependencies
bun install

# Start local dev server
bun run dev

# Run typecheck
bun run check

# Run unit tests
bun run test:unit

# Build static production site
bun run build

# Preview production build locally
bun run preview
```

## Deployment

Configured for automatic deployment on **Cloudflare Workers**:

- **Build command**: `bun run build`
- **Build output directory**: `build`
- **Deploy command**: `npx wrangler deploy`
- Static assets are served from `build`; unmatched paths use the branded `404.html`.
- Sitemap: `https://nopixelv.xcvrys.workers.dev/sitemap.xml`.

## Feedback

- [Report a bug](https://github.com/xcvrys/nopixelV/issues/new?template=bug_report.md)
- [Request a feature](https://github.com/xcvrys/nopixelV/issues/new?template=feature_request.md)

## Legal Disclaimer

This project is an independent community project. It is not affiliated with, endorsed, sponsored, or supported by Rockstar Games, Take-Two Interactive, or the NoPixel team. All trademarks, game titles, logos, and copyrights are the property of their respective owners.

## Attribution

Created and maintained by [XCVRYS](https://github.com/xcvrys).

Copyright © 2026 XCVRYS. Licensed under the [MIT License](./LICENSE).

## License

MIT
