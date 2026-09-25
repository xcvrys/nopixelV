import { describe, expect, it } from "vitest";
import { buildCandidate } from "../../src/lib/engine/traceroute/generation";
import { analyze } from "../../src/lib/engine/traceroute/analysis";
import type { Metrics } from "../../src/lib/engine/traceroute/analysis";
import { DEFAULTS, TIERS } from "../../src/lib/engine/traceroute/types";

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("Traceroute Analysis - Graph Metrics", () => {
  it("computes metrics for a simple path without hazards", () => {
    // 0 - 1 - 2
    // |       |
    // 12 - 13 - 14 (we won't use 13, just 0-1-2-14)
    // Actually just: 0-1-2-14-26
    const edges: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 14],
      [14, 26],
    ];
    const metrics: Metrics = analyze(edges, [], 0, 26, mulberry32(1));

    expect(metrics.L).toBe(4);
    expect(metrics.M).toBe(4);
    expect(metrics.detour).toBe(0);
    expect(metrics.shortestPaths).toBe(1);
    expect(metrics.turns).toBe(1); // right, right, down, down -> 1 turn
    expect(metrics.maxRun).toBe(2);
    expect(metrics.greedyWaste).toBe(1); // L moves / L = 1
    expect(metrics.verticalMoves).toBe(2);
    expect(metrics.edges).toBe(4);
    expect(metrics.loops).toBe(0);
    expect(metrics.deadEnds).toBe(0);
    expect(metrics.junctions).toBe(0);
    expect(metrics.reachableSafe).toBeCloseTo(5 / 72); // 5 nodes reachable out of 72 safe
    expect(metrics.criticalHazards).toBe(0);
    expect(metrics.memorylessWinRate).toBe(1);
  });

  it("handles a hazard blocking a shortcut and causing a detour", () => {
    // 0 - 1(H) - 2
    // |          |
    // 12 - 13 -- 14
    // Path: 0 - 12 - 13 - 14 - 2
    const edges: [number, number][] = [
      [0, 1],
      [1, 2],
      [0, 12],
      [12, 13],
      [13, 14],
      [14, 2],
    ];
    const metrics: Metrics = analyze(edges, [1], 0, 2, mulberry32(1));

    expect(metrics.L).toBe(4);
    expect(metrics.M).toBe(2);
    expect(metrics.detour).toBe(2);
    expect(metrics.shortestPaths).toBe(1);
    expect(metrics.turns).toBe(2); // down, right, right, up
    expect(metrics.maxRun).toBe(2);
    expect(metrics.criticalHazards).toBe(1); // hazard 1 is critical
    expect(metrics.loops).toBe(1); // 1 cycle
    expect(metrics.deadEnds).toBe(0);
    expect(metrics.junctions).toBe(0);
    // 0, 12, 13, 14, 2 reachable => 5 nodes. 71 safe total.
    expect(metrics.reachableSafe).toBeCloseTo(5 / 71);
    expect(metrics.memorylessWinRate).toBeGreaterThan(0.5); // Will eventually win
  });

  it("counts multiple tied shortest paths", () => {
    // 0 - 1 - 2
    // |   |   |
    // 12- 13- 14
    // Src: 0, Dst: 14. M = 3.
    const edges: [number, number][] = [
      [0, 1],
      [1, 2],
      [0, 12],
      [12, 13],
      [13, 14],
      [1, 13],
      [2, 14],
    ];
    const metrics: Metrics = analyze(edges, [], 0, 14, mulberry32(1));

    expect(metrics.L).toBe(3);
    expect(metrics.shortestPaths).toBe(3);
  });

  it("identifies dead ends, junctions, and greedy waste", () => {
    // 0 - 1 - 2 - 3 (dead end at 3)
    // |
    // 12 - 13 - 14 (dst)
    // |
    // 24 (dead end)
    const edges: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 3], // dead end 3
      [0, 12],
      [12, 13],
      [13, 14],
      [12, 24], // dead end 24
    ];
    const metrics: Metrics = analyze(edges, [], 0, 14, mulberry32(1));

    expect(metrics.L).toBe(3);
    expect(metrics.deadEnds).toBe(2); // 3 and 24
    // Node 0 has exits (1, 12) -> 2. Node 12 has (0, 13, 24) -> 3 (junction).
    expect(metrics.junctions).toBe(1); // 12
    expect(metrics.greedyWaste).toBeGreaterThan(1); // Will sometimes go wrong way and backtrack
  });

  it("counts leftward moves in a constrained shortest route", () => {
    // 1 <- 0
    //      |
    //     12 - 13 - 14
    const edges: [number, number][] = [
      [1, 0],
      [0, 12],
      [12, 13],
      [13, 14],
    ];
    const metrics = analyze(edges, [], 1, 14, mulberry32(1));

    expect(metrics.L).toBe(4);
    expect(metrics.M).toBe(2);
    expect(metrics.detour).toBe(2);
    expect(metrics.turns).toBe(2);
    expect(metrics.maxRun).toBe(2);
    expect(metrics.leftMoves).toBe(1);
    expect(metrics.verticalMoves).toBe(1);
  });
});
const CANDIDATE_FIXTURE_SEEDS: Record<keyof typeof TIERS, number> = {
  short: 1,
  medium: 0,
  long: 0,
};

describe("Traceroute candidate acceptance metrics", () => {
  it.each(Object.entries(TIERS))("accepts only reference-qualified %s metrics", (tier, window) => {
    const tierName = tier as keyof typeof TIERS;
    const config = { ...DEFAULTS, ...window };
    const candidate = buildCandidate(mulberry32(CANDIDATE_FIXTURE_SEEDS[tierName]), config);
    expect(candidate).not.toBeNull();
    if (candidate === null) throw new Error(`known-success ${tier} fixture returned null`);

    expect(candidate.metrics.L).toBe(candidate.solution.length - 1);
    expect(candidate.metrics.shortestPaths).toBeLessThanOrEqual(config.maxShortestPaths);
    expect(candidate.metrics.reachableSafe).toBeGreaterThanOrEqual(config.minReachableSafe);
    expect(candidate.metrics.deadEnds).toBeGreaterThanOrEqual(config.minDeadEnds);
    expect(candidate.metrics.greedyWaste).toBeGreaterThanOrEqual(config.minGreedyWaste);
    expect(candidate.metrics.memorylessWinRate).toBeLessThanOrEqual(config.maxMemorylessWin);
  });
});
