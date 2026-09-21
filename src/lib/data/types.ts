export type MachineCategory = "production" | "logistics" | "energy";

export interface ItemDefinition {
  id: string;
  name: string;
  imageUrl?: string;
}

export type MachineType =
  | "furnace"
  | "processor"
  | "splitter"
  | "merger"
  | "storage"
  | "refinery"
  | "press"
  | "extruder"
  | "fabricator"
  | "loader"
  | "unloader"
  | "buffer"
  | "sorter"
  | "tank"
  | "controller";

export interface MachineDefinition {
  id: string;
  type: MachineType;
  name: string;
  category: MachineCategory;
  imageUrl: string | null;
  price: number;
  defaultDuration: number;
  defaultPowerCost: number;
}

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
