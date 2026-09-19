import type { Recipe } from "../engine/calculator";

export type RecipeDefinition = Recipe;

export const STARTER_RECIPES: RecipeDefinition[] = [
  {
    id: "smelt_iron_scrap",
    name: "Smelt Scrap to Iron",
    machineType: "furnace",
    duration: 3,
    powerCost: 2,
    inputs: [{ itemId: "scrap_metal", amount: 2 }],
    outputs: [
      { itemId: "iron_ingot", amount: 1 },
      { itemId: "copper_ingot", amount: 1 },
    ],
  },
  {
    id: "smelt_copper_scrap",
    name: "Smelt Scrap to Copper",
    machineType: "furnace",
    duration: 3,
    powerCost: 2,
    inputs: [{ itemId: "scrap_metal", amount: 2 }],
    outputs: [{ itemId: "copper_ingot", amount: 1 }],
  },
  {
    id: "smelt_iron_ore",
    name: "Smelt Raw Iron Ore",
    machineType: "furnace",
    duration: 2,
    powerCost: 3,
    inputs: [{ itemId: "iron_ore", amount: 1 }],
    outputs: [{ itemId: "iron_ingot", amount: 1 }],
  },
  {
    id: "smelt_copper_ore",
    name: "Smelt Raw Copper Ore",
    machineType: "furnace",
    duration: 2,
    powerCost: 3,
    inputs: [{ itemId: "copper_ore", amount: 1 }],
    outputs: [{ itemId: "copper_ingot", amount: 1 }],
  },
  {
    id: "craft_iron_plate",
    name: "Press Iron Plate",
    machineType: "processor",
    duration: 4,
    powerCost: 4,
    inputs: [
      { itemId: "iron_ingot", amount: 2 },
      { itemId: "copper_wire", amount: 1 },
    ],
    outputs: [{ itemId: "iron_plate", amount: 1 }],
  },
  {
    id: "craft_copper_wire",
    name: "Extrude Copper Wire",
    machineType: "processor",
    duration: 3,
    powerCost: 3,
    inputs: [{ itemId: "copper_ingot", amount: 1 }],
    outputs: [{ itemId: "copper_wire", amount: 2 }],
  },
  {
    id: "craft_circuit_board",
    name: "Assemble Circuit Board",
    machineType: "processor",
    duration: 6,
    powerCost: 6,
    inputs: [
      { itemId: "copper_wire", amount: 2 },
      { itemId: "rubber", amount: 1 },
    ],
    outputs: [{ itemId: "circuit_board", amount: 1 }],
  },
  {
    id: "craft_reinforced_frame",
    name: "Assemble Reinforced Frame",
    machineType: "processor",
    duration: 8,
    powerCost: 8,
    inputs: [
      { itemId: "iron_plate", amount: 3 },
      { itemId: "circuit_board", amount: 2 },
    ],
    outputs: [{ itemId: "reinforced_frame", amount: 1 }],
  },
];

const RECIPES_BY_ID: Record<string, RecipeDefinition> = Object.fromEntries(
  STARTER_RECIPES.map((r) => [r.id, r]),
);

export function getRecipe(id: string): RecipeDefinition | undefined {
  return RECIPES_BY_ID[id];
}

export function getRecipesForMachine(machineType: string): RecipeDefinition[] {
  return STARTER_RECIPES.filter((r) => r.machineType === machineType);
}
