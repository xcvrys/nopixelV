import { describe, expect, it } from "vitest";
import {
  buildCandidate,
  buildSkeleton,
  mulberry32,
} from "../../src/lib/engine/traceroute/generation";
import type { Candidate, Skeleton } from "../../src/lib/engine/traceroute/generation";
import { BOARD_COLUMNS, BOARD_SIZE, DEFAULTS, TIERS } from "../../src/lib/engine/traceroute/types";
import type { Config } from "../../src/lib/engine/traceroute/types";
import { generateBoard } from "../../src/lib/engine/traceroute";

const PUBLIC_GENERATION_FIXTURES = [
  { tier: "easy", seed: 1, config: TIERS.easy },
  { tier: "medium", seed: 0, config: TIERS.medium },
  { tier: "hard", seed: 0, config: TIERS.hard },
] as const;

describe("Traceroute public board generation", () => {
  it.each(PUBLIC_GENERATION_FIXTURES)(
    "adapts a deterministic $tier board to the game representation",
    ({ seed, config }) => {
      const generated = generateBoard(seed, config);
      const board = generated.board;
      const source = board.nodes[board.sourceId];
      const destination = board.nodes[board.destinationId];
      const undirectedEdges =
        board.adjacency.reduce((total, neighbors) => total + neighbors.length, 0) / 2;

      expect(generated.seed).toBe(seed);
      expect(generated.attempts).toBeGreaterThan(0);
      expect(generated.attempts).toBeLessThanOrEqual(DEFAULTS.maxAttempts);
      expect(board.nodes).toHaveLength(BOARD_SIZE);
      expect(board.nodes.filter((node) => node.kind === "ids")).toHaveLength(9);
      expect(source).toMatchObject({ kind: "src", label: "SRC" });
      expect(source.id % BOARD_COLUMNS).toBe(0);
      expect(destination).toMatchObject({ kind: "dst", label: "DST" });
      expect(destination.id % BOARD_COLUMNS).toBe(BOARD_COLUMNS - 1);
      expect(board.initialTTL).toBeGreaterThanOrEqual(config.minL);
      expect(board.initialTTL).toBeLessThanOrEqual(config.maxL);
      expect(board.initialTTL).toBe(generated.metrics.L);
      expect(generated.solution[0]).toBe(board.sourceId);
      expect(generated.solution.at(-1)).toBe(board.destinationId);
      expect(generated.solution.length - 1).toBe(board.initialTTL);
      for (let index = 1; index < generated.solution.length; index += 1) {
        const previous = generated.solution[index - 1];
        const current = generated.solution[index];
        expect(board.adjacency[previous]).toContain(current);
        expect(board.nodes[current].kind).not.toBe("ids");
      }
      for (const node of board.nodes) {
        expect(board.adjacency[node.id].length).toBeGreaterThan(0);
        for (const neighbor of board.adjacency[node.id]) {
          expect(board.adjacency[neighbor]).toContain(node.id);
          expect(Math.abs(x(node.id) - x(neighbor)) + Math.abs(y(node.id) - y(neighbor))).toBe(1);
        }
      }

      expect(generated.metrics.detour).toBeGreaterThanOrEqual(DEFAULTS.minDetour);
      expect(undirectedEdges - (BOARD_SIZE - 1)).toBeGreaterThanOrEqual(DEFAULTS.extraEdges[0]);
      expect(undirectedEdges - (BOARD_SIZE - 1)).toBeLessThanOrEqual(DEFAULTS.extraEdges[1]);
      expect(board).not.toHaveProperty("edges");
      expect(generated).not.toHaveProperty("hazards");
    },
  );

  it("repeats the same board and labels for the same seed and tier", () => {
    const first = generateBoard(0, TIERS.medium);
    expect(generateBoard(0, TIERS.medium)).toEqual(first);
    expect(
      first.board.nodes
        .filter((node) => node.kind === "normal")
        .every((node) => /^[0-9A-F]{2}$/.test(node.label)),
    ).toBe(true);
  });

  it("throws a registered generation error after exactly the configured attempts", () => {
    let thrown: unknown;
    try {
      generateBoard(123, { minL: 1, maxL: 1, minDetour: 0, maxAttempts: 3 });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      name: "TracerouteGenerationError",
      code: "TRACEROUTE_GENERATION_EXHAUSTED",
      context: { seed: 123, attempts: 3 },
    });
  });
});

const x = (cell: number) => cell % BOARD_COLUMNS;
const y = (cell: number) => Math.floor(cell / BOARD_COLUMNS);
const edgeKey = (a: number, b: number) => `${Math.min(a, b)}:${Math.max(a, b)}`;

function shortestDistance(
  edges: [number, number][],
  source: number,
  destination: number,
  hazards: readonly number[] = [],
): number {
  const blocked = new Set(hazards);
  if (blocked.has(source) || blocked.has(destination)) return -1;
  const adjacency = Array.from({ length: BOARD_SIZE }, () => [] as number[]);
  for (const [a, b] of edges) {
    adjacency[a].push(b);
    adjacency[b].push(a);
  }

  const distance = new Int16Array(BOARD_SIZE).fill(-1);
  const queue = [source];
  distance[source] = 0;
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === destination) return distance[current];
    for (const next of adjacency[current]) {
      if (blocked.has(next) || distance[next] !== -1) continue;
      distance[next] = distance[current] + 1;
      queue.push(next);
    }
  }
  return distance[destination];
}

function assertCandidateTopology(candidate: Candidate, config: Config): void {
  expect(candidate.src).toBeGreaterThanOrEqual(0);
  expect(candidate.src).toBeLessThan(BOARD_SIZE);
  expect(candidate.dst).toBeGreaterThanOrEqual(0);
  expect(candidate.dst).toBeLessThan(BOARD_SIZE);
  expect(x(candidate.src)).toBe(0);
  expect(x(candidate.dst)).toBe(BOARD_COLUMNS - 1);
  expect(candidate.solution[0]).toBe(candidate.src);
  expect(candidate.solution[candidate.solution.length - 1]).toBe(candidate.dst);

  const solution = new Set(candidate.solution);
  const edgeKeys = new Set<string>();
  const degree = new Uint8Array(BOARD_SIZE);
  for (const [a, b] of candidate.edges) {
    expect(Math.abs(x(a) - x(b)) + Math.abs(y(a) - y(b))).toBe(1);
    const key = edgeKey(a, b);
    expect(edgeKeys.has(key)).toBe(false);
    edgeKeys.add(key);
    degree[a] += 1;
    degree[b] += 1;
  }
  for (let index = 1; index < candidate.solution.length; index += 1) {
    expect(edgeKeys.has(edgeKey(candidate.solution[index - 1], candidate.solution[index]))).toBe(
      true,
    );
  }
  for (const cell of degree) expect(cell).toBeGreaterThan(0);

  const extraEdges = candidate.edges.length - (BOARD_SIZE - 1);
  expect(extraEdges).toBeGreaterThanOrEqual(config.extraEdges[0]);
  expect(extraEdges).toBeLessThanOrEqual(config.extraEdges[1]);

  expect(candidate.hazards).toHaveLength(config.hazards);
  expect(new Set(candidate.hazards).size).toBe(config.hazards);
  for (const hazard of candidate.hazards) {
    expect(solution.has(hazard)).toBe(false);
    expect(hazard).not.toBe(candidate.src);
    expect(hazard).not.toBe(candidate.dst);
  }
}

function assertRouteShape(solution: number[], config: Config): void {
  const seen = new Set<number>();
  let previousDirection: string | undefined;
  let turns = 0;
  let run = 0;
  let maxRun = 0;
  let leftMoves = 0;

  for (let index = 0; index < solution.length; index += 1) {
    const cell = solution[index];
    expect(cell).toBeGreaterThanOrEqual(0);
    expect(cell).toBeLessThan(BOARD_SIZE);
    expect(seen.has(cell)).toBe(false);
    seen.add(cell);

    if (index === 0) continue;
    const previous = solution[index - 1];
    const dx = x(cell) - x(previous);
    const dy = y(cell) - y(previous);
    expect(Math.abs(dx) + Math.abs(dy)).toBe(1);

    const direction = dx === 1 ? "right" : dx === -1 ? "left" : dy === 1 ? "down" : "up";
    if (direction === "left") leftMoves += 1;
    if (direction === previousDirection) run += 1;
    else {
      if (previousDirection !== undefined) turns += 1;
      run = 1;
    }
    previousDirection = direction;
    maxRun = Math.max(maxRun, run);
  }

  expect(turns).toBeGreaterThanOrEqual(config.minTurns);
  expect(maxRun).toBeLessThanOrEqual(config.maxRun);
  expect(leftMoves).toBeLessThanOrEqual(config.maxLeftMoves);
}

function assertConnectedSkeleton(edges: [number, number][], solution: number[]): void {
  expect(edges).toHaveLength(BOARD_SIZE - 1);
  const adjacency = Array.from({ length: BOARD_SIZE }, () => [] as number[]);
  const edgeKeys = new Set<string>();

  for (const [a, b] of edges) {
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(BOARD_SIZE);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(BOARD_SIZE);
    expect(Math.abs(x(a) - x(b)) + Math.abs(y(a) - y(b))).toBe(1);
    expect(edgeKeys.has(edgeKey(a, b))).toBe(false);
    edgeKeys.add(edgeKey(a, b));
    adjacency[a].push(b);
    adjacency[b].push(a);
  }

  for (let index = 1; index < solution.length; index += 1) {
    expect(edgeKeys.has(edgeKey(solution[index - 1], solution[index]))).toBe(true);
  }

  const reached = new Set<number>([solution[0]]);
  const pending = [solution[0]];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    for (const next of adjacency[current]) {
      if (reached.has(next)) continue;
      reached.add(next);
      pending.push(next);
    }
  }

  expect(reached.size).toBe(BOARD_SIZE);
}

function assertSkeleton(skeleton: Skeleton, config: Config): void {
  expect(skeleton.src).toBeGreaterThanOrEqual(0);
  expect(skeleton.src).toBeLessThan(BOARD_SIZE);
  expect(skeleton.dst).toBeGreaterThanOrEqual(0);
  expect(skeleton.dst).toBeLessThan(BOARD_SIZE);
  expect(x(skeleton.src)).toBe(0);
  expect(x(skeleton.dst)).toBe(BOARD_COLUMNS - 1);
  expect(skeleton.solution[0]).toBe(skeleton.src);
  expect(skeleton.solution[skeleton.solution.length - 1]).toBe(skeleton.dst);

  const length = skeleton.solution.length - 1;
  const manhattan =
    Math.abs(x(skeleton.src) - x(skeleton.dst)) + Math.abs(y(skeleton.src) - y(skeleton.dst));
  expect(length).toBeGreaterThanOrEqual(config.minL);
  expect(length).toBeLessThanOrEqual(config.maxL);
  expect(length - manhattan).toBeGreaterThanOrEqual(config.minDetour);
  expect((length - manhattan) % 2).toBe(0);

  assertRouteShape(skeleton.solution, config);
  assertConnectedSkeleton(skeleton.edges, skeleton.solution);
}

describe("Traceroute seeded skeleton generation", () => {
  it("ports deterministic mulberry32 output, including seed zero", () => {
    const first = mulberry32(0);
    const second = mulberry32(0);
    expect(first()).toBeCloseTo(0.26642920868471265, 15);
    expect(first()).toBeCloseTo(0.0003297457005828619, 15);
    expect(second()).toBeCloseTo(0.26642920868471265, 15);
    expect(second()).toBeCloseTo(0.0003297457005828619, 15);
  });

  it("is deterministic for the same RNG seed and returns a valid skeleton", () => {
    const config = { ...DEFAULTS, ...TIERS.medium };
    const first = buildSkeleton(mulberry32(0x12345678), config);
    const second = buildSkeleton(mulberry32(0x12345678), config);
    expect(first).not.toBeNull();
    expect(second).toEqual(first);
    if (first === null) throw new Error("known-success skeleton fixture returned null");
    assertSkeleton(first, config);
  });

  it.each(Object.entries(TIERS))("keeps the %s route inside its tier window", (tier, window) => {
    const config = { ...DEFAULTS, ...window };
    const skeleton = buildSkeleton(mulberry32(0), config);
    expect(skeleton).not.toBeNull();
    if (skeleton === null) throw new Error(`known-success ${tier} fixture returned null`);
    assertSkeleton(skeleton, config);
  });
});
const CANDIDATE_FIXTURE_SEEDS: Record<keyof typeof TIERS, number> = {
  easy: 1,
  medium: 0,
  hard: 0,
};

const CANDIDATE_FIXTURE_EXTRA_EDGES: Record<keyof typeof TIERS, number> = {
  easy: 11,
  medium: 10,
  hard: 11,
};

describe("Traceroute candidate generation", () => {
  it.each(Object.entries(TIERS))(
    "accepts a qualifying %s candidate with plugged shortcuts",
    (tier, window) => {
      const tierName = tier as keyof typeof TIERS;
      const config = { ...DEFAULTS, ...window };
      const candidate = buildCandidate(mulberry32(CANDIDATE_FIXTURE_SEEDS[tierName]), config);
      expect(candidate).not.toBeNull();
      if (candidate === null) throw new Error(`known-success ${tier} fixture returned null`);

      assertCandidateTopology(candidate, config);
      expect(candidate.edges.length - (BOARD_SIZE - 1)).toBe(
        CANDIDATE_FIXTURE_EXTRA_EDGES[tierName],
      );
      expect(
        shortestDistance(candidate.edges, candidate.src, candidate.dst, candidate.hazards),
      ).toBe(candidate.solution.length - 1);
    },
  );

  it("shows that a shortcut exists only when its route is plugged", () => {
    const config = { ...DEFAULTS, ...TIERS.medium };
    const candidate = buildCandidate(mulberry32(CANDIDATE_FIXTURE_SEEDS.medium), config);
    expect(candidate).not.toBeNull();
    if (candidate === null) throw new Error("known-success medium fixture returned null");

    const routeLength = candidate.solution.length - 1;
    expect(shortestDistance(candidate.edges, candidate.src, candidate.dst)).toBeLessThan(
      routeLength,
    );
    expect(shortestDistance(candidate.edges, candidate.src, candidate.dst, candidate.hazards)).toBe(
      routeLength,
    );
  });

  it("honors an exact configured extra-edge target", () => {
    const config = { ...DEFAULTS, ...TIERS.medium, extraEdges: [10, 10] as [number, number] };
    const candidate = buildCandidate(mulberry32(CANDIDATE_FIXTURE_SEEDS.medium), config);
    expect(candidate).not.toBeNull();
    if (candidate === null) throw new Error("known-success exact-loop fixture returned null");
    expect(candidate.edges.length - (BOARD_SIZE - 1)).toBe(10);
  });

  it("rejects a candidate when the configured edge target is impossible", () => {
    const config = { ...DEFAULTS, ...TIERS.medium, extraEdges: [56, 56] as [number, number] };
    expect(buildCandidate(mulberry32(0), config)).toBeNull();
  });

  it("honors an overridden hazard count", () => {
    const config = {
      ...DEFAULTS,
      ...TIERS.medium,
      hazards: 8,
      extraEdges: [10, 10] as [number, number],
    };
    const candidate = buildCandidate(mulberry32(0), config);
    expect(candidate).not.toBeNull();
    if (candidate === null) throw new Error("known-success hazard override fixture returned null");
    expect(candidate.hazards).toHaveLength(8);
  });

  it("returns null when the route window cannot produce a valid length", () => {
    const config = { ...DEFAULTS, minL: 1, maxL: 1, minDetour: 0 };
    expect(buildCandidate(mulberry32(0), config)).toBeNull();
  });
});
