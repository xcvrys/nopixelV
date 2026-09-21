import { describe, expect, it } from "vitest";
import { findStronglyConnectedComponents } from "../../src/lib/engine/machinery/solver/cycles";
import type { StronglyConnectedComponent } from "../../src/lib/engine/machinery/solver/cycles";

type Edge = { source: string; target: string };

function normalize(components: StronglyConnectedComponent[]) {
  return components
    .map((component) => ({
      nodeIds: [...component.nodeIds].sort(),
      isCyclic: component.isCyclic,
    }))
    .sort((a, b) => a.nodeIds.join("\0").localeCompare(b.nodeIds.join("\0")));
}

describe("machinery SCC solver", () => {
  it("returns no components for an empty graph", () => {
    expect(findStronglyConnectedComponents([], [])).toEqual([]);
  });

  it("finds a single isolated node as an acyclic component", () => {
    expect(normalize(findStronglyConnectedComponents(["A"], []))).toEqual([
      { nodeIds: ["A"], isCyclic: false },
    ]);
  });

  it("keeps a linear feedforward DAG in three acyclic components", () => {
    const edges: Edge[] = [
      { source: "A", target: "B" },
      { source: "B", target: "C" },
    ];

    expect(normalize(findStronglyConnectedComponents(["A", "B", "C"], edges))).toEqual([
      { nodeIds: ["A"], isCyclic: false },
      { nodeIds: ["B"], isCyclic: false },
      { nodeIds: ["C"], isCyclic: false },
    ]);
  });

  it("finds a simple three-node cycle", () => {
    const edges: Edge[] = [
      { source: "A", target: "B" },
      { source: "B", target: "C" },
      { source: "C", target: "A" },
    ];

    expect(normalize(findStronglyConnectedComponents(["A", "B", "C"], edges))).toEqual([
      { nodeIds: ["A", "B", "C"], isCyclic: true },
    ]);
  });

  it("finds independent linear and cyclic branches", () => {
    const edges: Edge[] = [
      { source: "A", target: "B" },
      { source: "C", target: "D" },
      { source: "D", target: "C" },
    ];

    expect(normalize(findStronglyConnectedComponents(["A", "B", "C", "D"], edges))).toEqual([
      { nodeIds: ["A"], isCyclic: false },
      { nodeIds: ["B"], isCyclic: false },
      { nodeIds: ["C", "D"], isCyclic: true },
    ]);
  });

  it("marks a self-loop as cyclic", () => {
    expect(
      normalize(findStronglyConnectedComponents(["A"], [{ source: "A", target: "A" }])),
    ).toEqual([{ nodeIds: ["A"], isCyclic: true }]);
  });

  it("separates a linear prefix, cyclic loop, and linear suffix", () => {
    const edges: Edge[] = [
      { source: "A", target: "B" },
      { source: "B", target: "C" },
      { source: "C", target: "D" },
      { source: "D", target: "C" },
      { source: "D", target: "E" },
      { source: "E", target: "F" },
    ];

    expect(
      normalize(findStronglyConnectedComponents(["A", "B", "C", "D", "E", "F"], edges)),
    ).toEqual([
      { nodeIds: ["A"], isCyclic: false },
      { nodeIds: ["B"], isCyclic: false },
      { nodeIds: ["C", "D"], isCyclic: true },
      { nodeIds: ["E"], isCyclic: false },
      { nodeIds: ["F"], isCyclic: false },
    ]);
  });

  it("merges interlocking figure-eight loops through their shared bridge node", () => {
    const edges: Edge[] = [
      { source: "A", target: "B" },
      { source: "B", target: "C" },
      { source: "C", target: "A" },
      { source: "C", target: "D" },
      { source: "D", target: "E" },
      { source: "E", target: "C" },
    ];

    expect(normalize(findStronglyConnectedComponents(["A", "B", "C", "D", "E"], edges))).toEqual([
      { nodeIds: ["A", "B", "C", "D", "E"], isCyclic: true },
    ]);
  });
});
