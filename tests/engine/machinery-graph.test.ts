import { describe, expect, it } from "vitest";
import {
  canConnect,
  connectEdge,
  createMachineNode,
  createTextNode,
  isValidMachineryGraph,
  removeNode,
  sanitizeEdges,
  updateNodeData,
  type MachineNode,
  type MachineryEdge,
} from "../../src/lib/engine/machinery";

const source: MachineNode = {
  id: "source",
  type: "machine",
  position: { x: 0, y: 0 },
  data: { machineType: "furnace", name: "Source", recipeId: "smelt_iron_scrap" },
};
const target: MachineNode = {
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
  it("updates energy node display data", () => {
    const energyNode = {
      id: "energy",
      type: "energy" as const,
      position: { x: 0, y: 0 },
      data: { energyType: "generator" as const, name: "Generator", showImage: true },
    };
    const nodes = updateNodeData([energyNode], "energy", { showImage: false });
    expect(nodes[0].data.showImage).toBe(false);
  });
  it("removes edges that no longer match active recipe handles", () => {
    const changedSource = {
      ...source,
      data: { ...source.data, recipeId: "smelt_copper_scrap" },
    };
    expect(sanitizeEdges([changedSource, target], [edge])).toEqual([]);
  });

  it("removes incident edges with a node", () => {
    expect(removeNode([source, target], [edge], "source")).toEqual({
      nodes: [target],
      edges: [],
    });
  });

  it("accepts compatible ports and rejects incompatible directions or resources", () => {
    expect(canConnect([], { ...connection, sourceHandle: "out_0", targetHandle: "in_0" })).toBe(
      true,
    );
    expect(canConnect([], { ...connection, sourceHandle: "in_0" })).toBe(false);
    expect(canConnect([], { ...connection, targetHandle: "out_0" })).toBe(false);
    expect(canConnect([], { ...connection, sourceHandle: "energy", targetHandle: "in_0" })).toBe(
      false,
    );
    expect(
      canConnect([], {
        ...connection,
        sourceHandle: "out_0",
        targetHandle: "in_0",
        resourceType: "energy",
      }),
    ).toBe(false);
  });

  it("accepts cyclic connections and considers cyclic graphs valid", () => {
    const nodes = (["a", "b", "c"] as const).map((id): MachineNode => ({
      ...source,
      id,
      data: { ...source.data, recipeId: null },
    }));
    const cycle: MachineryEdge[] = [
      { id: "a-b", source: "a", sourceHandle: "out_0", target: "b", targetHandle: "in_0" },
      { id: "b-c", source: "b", sourceHandle: "out_0", target: "c", targetHandle: "in_0" },
    ];
    expect(
      canConnect(cycle, {
        source: "c",
        sourceHandle: "out_0",
        target: "a",
        targetHandle: "in_0",
      }),
    ).toBe(true);
    cycle.push({
      id: "c-a",
      source: "c",
      sourceHandle: "out_0",
      target: "a",
      targetHandle: "in_0",
    });
    expect(isValidMachineryGraph(nodes, cycle)).toBe(true);
  });

  it("does not add invalid connections", () => {
    const edges = [edge];
    expect(connectEdge(edges, { ...connection, source: "other" })).toBe(edges);
  });

  it("creates a text node with editable content", () => {
    const node = createTextNode("Production notes", { x: 40, y: 80 });

    expect(node).toMatchObject({
      type: "text",
      position: { x: 40, y: 80 },
      data: { text: "Production notes" },
    });
  });
});
