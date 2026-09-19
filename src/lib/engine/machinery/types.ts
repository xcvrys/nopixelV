import type { NetworkCalculationResult } from "../calculator";

export type Position = { x: number; y: number };

export type ConnectionInput = {
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
};

export type MachineNodeData = {
  machineType: string;
  name: string;
  recipeId: string | null;
  showImage?: boolean;
  customDurationOverride?: number;
  powerCostOverride?: number;
};

export type MachineryNode = {
  id: string;
  type: "machine";
  position: Position;
  data: MachineNodeData;
};

export type MachineryEdge = {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
  animated?: boolean;
  style?: string;
};

export type GraphState = {
  nodes: MachineryNode[];
  edges: MachineryEdge[];
};

export type MachineryCalculation = NetworkCalculationResult;

export type Blueprint = {
  version: 1;
  name: string;
  exportedAt: number;
  nodes: MachineryNode[];
  edges: MachineryEdge[];
};

export type BlueprintImportResult =
  | { ok: true; name: string; nodes: MachineryNode[]; edges: MachineryEdge[] }
  | { ok: false };
