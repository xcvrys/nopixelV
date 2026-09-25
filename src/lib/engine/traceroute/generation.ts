import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  BOARD_SIZE,
  type Board as GameBoard,
  DEFAULTS,
  type Config,
} from "./types";
import { analyze } from "./analysis";
import type { Metrics } from "./analysis";

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Skeleton {
  src: number;
  dst: number;
  solution: number[];
  edges: [number, number][];
}

export interface Candidate extends Skeleton {
  hazards: number[];
  metrics: Metrics;
}

const ERROR_REGISTRY = {
  TRACEROUTE_GENERATION_EXHAUSTED: "Unable to generate a valid traceroute board.",
} as const;

export type TracerouteGenerationErrorCode = keyof typeof ERROR_REGISTRY;

export class TracerouteGenerationError extends Error {
  constructor(
    public readonly code: TracerouteGenerationErrorCode,
    public readonly context: { seed: number; attempts: number },
  ) {
    super(ERROR_REGISTRY[code]);
    this.name = "TracerouteGenerationError";
  }
}

function throwRegisteredError(
  code: TracerouteGenerationErrorCode,
  context: { seed: number; attempts: number },
): never {
  throw new TracerouteGenerationError(code, context);
}

export interface GeneratedBoard {
  seed: number;
  board: GameBoard;
  solution: number[];
  metrics: Metrics;
  attempts: number;
}

const X = (cell: number) => cell % BOARD_COLUMNS;
const Y = (cell: number) => (cell / BOARD_COLUMNS) | 0;
const id = (x: number, y: number) => y * BOARD_COLUMNS + x;
const manhattan = (a: number, b: number) => Math.abs(X(a) - X(b)) + Math.abs(Y(a) - Y(b));

function gridNeighbors(cell: number): number[] {
  const x = X(cell);
  const y = Y(cell);
  const neighbors: number[] = [];
  if (x > 0) neighbors.push(cell - 1);
  if (x < BOARD_COLUMNS - 1) neighbors.push(cell + 1);
  if (y > 0) neighbors.push(cell - BOARD_COLUMNS);
  if (y < BOARD_ROWS - 1) neighbors.push(cell + BOARD_COLUMNS);
  return neighbors;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function pick<T>(items: T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

function randomInteger(rng: Rng, low: number, high: number): number {
  return low + Math.floor(rng() * (high - low + 1));
}

class Graph {
  readonly adjacency: Set<number>[] = Array.from({ length: BOARD_SIZE }, () => new Set<number>());

  add(a: number, b: number): void {
    this.adjacency[a].add(b);
    this.adjacency[b].add(a);
  }

  del(a: number, b: number): void {
    this.adjacency[a].delete(b);
    this.adjacency[b].delete(a);
  }

  has(a: number, b: number): boolean {
    return this.adjacency[a].has(b);
  }
  edges(): [number, number][] {
    const edges: [number, number][] = [];
    for (let a = 0; a < BOARD_SIZE; a += 1) {
      for (const b of this.adjacency[a]) {
        if (a < b) edges.push([a, b]);
      }
    }
    return edges;
  }
}

interface Bfs {
  dist: Int16Array;
  parent: Int16Array;
  order: number[];
}

function bfs(graph: Graph, source: number, blocked: Uint8Array): Bfs {
  const dist = new Int16Array(BOARD_SIZE).fill(-1);
  const parent = new Int16Array(BOARD_SIZE).fill(-1);
  const order = [source];
  dist[source] = 0;

  for (let index = 0; index < order.length; index += 1) {
    const current = order[index];
    for (const next of graph.adjacency[current]) {
      if (dist[next] !== -1 || blocked[next]) continue;
      dist[next] = dist[current] + 1;
      parent[next] = current;
      order.push(next);
    }
  }

  return { dist, parent, order };
}

function pathTo(result: Bfs, destination: number): number[] {
  const path: number[] = [];
  for (let cell = destination; cell !== -1; cell = result.parent[cell]) path.push(cell);
  return path.reverse();
}

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [0, -1],
  [-1, 0],
] as const;

function carveSolution(
  rng: Rng,
  config: Config,
  src: number,
  dst: number,
  length: number,
): number[] | null {
  const path = [src];
  const used = new Uint8Array(BOARD_SIZE);
  used[src] = 1;
  let budget = 30_000;
  const destinationRow = Y(dst);

  const search = (
    current: number,
    lastDirection: number,
    run: number,
    leftMoves: number,
    turns: number,
  ): boolean => {
    budget -= 1;
    if (budget < 0) return false;

    const steps = path.length - 1;
    if (current === dst) return steps === length && turns >= config.minTurns;

    for (const direction of shuffle([0, 1, 2, 3], rng)) {
      const nextX = X(current) + DIRECTIONS[direction][0];
      const nextY = Y(current) + DIRECTIONS[direction][1];
      if (nextX < 0 || nextY < 0 || nextX >= BOARD_COLUMNS || nextY >= BOARD_ROWS) continue;

      const next = id(nextX, nextY);
      if (used[next]) continue;

      const nextSteps = steps + 1;
      if (next === dst && nextSteps !== length) continue;
      if (
        nextX === BOARD_COLUMNS - 1 &&
        next !== dst &&
        !(nextSteps === length - 1 && Math.abs(nextY - destinationRow) === 1)
      ) {
        continue;
      }

      const nextRun = direction === lastDirection ? run + 1 : 1;
      if (nextRun > config.maxRun) continue;
      const nextLeftMoves = leftMoves + (direction === 3 ? 1 : 0);
      if (nextLeftMoves > config.maxLeftMoves) continue;
      if (manhattan(next, dst) > length - nextSteps) continue;

      used[next] = 1;
      path.push(next);
      const nextTurns = lastDirection === -1 || direction === lastDirection ? turns : turns + 1;
      if (search(next, direction, nextRun, nextLeftMoves, nextTurns)) return true;
      path.pop();
      used[next] = 0;
    }

    return false;
  };

  return search(src, -1, 0, 0, 0) ? path : null;
}

function growSkeleton(graph: Graph, rng: Rng, config: Config, solution: number[]): void {
  const seen = new Uint8Array(BOARD_SIZE);
  const active: number[] = [];
  for (const cell of solution) {
    seen[cell] = 1;
    active.push(cell);
  }
  shuffle(active, rng);

  while (active.length > 0) {
    const activeIndex =
      rng() < config.growthRecency ? active.length - 1 : Math.floor(rng() * active.length);
    const current = active[activeIndex];
    const free = gridNeighbors(current).filter((neighbor) => !seen[neighbor]);
    if (free.length === 0) {
      active.splice(activeIndex, 1);
      continue;
    }

    const next = pick(free, rng);
    graph.add(current, next);
    seen[next] = 1;
    active.push(next);
  }
}

export function buildSkeleton(rng: Rng, config: Config): Skeleton | null {
  const srcRow = randomInteger(rng, 0, BOARD_ROWS - 1);
  const dstRow = randomInteger(rng, 0, BOARD_ROWS - 1);
  const src = id(0, srcRow);
  const dst = id(BOARD_COLUMNS - 1, dstRow);
  const minimumLength = Math.max(config.minL, manhattan(src, dst) + config.minDetour);
  const lengths: number[] = [];
  for (let length = minimumLength; length <= config.maxL; length += 1) {
    if ((length - manhattan(src, dst)) % 2 === 0) lengths.push(length);
  }
  if (lengths.length === 0) return null;

  const length = pick(lengths, rng);
  const solution = carveSolution(rng, config, src, dst, length);
  if (solution === null) return null;

  const graph = new Graph();
  for (let index = 1; index < solution.length; index += 1) {
    graph.add(solution[index - 1], solution[index]);
  }
  growSkeleton(graph, rng, config, solution);

  return { src, dst, solution, edges: graph.edges() };
}

function addLoopsAndPlugs(
  graph: Graph,
  rng: Rng,
  config: Config,
  source: number,
  destination: number,
  solutionLength: number,
  solutionCells: Set<number>,
  hazards: Set<number>,
): { added: number; target: number } {
  const blocked = new Uint8Array(BOARD_SIZE);
  for (const hazard of hazards) blocked[hazard] = 1;

  const candidates: [number, number][] = [];
  for (let a = 0; a < BOARD_SIZE; a += 1) {
    for (const b of gridNeighbors(a)) {
      if (a < b && !graph.has(a, b) && !(solutionCells.has(a) && solutionCells.has(b))) {
        candidates.push([a, b]);
      }
    }
  }
  shuffle(candidates, rng);
  const target = randomInteger(rng, config.extraEdges[0], config.extraEdges[1]);
  let added = 0;

  for (const [a, b] of candidates) {
    if (added >= target) break;
    graph.add(a, b);
    const placed: number[] = [];
    let accepted = true;

    for (;;) {
      const result = bfs(graph, source, blocked);
      if (result.dist[destination] === solutionLength) break;

      const options = pathTo(result, destination).filter((cell) => !solutionCells.has(cell));
      if (options.length === 0 || hazards.size >= config.hazards) {
        accepted = false;
        break;
      }

      const hazard = pick(options, rng);
      hazards.add(hazard);
      blocked[hazard] = 1;
      placed.push(hazard);
    }

    if (accepted) {
      added += 1;
      continue;
    }

    graph.del(a, b);
    for (const hazard of placed) {
      hazards.delete(hazard);
      blocked[hazard] = 0;
    }
  }

  return { added, target };
}

function fillHazards(
  graph: Graph,
  rng: Rng,
  config: Config,
  solutionCells: Set<number>,
  hazards: Set<number>,
): boolean {
  if (hazards.size > config.hazards) return false;

  while (hazards.size < config.hazards) {
    const candidates: number[] = [];
    for (let cell = 0; cell < BOARD_SIZE; cell += 1) {
      if (!solutionCells.has(cell) && !hazards.has(cell)) candidates.push(cell);
    }
    if (candidates.length === 0) return false;

    let current = pick(candidates, rng);
    hazards.add(current);
    for (let length = 1; hazards.size < config.hazards && length < 4 && rng() < 0.5; length += 1) {
      const neighbors = [...graph.adjacency[current]].filter(
        (cell) => !solutionCells.has(cell) && !hazards.has(cell),
      );
      if (neighbors.length === 0) break;
      current = pick(neighbors, rng);
      hazards.add(current);
    }
  }

  return hazards.size === config.hazards;
}

export function buildCandidate(rng: Rng, config: Config): Candidate | null {
  const skeleton = buildSkeleton(rng, config);
  if (skeleton === null) return null;

  const graph = new Graph();
  for (const [a, b] of skeleton.edges) graph.add(a, b);
  const solutionCells = new Set(skeleton.solution);
  const hazards = new Set<number>();
  const loops = addLoopsAndPlugs(
    graph,
    rng,
    config,
    skeleton.src,
    skeleton.dst,
    skeleton.solution.length - 1,
    solutionCells,
    hazards,
  );
  if (loops.added !== loops.target || !fillHazards(graph, rng, config, solutionCells, hazards)) {
    return null;
  }

  const edges = graph.edges();
  const hazardList = [...hazards].sort((a, b) => a - b);
  const metrics = analyze(edges, hazardList, skeleton.src, skeleton.dst, rng, skeleton.solution);
  if (
    hazardList.length !== config.hazards ||
    metrics.L !== skeleton.solution.length - 1 ||
    metrics.shortestPaths > config.maxShortestPaths ||
    metrics.reachableSafe < config.minReachableSafe ||
    metrics.deadEnds < config.minDeadEnds ||
    metrics.greedyWaste < config.minGreedyWaste ||
    metrics.memorylessWinRate > config.maxMemorylessWin
  ) {
    return null;
  }

  return {
    ...skeleton,
    edges,
    hazards: hazardList,
    metrics,
  };
}
function toGameBoard(candidate: Candidate, seed: number): GameBoard {
  const labelRandom = mulberry32(seed);
  const nodes = Array.from({ length: BOARD_SIZE }, (_, id) => {
    if (id === candidate.src) return { id, kind: "src" as const, label: "SRC" };
    if (id === candidate.dst) return { id, kind: "dst" as const, label: "DST" };
    if (candidate.hazards.includes(id)) return { id, kind: "ids" as const, label: "IDS" };
    return {
      id,
      kind: "normal" as const,
      label: Math.floor(labelRandom() * 256)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase(),
    };
  });
  const adjacency = Array.from({ length: BOARD_SIZE }, () => [] as number[]);
  for (const [a, b] of candidate.edges) {
    adjacency[a].push(b);
    adjacency[b].push(a);
  }

  return {
    nodes,
    adjacency,
    sourceId: candidate.src,
    destinationId: candidate.dst,
    initialTTL: candidate.metrics.L,
  };
}

export function generateBoard(seed: number, overrides: Partial<Config> = {}): GeneratedBoard {
  const config = { ...DEFAULTS, ...overrides };
  const rng = mulberry32(seed);

  for (let attempts = 1; attempts <= config.maxAttempts; attempts += 1) {
    const candidate = buildCandidate(rng, config);
    if (candidate === null) continue;

    return {
      seed,
      board: toGameBoard(candidate, seed),
      solution: candidate.solution,
      metrics: candidate.metrics,
      attempts,
    };
  }

  return throwRegisteredError("TRACEROUTE_GENERATION_EXHAUSTED", {
    seed,
    attempts: config.maxAttempts,
  });
}
