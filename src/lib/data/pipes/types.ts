export type PipeGeometry = "straight" | "elbow" | "threeway" | "fourway";
export type PipeLength = "short" | "long";
export type ResourceType = "solid" | "energy";

export interface Port {
  id: string;
  direction: "input" | "output";
  resourceType: ResourceType;
}

export interface PipeDefinition {
  id: string;
  name: string;
  geometry: PipeGeometry;
  length: PipeLength;
  ports: Port[];
  imageUrl?: string;
}
