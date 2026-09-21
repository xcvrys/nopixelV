import type { MachineCategory, MachineDefinition, MachineType } from "./types";
import { REPOSITORY_MACHINES } from "./definitions";

export type {
  MachineCategory,
  MachineClass,
  MachineDefinition,
  MachineId,
  MachineType,
} from "./types";
export { REPOSITORY_MACHINES } from "./definitions";

export const MACHINE_CATEGORIES = {
  production: "Production",
  logistics: "Logistics",
  energy: "Energy",
} as const satisfies Record<MachineCategory, string>;

export const MACHINE_CATEGORY_ORDER: MachineCategory[] = ["production", "energy", "logistics"];

const MACHINES_BY_TYPE: Record<string, MachineDefinition> = Object.fromEntries(
  REPOSITORY_MACHINES.flatMap((machine) => [
    [machine.id, machine],
    [machine.machineClass, machine],
    [machine.type, machine],
  ]),
);

export function getMachine(typeOrClass: string): MachineDefinition | undefined {
  return MACHINES_BY_TYPE[typeOrClass];
}

export function isMachineType(value: string): value is MachineType {
  return Object.hasOwn(MACHINES_BY_TYPE, value);
}
