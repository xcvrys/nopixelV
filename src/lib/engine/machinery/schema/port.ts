export type ResourceType = "solid" | "energy";

export interface Port {
  id: string;
  direction: "input" | "output";
  resourceType: ResourceType;
}

export interface PowerEdgeCandidate {
  resourceType?: ResourceType;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export function isPowerEdge(edge: PowerEdgeCandidate): boolean {
  return (
    edge.resourceType === "energy" ||
    edge.sourceHandle === "energy" ||
    edge.sourceHandle === "power" ||
    edge.targetHandle === "energy" ||
    edge.targetHandle === "power"
  );
}
