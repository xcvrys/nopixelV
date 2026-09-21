import type { MachineType } from "../machines/types";

export interface RecipePortRequirement {
  portId?: string;
  itemId: string;
  amount: number;
}

export interface RecipeDefinition {
  id: string;
  name: string;
  allowedMachineClasses: string[];
  machineType: MachineType;
  imageUrl?: string;
  duration: number;
  powerCost: number;
  inputs: RecipePortRequirement[];
  outputs: RecipePortRequirement[];
}

export type RecipeItem = RecipePortRequirement;
export type Recipe = RecipeDefinition;
