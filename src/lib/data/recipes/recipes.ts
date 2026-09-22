import type { RecipeDefinition } from "./types";

export const REPOSITORY_RECIPES: RecipeDefinition[] = [
  {
    id: "nuggets_to_gold",
    name: "Nuggets to Gold",
    allowedMachineClasses: ["furnace"],
    machineType: "furnace",
    durationSeconds: 30,
    powerCost: 0,
    inputs: [{ itemId: "gold_nugget", amount: 3 }],
    outputs: [{ itemId: "gold", amount: 1 }],
  },
  {
    id: "gold_to_bar",
    name: "Gold to Gold Bar",
    allowedMachineClasses: ["furnace"],
    machineType: "furnace",
    durationSeconds: 30,
    powerCost: 0,
    inputs: [{ itemId: "gold", amount: 4 }],
    outputs: [{ itemId: "gold_bar", amount: 1 }],
  },
];
