import { addDevelopmentImages, itemImageFallback } from "../development-images";
import { CRAFTABLES } from "./craftable";
import { ORES } from "./ores";
import type { ItemDefinition } from "./types";

const REPOSITORY_ITEMS_BASE: ItemDefinition[] = [...ORES, ...CRAFTABLES];

export const REPOSITORY_ITEMS = addDevelopmentImages(REPOSITORY_ITEMS_BASE, itemImageFallback);

const ITEMS_BY_ID: Record<string, ItemDefinition> = Object.fromEntries(
  REPOSITORY_ITEMS.map((item) => [item.id, item]),
);

export function getItem(id: string): ItemDefinition | undefined {
  return ITEMS_BY_ID[id];
}

export type { ItemCategory, ItemDefinition } from "./types";
export { CRAFTABLES } from "./craftable";
export { ORES } from "./ores";
