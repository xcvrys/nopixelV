import { describe, it, expect } from "vitest";
import { REPOSITORY_ITEMS, getItem } from "../../src/lib/data/items";
import { STARTER_RECIPES, getRecipesForMachine } from "../../src/lib/data/recipes";
import { getMachine } from "../../src/lib/data/machines";

describe("Starter Data Catalog", () => {
  it("defines items with valid IDs and names", () => {
    expect(REPOSITORY_ITEMS.length).toBeGreaterThanOrEqual(6);
    for (const item of REPOSITORY_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.imageUrl === undefined || typeof item.imageUrl === "string").toBe(true);
    }
  });

  it("retrieves items by ID", () => {
    const scrap = getItem("scrap_metal");
    expect(scrap).toBeDefined();
    expect(scrap?.name).toBe("Scrap Metal");
  });

  it("ensures all recipe inputs and outputs reference valid items", () => {
    const itemIds = new Set(REPOSITORY_ITEMS.map((i) => i.id));

    for (const recipe of STARTER_RECIPES) {
      expect(recipe.duration).toBeGreaterThan(0);
      expect(recipe.inputs.length).toBeGreaterThanOrEqual(1);
      expect(recipe.outputs.length).toBeGreaterThanOrEqual(1);

      for (const input of recipe.inputs) {
        expect(itemIds.has(input.itemId)).toBe(true);
        expect(input.amount).toBeGreaterThan(0);
      }

      for (const output of recipe.outputs) {
        expect(itemIds.has(output.itemId)).toBe(true);
        expect(output.amount).toBeGreaterThan(0);
      }
    }
  });

  it("filters recipes by machine type", () => {
    const furnaceRecipes = getRecipesForMachine("furnace");
    expect(furnaceRecipes.length).toBeGreaterThanOrEqual(2);
    expect(furnaceRecipes.every((r) => r.machineType === "furnace")).toBe(true);
  });

  it("defines valid machine categories and sockets", () => {
    const furnace = getMachine("furnace");
    expect(furnace).toBeDefined();
    expect(furnace?.name).toBe("Furnace");
    expect(furnace?.type).toBe("furnace");

    const processor = getMachine("processor");
    expect(processor).toBeDefined();
    expect(processor?.type).toBe("processor");
  });
});
