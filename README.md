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
- **State & Spatial Decoupling** ([`stores/machinery/`](src/lib/stores/machinery/)):
  - Node $(x, y)$ coordinate dragging updates layout state without invalidating the mathematical solver. Wire dragging uses precomputed $O(1)$ port compatibility checks.
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
│   │   │   ├── minigames/      # Minigame views (LockpickView, SafeDialView)
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
│   │   │   └── machinery/      # Production graph solver (Tarjan, Kahn, DSU, ports)
│   │   └── stores/             # Svelte 5 rune stores
│   │       ├── machinery/      # Pure engine & layout stores
│   │       └── *.svelte.ts     # Machinery, UI, audio, and lockpick store facades
│   └── routes/                 # SvelteKit pages and layout
└── tests/
    ├── data/                   # Catalog & recipe integrity tests
    ├── engine/                 # Machinery solver, graph, and connection unit tests
    ├── minigames/              # Lockpick & safedial engine tests
    └── stores/                 # Workflow persistence and reactive store tests
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
