export type ItemCategory = "ores" | "craftable" | "fuel";

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  energyValueJoules?: number;
  imageUrl?: string;
}
