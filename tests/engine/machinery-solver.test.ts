import { describe, expect, it } from "vitest";
import { findStronglyConnectedComponents } from "../../src/lib/engine/machinery/solver/cycles";
import {
  evaluatePowerGrids,
  type PowerGridEvaluation,
} from "../../src/lib/engine/machinery/solver/power-grid";
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

function findSubnet(evaluation: PowerGridEvaluation, nodeId: string) {
  const subnet = evaluation.subnets.find((candidate) => candidate.nodeIds.includes(nodeId));
  if (!subnet) throw new Error(`No subnet contains ${nodeId}`);
  return subnet;
}

describe("evaluatePowerGrids", () => {
  it("blackouts an isolated consumer", () => {
    const evaluation = evaluatePowerGrids([{ id: "consumer", basePowerDrawKW: 100 }], []);

    expect(findSubnet(evaluation, "consumer")).toMatchObject({
      nodeIds: ["consumer"],
      totalGenerationKW: 0,
      totalDemandKW: 100,
      satisfactionRatio: 0,
    });
    expect(evaluation.nodeEfficiencyMultipliers.consumer).toBe(0);
  });

  it("keeps zero-draw logistics nodes fully efficient without power", () => {
    const evaluation = evaluatePowerGrids([{ id: "storage", basePowerDrawKW: 0 }], []);

    expect(findSubnet(evaluation, "storage")).toMatchObject({
      totalGenerationKW: 0,
      totalDemandKW: 0,
      satisfactionRatio: 1,
    });
    expect(evaluation.nodeEfficiencyMultipliers.storage).toBe(1);
  });

  it("fully satisfies a consumer when its grid has excess generation", () => {
    const evaluation = evaluatePowerGrids(
      [
        { id: "generator", basePowerDrawKW: -150 },
        { id: "consumer", basePowerDrawKW: 100 },
      ],
      [{ source: "generator", target: "consumer", sourceHandle: "energy" }],
    );

    expect(findSubnet(evaluation, "consumer")).toMatchObject({
      totalGenerationKW: 150,
      totalDemandKW: 100,
      satisfactionRatio: 1,
    });
    expect(evaluation.nodeEfficiencyMultipliers.consumer).toBe(1);
  });

  it("brownouts every powered machine proportionally when generation is deficient", () => {
    const evaluation = evaluatePowerGrids(
      [
        { id: "generator", basePowerDrawKW: -50 },
        { id: "consumer", basePowerDrawKW: 100 },
      ],
      [{ source: "generator", target: "consumer", targetHandle: "energy" }],
    );

    expect(findSubnet(evaluation, "consumer")).toMatchObject({
      totalGenerationKW: 50,
      totalDemandKW: 100,
      satisfactionRatio: 0.5,
    });
    expect(evaluation.nodeEfficiencyMultipliers.consumer).toBe(0.5);
  });

  it("evaluates completely independent power subnets separately", () => {
    const evaluation = evaluatePowerGrids(
      [
        { id: "generator-a", basePowerDrawKW: -100 },
        { id: "consumer-a", basePowerDrawKW: 50 },
        { id: "generator-b", basePowerDrawKW: -50 },
        { id: "consumer-b", basePowerDrawKW: 100 },
      ],
      [
        { source: "generator-a", target: "consumer-a", resourceType: "energy" },
        {
          source: "generator-b",
          target: "consumer-b",
          sourceHandle: "energy",
          resourceType: "solid",
        },
      ],
    );

    expect(findSubnet(evaluation, "consumer-a").satisfactionRatio).toBe(1);
    expect(findSubnet(evaluation, "consumer-b").satisfactionRatio).toBe(0.5);
    expect(evaluation.nodeEfficiencyMultipliers).toEqual({
      "generator-a": 1,
      "consumer-a": 1,
      "generator-b": 0.5,
      "consumer-b": 0.5,
    });
  });
});
