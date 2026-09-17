# NoPixel V Minigames & Tools

Web-based practice trainers and utility tools for GTA RP (NoPixel V mechanics).

## Available Minigames & Tools

### Lockpick (`/minigames/lockpick`)

Practice trainer for the NoPixel V lockpick spam minigame.

- **Controls**: Keyboard only (`E` to tap). Mouse clicks on the lock are disabled to match in-game mechanics.
- **Game Modes**:
  - **3-Progressive**: Standard 3-stage heist lock (Easy &rarr; Medium &rarr; Hard). Completing each stage grants a brief pause before the next lock activates.
  - **Maxing**: Endless mode where decay rate and tap resistance increase every level. Tracks and saves your personal best streak and completion time to IndexedDB.
  - **Single**: Practice against a fixed difficulty (`easy`, `medium`, `hard`) or custom physics.
- **Physics & Rules**:
  - 3.0-second countdown grace period before your first tap.
  - Fails if the timer runs out or if progress decays to 0% after tapping begins.
  - Procedural sound effects synthesized in real-time via Web Audio API (no external sound files required).
  - Built-in tuning drawer (active in dev mode) for live adjustment of decay rate and tap gain.

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
- Static assets are served from `build`; unmatched paths use the SPA `index.html`.
- Asset caching (`max-age=31536000, immutable`) and security headers configured in `static/_headers`.

## Legal Disclaimer

This project is an independent community project. It is not affiliated with, endorsed, sponsored, or supported by Rockstar Games, Take-Two Interactive, or the NoPixel team. All trademarks, game titles, logos, and copyrights are the property of their respective owners.

## License

MIT
