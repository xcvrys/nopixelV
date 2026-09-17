import { beforeEach, describe, expect, it } from "vitest";
import { getRecipe } from "../../src/lib/data/recipes";
import { MachineryStore } from "../../src/lib/stores/machinery.svelte";

describe("MachineryStore", () => {
  let store: MachineryStore;

  beforeEach(async () => {
    store = new MachineryStore();
    await store.clearSavedWorkflows();
  });

  it("saves, loads, lists, and deletes a workflow", async () => {
    store.clearCanvas();
    store.addMachine("furnace", { x: 0, y: 0 });

    const id = await store.saveWorkflowToDb("Iron Smelting Line");
    const loadedStore = new MachineryStore();

    expect(await loadedStore.loadWorkflowFromDb(id)).toBe(true);
    expect(loadedStore.activeWorkflowName).toBe("Iron Smelting Line");
    expect(loadedStore.nodes).toHaveLength(1);
    expect((await store.listSavedWorkflows())[0].id).toBe(id);

    await store.deleteSavedWorkflow(id);
    expect(await store.listSavedWorkflows()).toHaveLength(0);
  });

  it("initializes with a demo layout", () => {
    expect(store.nodes.length).toBeGreaterThan(0);
    expect(store.edges.length).toBeGreaterThan(0);
    expect(store.calculationResult.summary.totalPowerDraw).toBeGreaterThan(0);
  });

  it("allows adding and removing machine nodes", () => {
    store.clearCanvas();
    expect(store.nodes).toHaveLength(0);

    const nodeId = store.addMachine("furnace", { x: 100, y: 200 });
    expect(store.nodes).toHaveLength(1);
    expect(store.nodes[0].id).toBe(nodeId);
    expect(store.nodes[0].type).toBe("machine");
    expect(store.nodes[0].data.machineType).toBe("furnace");

    store.removeNode(nodeId);
    expect(store.nodes).toHaveLength(0);
  });

  it("allows updating node parameters and updates live stats", () => {
    store.clearCanvas();
    const furnaceId = store.addMachine("furnace", { x: 0, y: 0 });
    const recipe = getRecipe("smelt_iron_scrap");
    expect(recipe).toBeDefined();
    if (!recipe) throw new Error("Expected iron scrap recipe");

    store.updateNodeData(furnaceId, {
      recipeId: recipe.id,
      clockSpeed: 150,
    });

    const node = store.nodes.find((n) => n.id === furnaceId);
    expect(node?.data.recipeId).toBe("smelt_iron_scrap");
    expect(node?.data.clockSpeed).toBe(150);

    // With 150% clock speed on 3s recipe, 30 cycles/min -> 60 power
    expect(store.calculationResult.summary.totalPowerDraw).toBeCloseTo(60, 1);
  });

  it("exports and imports blueprint JSON cleanly", () => {
    const json = store.exportBlueprintJson();
    expect(json).toBeTruthy();

    store.clearCanvas();
    expect(store.nodes).toHaveLength(0);

    const success = store.importBlueprintJson(json);
    expect(success).toBe(true);
    expect(store.nodes.length).toBeGreaterThan(0);
  });
});
