export type ResourceType = "solid" | "energy";

export interface Port {
  id: string;
  direction: "input" | "output";
  resourceType: ResourceType;
}
