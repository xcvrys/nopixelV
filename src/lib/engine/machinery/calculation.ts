import { evaluateProductionNetwork } from "../calculator";
import { getRecipe } from "$lib/data/recipes";
import type { MachineryCalculation, MachineryEdge, MachineryNode } from "./types";

export function calculateMachinery(
  nodes: MachineryNode[],
  edges: MachineryEdge[],
): MachineryCalculation {
  return evaluateProductionNetwork(
    nodes.map((node) => ({
      id: node.id,
      type: node.data.machineType,
      name: node.data.name,
      recipe: node.data.recipeId ? (getRecipe(node.data.recipeId) ?? null) : null,
      customDurationOverride: node.data.customDurationOverride,
      powerCostOverride: node.data.powerCostOverride,
    })),
    edges.map((edge) => ({
      id: edge.id,
      sourceNodeId: edge.source,
      sourceHandle: edge.sourceHandle ?? "",
      targetNodeId: edge.target,
      targetHandle: edge.targetHandle ?? "",
    })),
  );
}
