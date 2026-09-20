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
  imageUrl: string | null;
  price: number;
  defaultDuration: number;
  defaultPowerCost: number;
}

const localMachineImage = (filename: string): string => `/images/machines/${filename}.webp`;

const placeholderMachineImage = (): null => null;

export const STARTER_MACHINES: MachineDefinition[] = [
  {
    id: "furnace",
    type: "furnace",
    name: "Furnace",
    category: "production",
    imageUrl: localMachineImage("furnace"),
    price: 120000,
    defaultDuration: 3,
    defaultPowerCost: 2,
  },
  {
    id: "processor",
    type: "processor",
    name: "Assembly Machine",
    category: "production",
    imageUrl: localMachineImage("assembly-machine"),
    price: 180000,
    defaultDuration: 4,
    defaultPowerCost: 4,
  },
  {
    id: "splitter",
    type: "splitter",
    name: "Saw Machine",
    category: "production",
    imageUrl: localMachineImage("saw-machine"),
    price: 8000,
    defaultDuration: 0,
    defaultPowerCost: 0,
  },
  {
    id: "merger",
    type: "merger",
    name: "Die Casting Machine",
    category: "production",
    imageUrl: localMachineImage("die-casting-machine"),
    price: 80000,
    defaultDuration: 0,
    defaultPowerCost: 0,
  },
  {
    id: "storage",
    type: "storage",
    name: "Small Storage",
    category: "logistics",
    imageUrl: localMachineImage("small-storage"),
    price: 60000,
    defaultDuration: 0,
    defaultPowerCost: 0,
  },
  {
    id: "refinery",
    type: "refinery",
    name: "Large Storage",
    category: "logistics",
    imageUrl: localMachineImage("large-storage"),
    price: 240000,
    defaultDuration: 6,
    defaultPowerCost: 8,
  },
  {
    id: "press",
    type: "press",
    name: "Medium Storage",
    category: "logistics",
    imageUrl: localMachineImage("medium-storage"),
    price: 95000,
    defaultDuration: 5,
    defaultPowerCost: 5,
  },
  {
    id: "extruder",
    type: "extruder",
    name: "Tumbler Machine",
    category: "production",
    imageUrl: localMachineImage("tumbler-machine"),
    price: 135000,
    defaultDuration: 4,
    defaultPowerCost: 6,
  },
  {
    id: "fabricator",
    type: "fabricator",
    name: "Generator",
    category: "production",
    imageUrl: localMachineImage("generator"),
    price: 210000,
    defaultDuration: 7,
    defaultPowerCost: 9,
  },
  {
    id: "loader",
    type: "loader",
    name: "Belt Loader",
    category: "logistics",
    imageUrl: placeholderMachineImage(),
    price: 45000,
    defaultDuration: 0,
    defaultPowerCost: 1,
  },
  {
    id: "unloader",
    type: "unloader",
    name: "Belt Unloader",
    category: "logistics",
    imageUrl: placeholderMachineImage(),
    price: 45000,
    defaultDuration: 0,
    defaultPowerCost: 1,
  },
  {
    id: "buffer",
    type: "buffer",
    name: "Material Buffer",
    category: "logistics",
    imageUrl: placeholderMachineImage(),
    price: 70000,
    defaultDuration: 0,
    defaultPowerCost: 1,
  },
  {
    id: "sorter",
    type: "sorter",
    name: "Item Sorter",
    category: "logistics",
    imageUrl: placeholderMachineImage(),
    price: 85000,
    defaultDuration: 0,
    defaultPowerCost: 2,
  },
  {
    id: "tank",
    type: "tank",
    name: "Fluid Storage Tank",
    category: "logistics",
    imageUrl: placeholderMachineImage(),
    price: 110000,
    defaultDuration: 0,
    defaultPowerCost: 1,
  },
  {
    id: "controller",
    type: "controller",
    name: "Flow Controller",
    category: "logistics",
    imageUrl: placeholderMachineImage(),
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
