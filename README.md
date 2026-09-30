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
- **Tap Cadence**: A live line chart of clicks per second over a 1s sliding window, drawn under the lock, so you can see whether you sustain or fade across a run. Your fastest run for the current mode and difficulty is kept in IndexedDB and drawn behind the live trace on the same seconds axis, so the two can be read against the same clock.

### Traceroute (`/minigames/traceroute`)

Timed route-tracing trainer: reach `DST` from `SRC` before the timer or TTL expires, while avoiding red `IDS` hazards.

- **Controls**: Choose Short (18–21 moves), Medium (22–26), or Long (27–30); move with WASD or the arrow keys. Press `E` or Space to start or restart.

### Cargo Crate (`/minigames/cargo-crate`)

Three-lane rhythm trainer: crates scroll right to left, and you score only by pressing a lane key while its crate sits inside the judge band.

- **Controls**: Press any key or click to start. Tap `A` (Track A), `S` (Track B), or `D` (Track C) as a crate crosses the left-hand guide lines; the keycaps double as touch buttons. Press `Enter` to restart a finished run.
- **Rules**: A press inside the band scores +1 progress and +1 streak. A press on an empty lane, or a crate that scrolls off the left edge unpressed, costs +1 miss and resets the streak. A crate stays on screen past the band but is no longer hittable, so the miss posts as it leaves. 24 progress wins; 6 misses ends the run. Best streak and best progress persist to IndexedDB.
- **Difficulty**: Crate speed and band width stay fixed. The spawn gap is jittered 0.8x–1.25x around a base that tightens from 0.52s to 0.33s across the 24 targets, so pacing is randomized without swinging into waves. About 30% of spawns queue a **chord**: a partner crate on a free lane 45ms later, so two keys (for example `A` and `D`) are demanded inside the same window. A 24-progress run with 5 misses lands around 9.6s from first spawn to completion.

### Machinery Planner (`/calculation/machinery`)

Interactive visual factory planner and real-time production network calculator.

- **Capabilities**:
  - **Machine & Pipe Catalog**: 9 authoritative production and logistics machines (Furnace, Assembly, Saw, Die Casting, Tumbler, Generator, Storages) and 7 routing pipe types.
  - **Port-Based Routing**: Normalized typed ports (`solid` and `energy`) with infinite-capacity transport edges; edge throughput is governed by upstream machine rates and operating efficiency.
  - **Canvas UX**: Drag-from-port machine auto-spawning, single-instance recipe picker, seamless animated power lines, and workflow-level image/power toggles.
  - **Workflows & Blueprints**: Auto-saving IndexedDB multi-workflow persistence and versioned JSON blueprint export/import.

#### Simulation & Architecture Breakdown

- **Cycle Detection & Topological Solve** (`src/lib/engine/machinery/solver/`):
  - **Tarjan's SCC** ([`cycles.ts`](src/lib/engine/machinery/solver/cycles.ts)): Isolates acyclic feedforward subgraphs from cyclic recycling feedback loops.
  - **Kahn's Topological Pass** ([`topological.ts`](src/lib/engine/machinery/solver/topological.ts)): Evaluates acyclic DAGs in a single $O(V + E)$ forward propagation:
    $$\text{Input Fulfillment} = \min\left(1.0, \frac{\text{Supplied Rate}}{\text{Demanded Rate}}\right)$$
  - **Damped Cyclic Relaxation**: Closed feedback loops evaluate with a bounded Gauss-Seidel relaxation (max 10 iterations, 0.5 damping) strictly within the SCC, preserving $O(1)$ stability for linear segments.
- **DSU Electrical Networks** ([`power-grid.ts`](src/lib/engine/machinery/solver/power-grid.ts)):
  - Disjoint Set Union clusters independent electrical subnets. Computes wattage generation vs. consumer demand:
    $$\text{Grid Efficiency} = \min\left(1.0, \frac{\sum P_{\text{generation}}}{\sum P_{\text{demand}}}\right)$$
  - Brownouts ($\text{Grid Efficiency} < 1.0$) scale consumer machine cycle speeds proportionally across that subnet. Passive logistics nodes draw 0 kW.
- **Port-Based Connection Architecture** ([`schema/port.ts`](src/lib/engine/machinery/schema/port.ts)):
  - Sockets use normalized typed ports (`solid` and `energy`) decoupled from item IDs, supporting identical multi-inputs and generic logistics routing.
- **Graph State & Persistence** ([`stores/machinery.svelte.ts`](src/lib/stores/machinery.svelte.ts)):
  - Node $(x, y)$ dragging is committed on drag stop by `commitNodePositions()`, which clones the node array and schedules a debounced, queued IndexedDB write. Wire dragging uses precomputed $O(1)$ port compatibility checks.
  - Handle remeasurements are batched via RAF ([`NodeInternalsCoordinator.svelte.ts`](src/lib/components/machinery/canvas/NodeInternalsCoordinator.svelte.ts)) to prevent layout reflow storms.
- **Single-Instance Modal** ([`MachineryCanvas.svelte`](src/lib/components/machinery/canvas/MachineryCanvas.svelte)):
  - The recipe selector mounts as a single root-level dialog rather than mounting redundant dialog trees inside every node.

### Coming Soon

- **Store Safe**: Combination dial audio cracker trainer.

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
│   │   │   ├── layout/         # Launcher, navigation sidebar, footer
│   │   │   ├── machinery/      # Canvas, custom nodes, panels, recipe picker
│   │   │   ├── minigames/      # Lockpick, Traceroute, and Cargo Crate views
│   │   │   └── ui/             # Shared primitive components (DropdownMenu, Button)
│   │   ├── data/               # Catalog registries
│   │   │   ├── items/          # Ores, craftables, fuels with energy metadata
│   │   │   ├── machines/       # 9 authoritative machine definitions
│   │   │   ├── pipes/          # 7 pipe routing geometries
│   │   │   └── recipes/        # Production & fuel generator recipes
│   │   ├── db/                 # IndexedDB persistence (storage, machinery workflows)
│   │   ├── engine/
│   │   │   ├── audio.ts        # Procedural Web Audio synthesizer
│   │   │   ├── lockpick/       # Headless lockpick domain engine
│   │   │   ├── machinery/      # Production graph solver (Tarjan, Kahn, DSU, ports)
│   │   │   └── traceroute/     # Network generation, route analysis, and movement logic
│   │   └── stores/             # Svelte 5 rune stores
│   │       ├── machinery/      # Pure engine & layout stores
│   │       └── *.svelte.ts     # Machinery, UI, audio, lockpick, and Traceroute store facades
│   └── routes/                 # SvelteKit pages and layout
└── tests/
    ├── data/                   # Catalog & recipe integrity tests
    ├── engine/                 # Traceroute and machinery engine tests
    ├── minigames/              # Lockpick engine tests
    └── stores/                 # Workflow persistence, Traceroute, and reactive store tests
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
