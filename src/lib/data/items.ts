export interface ItemDefinition {
  id: string;
  name: string;
  imageUrl?: string;
}

export const REPOSITORY_ITEMS: ItemDefinition[] = [
  {
    id: "scrap_metal",
    name: "Scrap Metal",
  },
  {
    id: "rubber",
    name: "Rubber",
  },
  {
    id: "iron_ore",
    name: "Iron Ore",
  },
  {
    id: "copper_ore",
    name: "Copper Ore",
  },
  {
    id: "iron_ingot",
    name: "Iron Ingot",
  },
  {
    id: "copper_ingot",
    name: "Copper Ingot",
  },
  {
    id: "iron_plate",
    name: "Iron Plate",
  },
  {
    id: "copper_wire",
    name: "Copper Wire",
  },
  {
    id: "circuit_board",
    name: "Circuit Board",
  },
  {
    id: "reinforced_frame",
    name: "Reinforced Frame",
  },
];

const ITEMS_BY_ID: Record<string, ItemDefinition> = Object.fromEntries(
  REPOSITORY_ITEMS.map((item) => [item.id, item]),
);

export function getItem(id: string): ItemDefinition | undefined {
  return ITEMS_BY_ID[id];
}
