import { beforeEach, describe, expect, it } from "vitest";
import { getRecipe } from "../../src/lib/data/recipes";
import { MachineryStore } from "../../src/lib/stores/machinery.svelte";

describe("MachineryStore", () => {
  let store: MachineryStore;

  beforeEach(async () => {
    store = new MachineryStore();
    await store.clearSavedWorkflows();
  });

  it("persists and restores the active workflow", async () => {
    store.addMachine("furnace", { x: 0, y: 0 });
    await store.flushPersistence();

    expect(store.activeWorkflowId).toMatch(/^wf-/);
    expect((await store.refreshWorkflows())[0]).toMatchObject({
      id: store.activeWorkflowId,
      name: "Untitled Workflow",
      nodes: store.nodes,
    });

    const restoredStore = new MachineryStore();
    await restoredStore.initialize();
    expect(restoredStore.activeWorkflowId).toBe(store.activeWorkflowId);
    expect(restoredStore.nodes).toHaveLength(1);
  });

  it("keeps workflow IDs immutable while renaming", async () => {
    store.addMachine("furnace");
    const id = store.activeWorkflowId;
    store.renameWorkflow("Iron Smelting Line");
    await store.flushPersistence();

    expect(store.activeWorkflowId).toBe(id);
    expect((await store.refreshWorkflows())[0].name).toBe("Iron Smelting Line");
  });
  it("limits workflow names to 40 characters", () => {
    store.renameWorkflow("A".repeat(80));

    expect(store.activeWorkflowName).toHaveLength(40);
    expect(store.activeWorkflowName).toBe("A".repeat(40));
  });

  it("creates independent workflows", async () => {
    store.addMachine("furnace");
    const originalId = store.activeWorkflowId;
    await store.flushPersistence();

    await store.newWorkflow();
    await store.flushPersistence();

    expect(store.activeWorkflowId).not.toBe(originalId);
    expect((await store.refreshWorkflows()).map((workflow) => workflow.id)).toEqual(
      expect.arrayContaining([originalId, store.activeWorkflowId]),
    );
  });

  it("persists node movement through the bound nodes setter", async () => {
    const nodeId = store.addMachine("furnace", { x: 0, y: 0 });
    await store.flushPersistence();

    store.nodes = store.nodes.map((node) =>
      node.id === nodeId ? { ...node, position: { x: 400, y: 120 } } : node,
    );
    store.commitNodePositions();
    await store.flushPersistence();

    const restoredStore = new MachineryStore();
    await restoredStore.initialize();
    expect(restoredStore.nodes[0].position).toEqual({ x: 400, y: 120 });
  });

  it("deletes only the selected workflow", async () => {
    store.addMachine("furnace");
    const firstId = store.activeWorkflowId;
    await store.flushPersistence();
    await store.newWorkflow();
    const secondId = store.activeWorkflowId;
    await store.flushPersistence();

    await store.deleteWorkflow(firstId ?? "");

    expect((await store.refreshWorkflows()).map((workflow) => workflow.id)).toEqual([secondId]);
  });

  it("loads a workflow by immutable ID", async () => {
    store.addMachine("furnace");
    const id = store.activeWorkflowId;
    await store.flushPersistence();
    await store.newWorkflow();
    await store.flushPersistence();

    expect(await store.loadWorkflow(id ?? "")).toBe(true);
    expect(store.activeWorkflowId).toBe(id);
    expect(store.nodes).toHaveLength(1);
  });

  it("starts with an empty graph", () => {
    expect(store.nodes).toEqual([]);
    expect(store.edges).toEqual([]);
    expect(store.activeWorkflowId).toBeNull();
  });

  it("adds and removes machine nodes", () => {
    const nodeId = store.addMachine("furnace", { x: 100, y: 200 });
    expect(store.nodes[0]).toMatchObject({ id: nodeId, type: "machine" });

    store.removeNode(nodeId);
    expect(store.nodes).toEqual([]);
  });

  it("updates node data and live stats", () => {
    const furnaceId = store.addMachine("furnace", { x: 0, y: 0 });
    const recipe = getRecipe("smelt_iron_scrap");
    if (!recipe) throw new Error("Expected iron scrap recipe");

    store.updateNodeData(furnaceId, {
      recipeId: recipe.id,
      customDurationOverride: 2,
    });

    if (store.nodes[0]?.type !== "machine") throw new Error("Expected machine node");
    expect(store.nodes[0].data.customDurationOverride).toBe(2);
    expect(store.calculationResult.summary.totalPowerDraw).toBeCloseTo(60, 1);
  });
  it("removes recipe-incompatible edges when a recipe changes", () => {
    const furnaceId = store.addMachine("furnace");
    const processorId = store.addMachine("processor");

    store.connect({
      source: furnaceId,
      sourceHandle: "iron_ingot",
      target: processorId,
      targetHandle: "iron_ingot",
    });
    expect(store.edges).toHaveLength(1);

    store.updateNodeData(furnaceId, { recipeId: "smelt_copper_scrap" });

    expect(store.edges).toEqual([]);
  });

  it("allows one matching item connection per input", () => {
    store.connect({
      source: "source-a",
      sourceHandle: "iron_ingot",
      target: "target-a",
      targetHandle: "iron_ingot",
    });
    store.connect({
      source: "source-b",
      sourceHandle: "iron_ingot",
      target: "target-a",
      targetHandle: "iron_ingot",
    });
    store.connect({
      source: "source-a",
      sourceHandle: "copper_ingot",
      target: "target-a",
      targetHandle: "iron_ingot",
    });

    expect(store.edges).toHaveLength(1);
    expect(store.edges[0]).toMatchObject({ source: "source-a", target: "target-a" });
  });
  it("persists connected edges with the active workflow", async () => {
    const furnaceId = store.addMachine("furnace");
    const processorId = store.addMachine("processor");

    store.connect({
      source: furnaceId,
      sourceHandle: "iron_ingot",
      target: processorId,
      targetHandle: "iron_ingot",
    });
    await store.flushPersistence();

    const restoredStore = new MachineryStore();
    await restoredStore.initialize();

    expect(restoredStore.edges).toHaveLength(1);
    expect(restoredStore.edges[0]).toMatchObject({
      source: furnaceId,
      sourceHandle: "iron_ingot",
      target: processorId,
      targetHandle: "iron_ingot",
    });
  });

  it("reports connection validity before creating an edge", () => {
    const connection = {
      source: "source-a",
      sourceHandle: "iron_ingot",
      target: "target-a",
      targetHandle: "iron_ingot",
    };
    expect(store.canConnect(connection)).toBe(true);
    store.connect(connection);
    expect(store.canConnect({ ...connection, source: "source-b" })).toBe(false);
    expect(store.canConnect({ ...connection, sourceHandle: "copper_ingot" })).toBe(false);
  });

  it("exports and imports blueprints", () => {
    store.addMachine("furnace");
    const json = store.exportBlueprint();
    expect(store.importBlueprint(json)).toBe(true);
    expect(store.nodes).toHaveLength(1);
  });

  it("switches to the newest remaining workflow after deleting active", async () => {
    store.addMachine("furnace");
    const firstId = store.activeWorkflowId;
    await store.flushPersistence();
    await store.newWorkflow();
    store.addMachine("processor");
    const secondId = store.activeWorkflowId;
    await store.flushPersistence();

    await store.deleteWorkflow(secondId ?? "");

    expect(store.activeWorkflowId).toBe(firstId);
    if (store.nodes[0]?.type !== "machine") throw new Error("Expected machine node");
    expect(store.nodes[0].data.machineType).toBe("furnace");
  });

  it("creates an empty workflow when deleting the last workflow", async () => {
    store.addMachine("furnace");
    const id = store.activeWorkflowId;
    await store.flushPersistence();

    await store.deleteWorkflow(id ?? "");

    expect(store.activeWorkflowId).toMatch(/^wf-/);
    expect(store.nodes).toEqual([]);
    expect(await store.refreshWorkflows()).toHaveLength(1);
  });

  it("reuses an existing empty workflow when new is repeated", async () => {
    store.addMachine("furnace");
    await store.flushPersistence();
    await store.newWorkflow();
    await store.flushPersistence();
    const emptyId = store.activeWorkflowId;

    await store.newWorkflow();
    await store.flushPersistence();

    expect(store.activeWorkflowId).toBe(emptyId);
    expect(await store.refreshWorkflows()).toHaveLength(2);
  });

  it("creates a new workflow when the empty workflow is renamed", async () => {
    store.addMachine("furnace");
    await store.flushPersistence();
    await store.newWorkflow();
    await store.flushPersistence();
    const firstEmptyId = store.activeWorkflowId;

    store.renameWorkflow("Planned Project");
    await store.flushPersistence();
    await store.newWorkflow();
    await store.flushPersistence();

    expect(store.activeWorkflowId).not.toBe(firstEmptyId);
    expect(store.activeWorkflowName).toBe("Untitled Workflow");
    expect(await store.refreshWorkflows()).toHaveLength(3);
  });
});
