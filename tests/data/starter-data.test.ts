import { describe, it, expect } from "vitest";
import { REPOSITORY_ITEMS, getItem } from "../../src/lib/data/items";
import { REPOSITORY_PIPES, getPipe } from "../../src/lib/data/pipes";
import {
  REPOSITORY_RECIPES,
  getRecipesForMachine,
  getRecipesForMachineClass,
} from "../../src/lib/data/recipes";
import { REPOSITORY_MACHINES, getMachine, isMachineType } from "../../src/lib/data/machines";

describe("Repository Data Catalog", () => {
  it("defines items with valid IDs and names", () => {
    expect(REPOSITORY_ITEMS).toHaveLength(10);
    for (const item of REPOSITORY_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(["ores", "craftable", "fuel"]).toContain(item.category);
      expect(item.imageUrl === undefined || typeof item.imageUrl === "string").toBe(true);
    }
    expect(getItem("rubber")?.energyValueJoules).toBeGreaterThan(0);
  });

  it("retrieves items by ID", () => {
    const scrap = getItem("scrap_metal");
    expect(scrap).toBeDefined();
    expect(scrap?.name).toBe("Scrap Metal");
  });

  it("defines all authoritative pipes and retrieves them by ID", () => {
    expect(REPOSITORY_PIPES).toHaveLength(7);
    expect(REPOSITORY_PIPES.map((pipe) => pipe.id)).toEqual([
      "basic_pipe_short",
      "basic_pipe_long",
      "basic_pipe_elbow_long",
      "basic_pipe_elbow_short",
      "threeway_pipe_short",
      "threeway_pipe_long",
      "fourway_pipe_short",
    ]);

    for (const pipe of REPOSITORY_PIPES) {
      expect(pipe.name).toBeTruthy();
      expect(["straight", "elbow", "threeway", "fourway"]).toContain(pipe.geometry);
      expect(["short", "long"]).toContain(pipe.length);
      expect(pipe.ports.length).toBeGreaterThanOrEqual(2);
      expect(pipe.ports.every((port) => ["solid", "energy"].includes(port.resourceType))).toBe(
        true,
      );
    }

    expect(getPipe("fourway_pipe_short")?.geometry).toBe("fourway");
  });

  it("ensures all recipe inputs and outputs reference valid items", () => {
    const itemIds = new Set(REPOSITORY_ITEMS.map((i) => i.id));

    for (const recipe of REPOSITORY_RECIPES) {
      expect(recipe.allowedMachineClasses.length).toBeGreaterThan(0);
      expect(recipe.allowedMachineClasses).toContain(recipe.machineType);
      expect(recipe.duration).toBeGreaterThan(0);
      expect(recipe.inputs.length).toBeGreaterThanOrEqual(1);
      expect(recipe.outputs.length).toBeGreaterThanOrEqual(
        recipe.machineType === "fabricator" ? 0 : 1,
      );

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

  it("filters recipes by machine class and legacy machine type", () => {
    const furnaceRecipes = getRecipesForMachineClass("furnace");
    expect(furnaceRecipes.length).toBeGreaterThanOrEqual(2);
    expect(furnaceRecipes.every((recipe) => recipe.allowedMachineClasses.includes("furnace"))).toBe(
      true,
    );

    const assemblyRecipes = getRecipesForMachineClass("assembly");
    expect(assemblyRecipes.length).toBeGreaterThanOrEqual(2);
    expect(
      assemblyRecipes.every((recipe) => recipe.allowedMachineClasses.includes("assembly")),
    ).toBe(true);
    expect(getRecipesForMachine("processor")).toEqual(assemblyRecipes);
    expect(getRecipesForMachine("fabricator")).toEqual(getRecipesForMachineClass("generator"));
  });

  it("defines all authoritative machines and their ports", () => {
    expect(REPOSITORY_MACHINES).toHaveLength(9);
    expect(REPOSITORY_MACHINES.map((machine) => machine.id)).toEqual([
      "furnace",
      "tumbler",
      "saw",
      "die_casting",
      "assembly",
      "generator",
      "small_storage",
      "medium_storage",
      "large_storage",
    ]);

    for (const machine of REPOSITORY_MACHINES) {
      expect(machine.name).toBeTruthy();
      expect(["production", "energy", "logistics"]).toContain(machine.category);
      expect(machine.imageUrl).toMatch(/^\/images\/machines\/.+\.webp$/);
      expect(machine.ports.length).toBeGreaterThanOrEqual(2);
      expect(machine.ports.every((port) => ["solid", "energy"].includes(port.resourceType))).toBe(
        true,
      );
      expect(machine.ports.every((port) => port.id !== "fluid")).toBe(true);
    }

    expect(getMachine("furnace")?.ports.map((port) => port.id)).toEqual(["in_0", "out_0", "power"]);
    expect(getMachine("assembly")?.ports.map((port) => port.id)).toEqual([
      "in_0",
      "in_1",
      "out_0",
      "power",
    ]);
    expect(getMachine("generator")?.ports).toEqual([
      { id: "in_0", direction: "input", resourceType: "solid" },
      { id: "energy", direction: "output", resourceType: "energy" },
    ]);
  });

  it("resolves canonical IDs and legacy machine classes", () => {
    expect(getMachine("assembly")?.type).toBe("processor");
    expect(getMachine("processor")?.id).toBe("assembly");
    expect(getMachine("fabricator")?.id).toBe("generator");
    expect(getMachine("storage")?.id).toBe("small_storage");
    expect(isMachineType("large_storage")).toBe(true);
    expect(isMachineType("refinery")).toBe(true);
    expect(isMachineType("unknown")).toBe(false);
  });
});
