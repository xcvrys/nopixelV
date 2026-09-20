import { getMachine } from "$lib/data/machines";
import { getRecipe, getRecipesForMachine } from "$lib/data/recipes";
import type {
  ConnectionInput,
  GraphState,
  MachineryEdge,
  MachineryNode,
  MachineNodeData,
  Position,
} from "./types";

function isOptionalString(value: unknown): value is string | null | undefined {
  return value == null || typeof value === "string";
}
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPosition(value: unknown): value is Position {
  if (typeof value !== "object" || value === null) return false;

  return "x" in value && isFiniteNumber(value.x) && "y" in value && isFiniteNumber(value.y);
}

function isMachineNodeData(value: unknown): value is MachineNodeData {
  if (typeof value !== "object" || value === null) return false;

  return (
    "machineType" in value &&
    typeof value.machineType === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "recipeId" in value &&
    isOptionalString(value.recipeId)
  );
}

export function createMachineNode(
  machineType: string,
  position: Position = { x: 200, y: 200 },
  index = 0,
): MachineryNode {
  const recipeId =
    machineType === "furnace"
      ? "smelt_iron_scrap"
      : machineType === "processor"
        ? "craft_circuit_board"
        : null;

  return {
    id: `machine-${crypto.randomUUID()}`,
    type: "machine",
    position: { ...position },
    data: {
      machineType,
      name: `${getMachine(machineType)?.name ?? "Machine"} #${index + 1}`,
      recipeId,
      showImage: true,
    },
  };
}

export function updateNodeData(
  nodes: MachineryNode[],
  id: string,
  updates: Partial<MachineNodeData>,
): MachineryNode[] {
  return nodes.map((node) =>
    node.id === id ? { ...node, data: { ...node.data, ...updates } } : node,
  );
}

export function removeNode(nodes: MachineryNode[], edges: MachineryEdge[], id: string): GraphState {
  return {
    nodes: nodes.filter((node) => node.id !== id),
    edges: edges.filter((edge) => edge.source !== id && edge.target !== id),
  };
}
export function canConnect(edges: MachineryEdge[], connection: ConnectionInput): boolean {
  const sourceOccupied = edges.some(
    (edge) => edge.source === connection.source && edge.sourceHandle === connection.sourceHandle,
  );
  const targetOccupied = edges.some(
    (edge) => edge.target === connection.target && edge.targetHandle === connection.targetHandle,
  );

  return (
    connection.source !== connection.target &&
    connection.sourceHandle === connection.targetHandle &&
    !sourceOccupied &&
    !targetOccupied &&
    !hasPath(edges, connection.target, connection.source)
  );
}

function hasPath(edges: MachineryEdge[], start: string, target: string): boolean {
  const visited = new Set<string>();
  const pending = [start];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    if (current === target) return true;
    visited.add(current);
    for (const edge of edges) {
      if (edge.source === current) pending.push(edge.target);
    }
  }
  return false;
}

export function connectEdge(edges: MachineryEdge[], connection: ConnectionInput): MachineryEdge[] {
  if (!canConnect(edges, connection)) return edges;
  return [
    ...edges,
    {
      id: `edge-${crypto.randomUUID()}`,
      ...connection,
      animated: true,
    },
  ];
}

export function removeEdge(edges: MachineryEdge[], id: string): MachineryEdge[] {
  return edges.filter((edge) => edge.id !== id);
}

export function isMachineryNode(value: unknown): value is MachineryNode {
  if (typeof value !== "object" || value === null) return false;
  if (!("id" in value) || typeof value.id !== "string") return false;
  if (!("type" in value) || value.type !== "machine") return false;
  if (!("position" in value) || !isPosition(value.position)) return false;
  if (!("data" in value) || !isMachineNodeData(value.data)) return false;

  return true;
}

export function isMachineryEdge(value: unknown): value is MachineryEdge {
  if (typeof value !== "object" || value === null) return false;
  if (!("id" in value) || typeof value.id !== "string") return false;
  if (!("source" in value) || typeof value.source !== "string") return false;
  if (!("target" in value) || typeof value.target !== "string") return false;

  return (
    (!("sourceHandle" in value) || isOptionalString(value.sourceHandle)) &&
    (!("targetHandle" in value) || isOptionalString(value.targetHandle))
  );
}

export function sanitizeEdges(nodes: MachineryNode[], edges: MachineryEdge[]): MachineryEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sourceHandles = new Set<string>();
  const targetHandles = new Set<string>();
  const edgeIds = new Set<string>();
  const validEdges: MachineryEdge[] = [];

  for (const edge of edges) {
    const sourceRecipe = nodeById.get(edge.source)?.data.recipeId;
    const targetRecipe = nodeById.get(edge.target)?.data.recipeId;
    const sourceHandlesForRecipe = sourceRecipe ? getMachineOutputIds(sourceRecipe) : [];
    const targetHandlesForRecipe = targetRecipe ? getMachineInputIds(targetRecipe) : [];
    const sourceKey = `${edge.source}:${edge.sourceHandle ?? ""}`;
    const targetKey = `${edge.target}:${edge.targetHandle ?? ""}`;

    if (
      !edge.id ||
      edgeIds.has(edge.id) ||
      edge.source === edge.target ||
      !nodeById.has(edge.source) ||
      !nodeById.has(edge.target) ||
      !edge.sourceHandle ||
      !edge.targetHandle ||
      edge.sourceHandle !== edge.targetHandle ||
      !sourceHandlesForRecipe.includes(edge.sourceHandle) ||
      !targetHandlesForRecipe.includes(edge.targetHandle) ||
      sourceHandles.has(sourceKey) ||
      targetHandles.has(targetKey) ||
      hasPath([...validEdges, edge], edge.target, edge.source)
    ) {
      continue;
    }

    validEdges.push(edge);
    edgeIds.add(edge.id);
    sourceHandles.add(sourceKey);
    targetHandles.add(targetKey);
  }

  return validEdges;
}

export function isValidMachineryGraph(nodes: MachineryNode[], edges: MachineryEdge[]): boolean {
  const nodeIds = new Set<string>();
  const sourceHandles = new Set<string>();
  const targetHandles = new Set<string>();

  for (const node of nodes) {
    if (nodeIds.has(node.id) || !node.id || !getMachine(node.data.machineType)) return false;
    nodeIds.add(node.id);

    const recipes = getRecipesForMachine(node.data.machineType);
    if (
      (node.data.recipeId !== null &&
        !recipes.some((recipe) => recipe.id === node.data.recipeId)) ||
      (node.data.showImage !== undefined && typeof node.data.showImage !== "boolean") ||
      (node.data.customDurationOverride !== undefined &&
        (!isFiniteNumber(node.data.customDurationOverride) ||
          node.data.customDurationOverride < 0)) ||
      (node.data.powerCostOverride !== undefined &&
        (!isFiniteNumber(node.data.powerCostOverride) || node.data.powerCostOverride < 0))
    ) {
      return false;
    }
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeIds = new Set<string>();
  for (const edge of edges) {
    if (
      !edge.id ||
      edgeIds.has(edge.id) ||
      edge.source === edge.target ||
      !nodeById.has(edge.source) ||
      !edge.sourceHandle ||
      !edge.targetHandle ||
      edge.sourceHandle !== edge.targetHandle
    ) {
      return false;
    }

    const sourceRecipe = nodeById.get(edge.source)?.data.recipeId;
    const targetRecipe = nodeById.get(edge.target)?.data.recipeId;
    const source = sourceRecipe ? getMachineOutputIds(sourceRecipe) : [];
    const target = targetRecipe ? getMachineInputIds(targetRecipe) : [];
    if (!source.includes(edge.sourceHandle) || !target.includes(edge.targetHandle)) return false;

    const sourceKey = `${edge.source}:${edge.sourceHandle}`;
    const targetKey = `${edge.target}:${edge.targetHandle}`;
    if (sourceHandles.has(sourceKey) || targetHandles.has(targetKey)) return false;
    sourceHandles.add(sourceKey);
    targetHandles.add(targetKey);
    edgeIds.add(edge.id);
  }

  return !edges.some((edge) => hasPath(edges, edge.target, edge.source));
}

function getMachineInputIds(recipeId: string): string[] {
  return getRecipe(recipeId)?.inputs.map((input) => input.itemId) ?? [];
}

function getMachineOutputIds(recipeId: string): string[] {
  return getRecipe(recipeId)?.outputs.map((output) => output.itemId) ?? [];
}
