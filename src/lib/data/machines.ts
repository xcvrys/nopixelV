export interface MachineDefinition {
  id: string;
  type: string;
  name: string;
  category: "production" | "logistics";
  iconName: string;
  defaultDuration: number;
  defaultPowerCost: number;
  description: string;
}

export const STARTER_MACHINES: MachineDefinition[] = [
  {
    id: "furnace",
    type: "furnace",
    name: "Smelting Furnace",
    category: "production",
    iconName: "Flame",
    defaultDuration: 3,
    defaultPowerCost: 2,
    description:
      "High-temperature industrial furnace used for smelting scrap metal and crude ores into refined ingots.",
  },
  {
    id: "processor",
    type: "processor",
    name: "Processing Assembler",
    category: "production",
    iconName: "Cpu",
    defaultDuration: 4,
    defaultPowerCost: 4,
    description:
      "Precision machining table for pressing plates, extruding wiring, and assembling high-tech components.",
  },
  {
    id: "splitter",
    type: "splitter",
    name: "Conveyor Splitter",
    category: "logistics",
    iconName: "GitFork",
    defaultDuration: 0,
    defaultPowerCost: 0,
    description:
      "Splits incoming conveyor item streams evenly across multiple outbound conveyor lines.",
  },
  {
    id: "merger",
    type: "merger",
    name: "Conveyor Merger",
    category: "logistics",
    iconName: "GitMerge",
    defaultDuration: 0,
    defaultPowerCost: 0,
    description:
      "Combines multiple incoming conveyor item streams into a single outbound conveyor line.",
  },
  {
    id: "storage",
    type: "storage",
    name: "Depot & Storage Container",
    category: "logistics",
    iconName: "PackageCheck",
    defaultDuration: 0,
    defaultPowerCost: 0,
    description: "Secure storage depot for accumulating finished products or buffering materials.",
  },
];

const MACHINES_BY_TYPE: Record<string, MachineDefinition> = Object.fromEntries(
  STARTER_MACHINES.map((m) => [m.type, m]),
);

export function getMachine(type: string): MachineDefinition | undefined {
  return MACHINES_BY_TYPE[type];
}
