import { describe, expect, it } from "vitest";
import {
  BOARD_COLUMNS,
  BOARD_SIZE,
  DEFAULTS,
  generateBoard,
  TracerouteGenerationError,
  TIERS,
  type DifficultyTier,
} from "../../src/lib/engine/traceroute";
import type { GeneratedBoard } from "../../src/lib/engine/traceroute/generation";
import type { Config } from "../../src/lib/engine/traceroute/types";

// Set TRACEROUTE_GENERATION_STRESS=1 for 100,000 seeds; normal tests sample 100 across all tiers.
const SEED_COUNT = process.env.TRACEROUTE_GENERATION_STRESS === "1" ? 100_000 : 100;
const TIERS_BY_SEED: { name: DifficultyTier; config: Partial<Config> }[] = [
  { name: "short", config: TIERS.short },
  { name: "mid", config: TIERS.mid },
  { name: "long", config: TIERS.long },
];

const DECOY_DECISION_LIMITS: Record<DifficultyTier, readonly [number, number]> = {
  short: [3, 5],
  mid: [6, 8],
  long: [9, BOARD_SIZE],
};

interface StructuralMetrics {
  L: number;
  M: number;
  detour: number;
  shortestPaths: number;
  turns: number;
  maxRun: number;
  leftMoves: number;
  verticalMoves: number;
  edges: number;
  loops: number;
  deadEnds: number;
  junctions: number;
  reachableSafe: number;
  criticalHazards: number;
  decoyDecisions: number;
  rejoiningDecoys: number;
}

const METRIC_KEYS = [
  "L",
  "M",
  "detour",
  "shortestPaths",
  "turns",
  "maxRun",
  "leftMoves",
  "verticalMoves",
  "edges",
  "loops",
  "deadEnds",
  "junctions",
  "reachableSafe",
  "criticalHazards",
  "decoyDecisions",
  "rejoiningDecoys",
] as const satisfies readonly (keyof StructuralMetrics)[];

function safeBfs(
  adjacency: number[][],
  source: number,
  hazards: ReadonlySet<number>,
  permittedHazard = -1,
): { distance: Int16Array; pathCounts: Float64Array; order: number[] } {
  const distance = new Int16Array(BOARD_SIZE);
  distance.fill(-1);
  const pathCounts = new Float64Array(BOARD_SIZE);
  const order = [source];
  distance[source] = 0;
  pathCounts[source] = 1;

  for (let index = 0; index < order.length; index += 1) {
    const current = order[index];
    for (const next of adjacency[current]) {
      if (hazards.has(next) && next !== permittedHazard) continue;
      if (distance[next] === -1) {
        distance[next] = distance[current] + 1;
        pathCounts[next] = pathCounts[current];
        order.push(next);
      } else if (distance[next] === distance[current] + 1) {
        pathCounts[next] += pathCounts[current];
      }
    }
  }

  return { distance, pathCounts, order };
}
function independentRejoiningDecoyCount(
  adjacency: number[][],
  hazards: ReadonlySet<number>,
  route: number[],
): number {
  const routeIndex = new Int16Array(BOARD_SIZE).fill(-1);
  route.forEach((cell, index) => {
    routeIndex[cell] = index;
  });
  const visited = new Uint8Array(BOARD_SIZE);
  const countedPairs = new Uint8Array(route.length * route.length);
  const boundaryNodes = Array.from({ length: route.length }, () => [] as number[]);
  let count = 0;

  for (let start = 0; start < BOARD_SIZE; start += 1) {
    if (routeIndex[start] !== -1 || hazards.has(start) || visited[start]) continue;
    const queue = [start];
    visited[start] = 1;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const cell = queue[cursor];
      for (const neighbor of adjacency[cell]) {
        if (routeIndex[neighbor] !== -1) {
          boundaryNodes[routeIndex[neighbor]].push(cell);
        } else if (!hazards.has(neighbor) && !visited[neighbor]) {
          visited[neighbor] = 1;
          queue.push(neighbor);
        }
      }
    }

    for (let from = 0; from < route.length; from += 1) {
      for (const source of boundaryNodes[from]) {
        const distance = new Int16Array(BOARD_SIZE).fill(-1);
        const search = [source];
        distance[source] = 0;
        for (let cursor = 0; cursor < search.length; cursor += 1) {
          const cell = search[cursor];
          for (const neighbor of adjacency[cell]) {
            if (routeIndex[neighbor] !== -1 || hazards.has(neighbor) || distance[neighbor] !== -1) {
              continue;
            }
            distance[neighbor] = distance[cell] + 1;
            search.push(neighbor);
          }
        }
        for (let to = from + 1; to < route.length; to += 1) {
          const pair = from * route.length + to;
          if (countedPairs[pair]) continue;
          for (const destination of boundaryNodes[to]) {
            if (distance[destination] >= 0 && distance[destination] + 2 - (to - from) >= 4) {
              countedPairs[pair] = 1;
              count += 1;
              break;
            }
          }
        }
      }
    }
    for (const nodes of boundaryNodes) nodes.length = 0;
  }
  return count;
}

function independentlyAnalyze(generated: GeneratedBoard): StructuralMetrics {
  const { board } = generated;
  const hazards = new Set(board.nodes.filter((node) => node.kind === "ids").map((node) => node.id));
  const safe = safeBfs(board.adjacency, board.sourceId, hazards);
  const route = generated.solution;
  let turns = 0;
  let maxRun = 0;
  let run = 0;
  let leftMoves = 0;
  let verticalMoves = 0;
  let previousDirection = -1;

  for (let index = 1; index < route.length; index += 1) {
    const previous = route[index - 1];
    const current = route[index];
    const dx = (current % BOARD_COLUMNS) - (previous % BOARD_COLUMNS);
    const dy = Math.floor(current / BOARD_COLUMNS) - Math.floor(previous / BOARD_COLUMNS);
    const direction = dx === 1 ? 0 : dy === 1 ? 1 : dy === -1 ? 2 : 3;
    if (direction === 3) leftMoves += 1;
    if (direction === 1 || direction === 2) verticalMoves += 1;
    if (direction === previousDirection) {
      run += 1;
    } else {
      if (previousDirection !== -1) turns += 1;
      run = 1;
    }
    previousDirection = direction;
    maxRun = Math.max(maxRun, run);
  }

  let decoyDecisions = 0;
  for (let index = 0; index < route.length - 1; index += 1) {
    const current = route[index];
    const previous = index === 0 ? -1 : route[index - 1];
    const next = route[index + 1];
    if (
      board.adjacency[current].some(
        (neighbor) => !hazards.has(neighbor) && neighbor !== previous && neighbor !== next,
      )
    ) {
      decoyDecisions += 1;
    }
  }
  const rejoiningDecoys = independentRejoiningDecoyCount(board.adjacency, hazards, route);

  const componentIds = new Int16Array(BOARD_SIZE);
  componentIds.fill(-1);
  let components = 0;
  for (let start = 0; start < BOARD_SIZE; start += 1) {
    if (componentIds[start] !== -1) continue;
    componentIds[start] = components;
    const stack = [start];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) continue;
      for (const next of board.adjacency[current]) {
        if (componentIds[next] !== -1) continue;
        componentIds[next] = components;
        stack.push(next);
      }
    }
    components += 1;
  }

  let deadEnds = 0;
  let junctions = 0;
  for (const current of safe.order) {
    const exits = board.adjacency[current].filter((next) => !hazards.has(next)).length;
    if (current !== board.sourceId && current !== board.destinationId && exits === 1) deadEnds += 1;
    if (exits >= 3) junctions += 1;
  }

  let criticalHazards = 0;
  for (const hazard of hazards) {
    const distance = safeBfs(board.adjacency, board.sourceId, hazards, hazard).distance[
      board.destinationId
    ];
    if (distance >= 0 && distance < safe.distance[board.destinationId]) criticalHazards += 1;
  }

  const edges = board.adjacency.reduce((total, neighbors) => total + neighbors.length, 0) / 2;
  const sourceX = board.sourceId % BOARD_COLUMNS;
  const sourceY = Math.floor(board.sourceId / BOARD_COLUMNS);
  const destinationX = board.destinationId % BOARD_COLUMNS;
  const destinationY = Math.floor(board.destinationId / BOARD_COLUMNS);
  const L = safe.distance[board.destinationId];
  const M = Math.abs(sourceX - destinationX) + Math.abs(sourceY - destinationY);

  return {
    L,
    M,
    detour: L - M,
    shortestPaths: safe.pathCounts[board.destinationId],
    turns,
    maxRun,
    leftMoves,
    verticalMoves,
    edges,
    loops: edges - BOARD_SIZE + components,
    deadEnds,
    junctions,
    reachableSafe: safe.order.length / (BOARD_SIZE - hazards.size),
    criticalHazards,
    decoyDecisions,
    rejoiningDecoys,
  };
}

function fail(generated: GeneratedBoard, tier: DifficultyTier, reason: string): never {
  throw new Error(
    `seed=${generated.seed} tier=${tier} attempts=${generated.attempts} ${reason}; metrics=${JSON.stringify(generated.metrics)}`,
  );
}

function validateGeneratedBoard(
  generated: GeneratedBoard,
  tier: DifficultyTier,
  config: Partial<Config>,
): StructuralMetrics {
  const { board, metrics } = generated;
  const hazards = board.nodes.filter((node) => node.kind === "ids");
  const hazardIds = new Set(hazards.map((node) => node.id));
  const independent = independentlyAnalyze(generated);
  const minimumLength = config.minL ?? DEFAULTS.minL;
  const maximumLength = config.maxL ?? DEFAULTS.maxL;

  const require = (condition: boolean, reason: string): void => {
    if (!condition) fail(generated, tier, reason);
  };

  require(generated.attempts >= 1 && generated.attempts <= DEFAULTS.maxAttempts, "attempt bound");
  require(board.nodes.length === BOARD_SIZE, "node count");
  require(hazards.length === DEFAULTS.hazards, "hazard count");
  require(board.nodes.every((node, id) => node.id === id), "node IDs are not contiguous");
  require(board.nodes[board.sourceId]?.kind === "src", "source kind");
  require(board.nodes[board.destinationId]?.kind === "dst", "destination kind");
  require(board.sourceId % BOARD_COLUMNS === 0, "source is not on the left edge");
  require(board.destinationId % BOARD_COLUMNS ===
    BOARD_COLUMNS - 1, "destination is not on the right edge");
  require(generated.solution[0] === board.sourceId, "solution start");
  require(generated.solution.at(-1) === board.destinationId, "solution destination");
  require(new Set(generated.solution).size ===
    generated.solution.length, "solution repeats a cell");
  require(independent.L >= minimumLength && independent.L <= maximumLength, "tier route length");
  const [minimumDecoyDecisions, maximumDecoyDecisions] = DECOY_DECISION_LIMITS[tier];
  require(independent.decoyDecisions >= minimumDecoyDecisions &&
    independent.decoyDecisions <= maximumDecoyDecisions, "tier decoy-decision range");
  require(independent.rejoiningDecoys >=
    (config.minRejoiningDecoys ?? DEFAULTS.minRejoiningDecoys), "minimum safe rejoining decoys");
  require(independent.detour >= DEFAULTS.minDetour, "minimum detour");
  require((independent.L - independent.M) % 2 === 0, "route parity");
  require(independent.turns >= DEFAULTS.minTurns, "minimum turns");
  require(independent.maxRun <= DEFAULTS.maxRun, "maximum straight run");
  require(independent.leftMoves <= DEFAULTS.maxLeftMoves, "maximum left moves");
  require(independent.shortestPaths <= DEFAULTS.maxShortestPaths, "shortest-path count");
  require(independent.reachableSafe >= DEFAULTS.minReachableSafe, "safe reachability");
  require(independent.deadEnds >= DEFAULTS.minDeadEnds, "safe dead ends");
  require(metrics.greedyWaste >= DEFAULTS.minGreedyWaste, "greedy waste threshold");
  require(metrics.memorylessWinRate <= DEFAULTS.maxMemorylessWin, "memoryless win threshold");
  require(independent.edges - (BOARD_SIZE - 1) >= DEFAULTS.extraEdges[0], "minimum loops");
  require(independent.edges - (BOARD_SIZE - 1) <= DEFAULTS.extraEdges[1], "maximum loops");

  for (const key of METRIC_KEYS) {
    if (metrics[key] !== independent[key]) fail(generated, tier, `metric ${key} mismatch`);
  }

  for (const node of board.nodes) {
    const uniqueNeighbors = new Set<number>();
    for (const neighbor of board.adjacency[node.id]) {
      require(Number.isInteger(neighbor) &&
        neighbor >= 0 &&
        neighbor < BOARD_SIZE, "edge out of bounds");
      require(neighbor !== node.id && !uniqueNeighbors.has(neighbor), "duplicate or self edge");
      uniqueNeighbors.add(neighbor);
      require(board.adjacency[neighbor].includes(node.id), "asymmetric edge");
      const distance =
        Math.abs((node.id % BOARD_COLUMNS) - (neighbor % BOARD_COLUMNS)) +
        Math.abs(Math.floor(node.id / BOARD_COLUMNS) - Math.floor(neighbor / BOARD_COLUMNS));
      require(distance === 1, "non-orthogonal edge");
    }
    require(board.adjacency[node.id].length > 0, "isolated node");
  }

  for (let index = 1; index < generated.solution.length; index += 1) {
    const previous = generated.solution[index - 1];
    const current = generated.solution[index];
    require(board.adjacency[previous].includes(current), "solution uses a missing edge");
    require(!hazardIds.has(current), "solution enters IDS");
  }
  require(generated.solution.length - 1 === independent.L, "solution is not shortest");
  return independent;
}

describe("Traceroute generator seed stress", () => {
  it(`accepts and reproduces ${SEED_COUNT.toLocaleString()} consecutive seeds across all tiers`, () => {
    const durations = new Float64Array(SEED_COUNT);

    for (let seed = 0; seed < SEED_COUNT; seed += 1) {
      const { name: tier, config } = TIERS_BY_SEED[seed % TIERS_BY_SEED.length];
      const startedAt = performance.now();
      let generated: GeneratedBoard;
      try {
        generated = generateBoard(seed, config);
      } catch (error) {
        const detail =
          error instanceof TracerouteGenerationError
            ? `attempts=${error.context.attempts} code=${error.code}`
            : error instanceof Error
              ? error.message
              : String(error);
        throw new Error(`seed=${seed} tier=${tier} generation failed: ${detail}`, { cause: error });
      }
      durations[seed] = performance.now() - startedAt;
      const independent = validateGeneratedBoard(generated, tier, config);
      expect(generated.metrics.L, `seed=${seed} tier=${tier}`).toBe(independent.L);

      const repeated = generateBoard(seed, config);
      if (JSON.stringify(repeated) !== JSON.stringify(generated)) {
        fail(generated, tier, "same-seed result changed");
      }
    }

    const sortedDurations = Array.from(durations).sort((a, b) => a - b);
    const medianMs = sortedDurations[Math.floor(SEED_COUNT * 0.5)];
    const p95Ms = sortedDurations[Math.ceil(SEED_COUNT * 0.95) - 1];
    const maximumMs = sortedDurations[SEED_COUNT - 1];
    console.info(
      `Traceroute generation over ${SEED_COUNT} seeds: median=${medianMs.toFixed(2)}ms p95=${p95Ms.toFixed(2)}ms max=${maximumMs.toFixed(2)}ms`,
    );
  }, 3_600_000);
});
