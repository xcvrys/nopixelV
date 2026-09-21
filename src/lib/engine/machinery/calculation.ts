import { getMachine } from "$lib/data/machines";
import { getRecipe } from "$lib/data/recipes";
import { solveProductionGraph } from "./solver";
import type { MachineryCalculation, MachineryEdge, MachineryNode } from "./types";

export function calculateMachinery(
  nodes: MachineryNode[],
  edges: MachineryEdge[],
): MachineryCalculation {
  const solverNodes = nodes.flatMap((node) => {
    if (node.type === "machine") {
      const recipe = node.data.recipeId ? (getRecipe(node.data.recipeId) ?? null) : null;
      return [
        {
          id: node.id,
          type: node.data.machineType,
          name: node.data.name,
          recipe,
          customDurationOverride: node.data.customDurationOverride,
          powerCostOverride: node.data.powerCostOverride,
          basePowerDrawKW: 0,
        },
      ];
    }
    if (node.type === "energy") {
      const recipe = node.data.recipeId ? (getRecipe(node.data.recipeId) ?? null) : null;
      return [
        {
          id: node.id,
          type: "fabricator",
          name: node.data.name,
          recipe,
          basePowerDrawKW: getMachine("fabricator")?.basePowerDrawKW ?? 0,
        },
      ];
    }
    return [];
  });

  return solveProductionGraph(
    solverNodes,
    edges.map((edge) => ({
      id: edge.id,
      sourceNodeId: edge.source,
      sourceHandle: edge.sourceHandle ?? "",
      targetNodeId: edge.target,
      targetHandle: edge.targetHandle ?? "",
      resourceType: edge.resourceType,
    })),
  );
}
