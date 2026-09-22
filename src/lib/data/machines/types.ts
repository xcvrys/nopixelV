import type { Port } from "$lib/engine/machinery/schema/port";

export type MachineCategory = "production" | "logistics" | "energy";

export type MachineId =
  | "furnace"
  | "tumbler"
  | "saw"
  | "die_casting"
  | "assembly"
  | "generator"
  | "small_storage"
  | "medium_storage"
  | "large_storage";

export type MachineClass =
  | "furnace"
  | "extruder"
  | "tumbler"
  | "splitter"
  | "saw"
  | "merger"
  | "die_casting"
  | "processor"
  | "assembly"
  | "fabricator"
  | "generator"
  | "storage"
  | "small_storage"
  | "press"
  | "medium_storage"
  | "refinery"
  | "large_storage";
export type MachineType = MachineId | MachineClass;

export interface MachineDefinition {
  id: string;
  machineClass: string;
  name: string;
  category: MachineCategory;
  tier: number;
  ports: Port[];
  basePowerDrawKW: number;
  imageUrl?: string | null;

  /** Legacy machine type used by recipes, graph nodes, and saved blueprints. */
  type: MachineType;
  /** Legacy catalog fields retained until recipe timing is port-based. */
  price: number;
  defaultDuration: number;
  defaultPowerCost: number;
}
