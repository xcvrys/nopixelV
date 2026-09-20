export const MACHINE_CATEGORIES = {
  production: "Production",
  logistics: "Logistics",
} as const satisfies Record<string, string>;

export type MachineCategory = keyof typeof MACHINE_CATEGORIES;
export const MACHINE_CATEGORY_ORDER: MachineCategory[] = ["production", "logistics"];

export interface MachineDefinition {
  id: string;
  type: string;
  name: string;
  category: MachineCategory;
  imageUrl: string;
  price: number;
  defaultDuration: number;
  defaultPowerCost: number;
}

const machineImage = (type: string): string =>
  `https://picsum.photos/seed/nopixel-machine-${type}/640/640`;

export const STARTER_MACHINES: MachineDefinition[] = [
  {
    id: "furnace",
    type: "furnace",
    name: "Smelting Furnace",
    category: "production",
    imageUrl: machineImage("furnace"),
    price: 120000,
    defaultDuration: 3,
    defaultPowerCost: 2,
  },
  {
    id: "processor",
    type: "processor",
    name: "Processing Assembler",
    category: "production",
    imageUrl: machineImage("processor"),
    price: 180000,
    defaultDuration: 4,
    defaultPowerCost: 4,
  },
  {
    id: "splitter",
    type: "splitter",
    name: "Conveyor Splitter",
    category: "logistics",
    imageUrl: machineImage("splitter"),
    price: 8000,
    defaultDuration: 0,
    defaultPowerCost: 0,
  },
  {
    id: "merger",
    type: "merger",
    name: "Conveyor Merger",
    category: "logistics",
    imageUrl: machineImage("merger"),
    price: 80000,
    defaultDuration: 0,
    defaultPowerCost: 0,
  },
  {
    id: "storage",
    type: "storage",
    name: "Depot & Storage Container",
    category: "logistics",
    imageUrl: machineImage("storage"),
    price: 60000,
    defaultDuration: 0,
    defaultPowerCost: 0,
  },
  {
    id: "refinery",
    type: "refinery",
    name: "Chemical Refinery",
    category: "production",
    imageUrl: machineImage("refinery"),
    price: 240000,
    defaultDuration: 6,
    defaultPowerCost: 8,
  },
  {
    id: "press",
    type: "press",
    name: "Hydraulic Press",
    category: "production",
    imageUrl: machineImage("press"),
    price: 95000,
    defaultDuration: 5,
    defaultPowerCost: 5,
  },
  {
    id: "extruder",
    type: "extruder",
    name: "Wire Extruder",
    category: "production",
    imageUrl: machineImage("extruder"),
    price: 135000,
    defaultDuration: 4,
    defaultPowerCost: 6,
  },
  {
    id: "fabricator",
    type: "fabricator",
    name: "Parts Fabricator",
    category: "production",
    imageUrl: machineImage("fabricator"),
    price: 210000,
    defaultDuration: 7,
    defaultPowerCost: 9,
  },
  {
    id: "crusher",
    type: "crusher",
    name: "Ore Crusher",
    category: "production",
    imageUrl: machineImage("crusher"),
    price: 75000,
    defaultDuration: 3,
    defaultPowerCost: 4,
  },
  {
    id: "loader",
    type: "loader",
    name: "Belt Loader",
    category: "logistics",
    imageUrl: machineImage("loader"),
    price: 45000,
    defaultDuration: 0,
    defaultPowerCost: 1,
  },
  {
    id: "unloader",
    type: "unloader",
    name: "Belt Unloader",
    category: "logistics",
    imageUrl: machineImage("unloader"),
    price: 45000,
    defaultDuration: 0,
    defaultPowerCost: 1,
  },
  {
    id: "buffer",
    type: "buffer",
    name: "Material Buffer",
    category: "logistics",
    imageUrl: machineImage("buffer"),
    price: 70000,
    defaultDuration: 0,
    defaultPowerCost: 1,
  },
  {
    id: "sorter",
    type: "sorter",
    name: "Item Sorter",
    category: "logistics",
    imageUrl: machineImage("sorter"),
    price: 85000,
    defaultDuration: 0,
    defaultPowerCost: 2,
  },
  {
    id: "tank",
    type: "tank",
    name: "Fluid Storage Tank",
    category: "logistics",
    imageUrl: machineImage("tank"),
    price: 110000,
    defaultDuration: 0,
    defaultPowerCost: 1,
  },
  {
    id: "controller",
    type: "controller",
    name: "Flow Controller",
    category: "logistics",
    imageUrl: machineImage("controller"),
    price: 125000,
    defaultDuration: 0,
    defaultPowerCost: 3,
  },
];

const MACHINES_BY_TYPE: Record<string, MachineDefinition> = Object.fromEntries(
  STARTER_MACHINES.map((machine) => [machine.type, machine]),
);

export function getMachine(type: string): MachineDefinition | undefined {
  return MACHINES_BY_TYPE[type];
}
