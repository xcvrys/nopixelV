import { describe, expect, it } from "vitest";
import {
  canConnect,
  connectEdge,
  createMachineNode,
  removeNode,
  updateNodeData,
  type MachineryEdge,
  type MachineryNode,
} from "../../src/lib/engine/machinery";

const source: MachineryNode = {
  id: "source",
  type: "machine",
  position: { x: 0, y: 0 },
  data: { machineType: "furnace", name: "Source", recipeId: "smelt_iron_scrap" },
};
const target: MachineryNode = {
  id: "target",
  type: "machine",
  position: { x: 200, y: 0 },
  data: { machineType: "processor", name: "Target", recipeId: "craft_circuit_board" },
};
const connection = {
  source: source.id,
  sourceHandle: "iron_ingot",
  target: target.id,
  targetHandle: "iron_ingot",
};

const edge: MachineryEdge = { id: "edge-1", ...connection };

describe("machinery graph", () => {
  it("creates machine defaults", () => {
    const node = createMachineNode("furnace", { x: 40, y: 80 }, 0);
    expect(node).toMatchObject({
      type: "machine",
      position: { x: 40, y: 80 },
      data: { machineType: "furnace", recipeId: "smelt_iron_scrap", showImage: true },
    });
  });

  it("updates only the requested node data", () => {
    const nodes = updateNodeData([source, target], "source", { name: "Updated" });
    expect(nodes[0].data.name).toBe("Updated");
    expect(nodes[1]).toEqual(target);
  });

  it("removes incident edges with a node", () => {
    expect(removeNode([source, target], [edge], "source")).toEqual({
      nodes: [target],
      edges: [],
    });
  });

  it("accepts matching handles and rejects mismatches or occupied handles", () => {
    expect(canConnect([], connection)).toBe(true);
    expect(canConnect([], { ...connection, targetHandle: "copper_ingot" })).toBe(false);
    expect(canConnect([edge], { ...connection, source: "other" })).toBe(false);
    expect(canConnect([edge], { ...connection, target: "other-target" })).toBe(false);
  });

  it("does not add invalid connections", () => {
    const edges = [edge];
    expect(connectEdge(edges, { ...connection, source: "other" })).toBe(edges);
  });
});
