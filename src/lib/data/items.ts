export interface ItemDefinition {
  id: string;
  name: string;
  category: "raw" | "processed" | "component";
  color: string; // Hex color for UI badges & conveyor particle traces
  description?: string;
}

export const STARTER_ITEMS: ItemDefinition[] = [
  {
    id: "scrap_metal",
    name: "Scrap Metal",
    category: "raw",
    color: "#94a3b8",
    description: "Salvaged junk and vehicle remnants found around Los Santos.",
  },
  {
    id: "rubber",
    name: "Rubber",
    category: "raw",
    color: "#475569",
    description: "Raw rubber strips harvested from old tires and industrial scrap.",
  },
  {
    id: "iron_ore",
    name: "Iron Ore",
    category: "raw",
    color: "#78716c",
    description: "Crude iron ore mined from quarries or rock piles.",
  },
  {
    id: "copper_ore",
    name: "Copper Ore",
    category: "raw",
    color: "#d97706",
    description: "Raw reddish-brown copper ore.",
  },
  {
    id: "iron_ingot",
    name: "Iron Ingot",
    category: "processed",
    color: "#cbd5e1",
    description: "Smelted iron bar ready for mechanical manufacturing.",
  },
  {
    id: "copper_ingot",
    name: "Copper Ingot",
    category: "processed",
    color: "#f59e0b",
    description: "Purified copper ingot with high electrical conductivity.",
  },
  {
    id: "iron_plate",
    name: "Iron Plate",
    category: "component",
    color: "#64748b",
    description: "Pressed steel armor plating used for safes, drills, and frames.",
  },
  {
    id: "copper_wire",
    name: "Copper Wire",
    category: "component",
    color: "#ea580c",
    description: "Insulated copper wiring for heists, electronics, and power.",
  },
  {
    id: "circuit_board",
    name: "Circuit Board",
    category: "component",
    color: "#10b981",
    description: "Basic electronics board used in thermite, lockpicks, and hacks.",
  },
  {
    id: "reinforced_frame",
    name: "Reinforced Frame",
    category: "component",
    color: "#6366f1",
    description: "Heavy structural frame for large heist machinery and safe reinforcement.",
  },
];

const ITEMS_BY_ID: Record<string, ItemDefinition> = Object.fromEntries(
  STARTER_ITEMS.map((item) => [item.id, item]),
);

export function getItem(id: string): ItemDefinition | undefined {
  return ITEMS_BY_ID[id];
}
