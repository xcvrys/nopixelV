import type { MachineType } from "./machines/types";

export type {
  MachineCategory,
  MachineClass,
  MachineDefinition,
  MachineId,
  MachineType,
} from "./machines/types";
export type { ItemDefinition } from "./items/types";

export interface RecipeItem {
  itemId: string;
  amount: number;
}

export interface Recipe {
  id: string;
  name: string;
  machineType: MachineType;
  imageUrl?: string;
  duration: number;
  powerCost: number;
  inputs: RecipeItem[];
  outputs: RecipeItem[];
}

export type RecipeDefinition = Recipe;
