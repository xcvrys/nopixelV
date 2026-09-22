import { isMachineryEdge, isMachineryNode, isValidMachineryGraph } from "./graph";
import type { Blueprint, BlueprintImportResult, MachineryEdge, MachineryNode } from "./types";

export function exportBlueprint(
  name: string,
  nodes: MachineryNode[],
  edges: MachineryEdge[],
): string {
  const blueprint: Blueprint = {
    version: 1,
    name,
    exportedAt: Date.now(),
    nodes,
    edges,
  };
  return JSON.stringify(blueprint, null, 2);
}

export function importBlueprint(json: string): BlueprintImportResult {
  try {
    const value: unknown = JSON.parse(json);
    if (typeof value !== "object" || value === null) return { ok: false };
    if (!("nodes" in value) || !Array.isArray(value.nodes)) return { ok: false };
    if (!("edges" in value) || !Array.isArray(value.edges)) return { ok: false };
    if (
      !value.nodes.every(isMachineryNode) ||
      !value.edges.every(isMachineryEdge) ||
      !isValidMachineryGraph(value.nodes, value.edges)
    ) {
      return { ok: false };
    }

    return {
      ok: true,
      name: "name" in value && typeof value.name === "string" ? value.name : "Untitled Workflow",
      nodes: structuredClone(value.nodes),
      edges: structuredClone(value.edges),
    };
  } catch {
    return { ok: false };
  }
}
