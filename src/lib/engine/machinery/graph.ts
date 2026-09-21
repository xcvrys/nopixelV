import { getMachine, isMachineType } from "$lib/data/machines";
import type { MachineType } from "$lib/data/types";
import { getRecipe, getRecipesForMachine } from "$lib/data/recipes";
import type {
  ConnectionInput,
  EnergyNodeData,
  GraphState,
  MachineryEdge,
  MachineryNode,
  MachineryNodeDataUpdate,
  MachineNodeData,
  Position,
  TextNode,
} from "./types";

type ResourceType = "solid" | "energy";

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
    isMachineType(value.machineType) &&
    "name" in value &&
    typeof value.name === "string" &&
    "recipeId" in value &&
    isOptionalString(value.recipeId)
  );
}

function isEnergyNodeData(value: unknown): value is EnergyNodeData {
  if (typeof value !== "object" || value === null) return false;
  return (
    "energyType" in value &&
    value.energyType === "generator" &&
    "name" in value &&
    typeof value.name === "string" &&
    (!("recipeId" in value) || isOptionalString(value.recipeId))
  );
}

export function createMachineNode(
  machineType: MachineType,
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

export function createEnergyNode(
  position: Position = { x: 200, y: 200 },
  index = 0,
): MachineryNode {
  return {
    id: `energy-${crypto.randomUUID()}`,
    type: "energy",
    position: { ...position },
    data: {
      energyType: "generator",
      name: `${getMachine("fabricator")?.name ?? "Generator"} #${index + 1}`,
      recipeId: getRecipesForMachine("fabricator")[0]?.id ?? null,
      showImage: true,
    },
  };
}

export function createTextNode(text: string, position: Position = { x: 200, y: 200 }): TextNode {
  return {
    id: `text-${crypto.randomUUID()}`,
    type: "text",
    position: { ...position },
    data: { text },
  };
}

export function updateNodeData(
  nodes: MachineryNode[],
  id: string,
  updates: MachineryNodeDataUpdate,
): MachineryNode[] {
  return nodes.map((node) => {
    if (node.id !== id) return node;
    if (node.type === "machine") return { ...node, data: { ...node.data, ...updates } };
    if (node.type === "energy") return { ...node, data: { ...node.data, ...updates } };
    return node;
  });
}

export function removeNode(nodes: MachineryNode[], edges: MachineryEdge[], id: string): GraphState {
  return {
    nodes: nodes.filter((node) => node.id !== id),
    edges: edges.filter((edge) => edge.source !== id && edge.target !== id),
  };
}

function getHandleResourceType(handle: string): ResourceType {
  if (handle === "energy" || handle === "power") return "energy";
  return "solid";
}

function isSocketHandle(handle: string): boolean {
  return handle === "energy" || handle === "power" || /^(?:in|out)_\d+$/.test(handle);
}

function areConnectionHandlesCompatible(
  sourceHandle: string,
  targetHandle: string,
  resourceType?: ResourceType,
): boolean {
  if (sourceHandle === "power" || /^in_\d+$/.test(sourceHandle)) return false;
  if (targetHandle.startsWith("out_") || targetHandle === "out") return false;

  const sourceResourceType = getHandleResourceType(sourceHandle);
  const targetResourceType = getHandleResourceType(targetHandle);
  if (
    sourceResourceType !== targetResourceType ||
    (resourceType && (sourceResourceType !== resourceType || targetResourceType !== resourceType))
  ) {
    return false;
  }

  return (
    isSocketHandle(sourceHandle) || isSocketHandle(targetHandle) || sourceHandle === targetHandle
  );
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
    areConnectionHandlesCompatible(
      connection.sourceHandle,
      connection.targetHandle,
      connection.resourceType,
    ) &&
    !sourceOccupied &&
    !targetOccupied
  );
}

const POWER_EDGE_CLASS = "power-edge";

function isPowerEdge(
  edge: Pick<MachineryEdge, "sourceHandle" | "targetHandle" | "resourceType">,
): boolean {
  return (
    edge.resourceType === "energy" ||
    edge.sourceHandle === "energy" ||
    edge.targetHandle === "energy"
  );
}

function getEdgeClass(
  edge: Pick<MachineryEdge, "sourceHandle" | "targetHandle" | "resourceType" | "class">,
): string | undefined {
  return isPowerEdge(edge) ? POWER_EDGE_CLASS : edge.class;
}

export function connectEdge(edges: MachineryEdge[], connection: ConnectionInput): MachineryEdge[] {
  if (!canConnect(edges, connection)) return edges;
  return [
    ...edges,
    {
      id: `edge-${crypto.randomUUID()}`,
      ...connection,
      animated: true,
      class: getEdgeClass(connection),
    },
  ];
}

export function removeEdge(edges: MachineryEdge[], id: string): MachineryEdge[] {
  return edges.filter((edge) => edge.id !== id);
}

export function isMachineryNode(value: unknown): value is MachineryNode {
  if (typeof value !== "object" || value === null) return false;
  if (!("id" in value) || typeof value.id !== "string") return false;
  if (!("position" in value) || !isPosition(value.position)) return false;
  if (
    !("type" in value) ||
    (value.type !== "machine" && value.type !== "energy" && value.type !== "text")
  ) {
    return false;
  }
  if (!("data" in value) || typeof value.data !== "object" || value.data === null) return false;
  if (value.type === "machine") return isMachineNodeData(value.data);
  if (value.type === "energy") return isEnergyNodeData(value.data);
  return "text" in value.data && typeof value.data.text === "string";
}

export function isMachineryEdge(value: unknown): value is MachineryEdge {
  if (typeof value !== "object" || value === null) return false;
  if (!("id" in value) || typeof value.id !== "string") return false;
  if (!("source" in value) || typeof value.source !== "string") return false;
  if (!("target" in value) || typeof value.target !== "string") return false;
  return (
    (!("sourceHandle" in value) || isOptionalString(value.sourceHandle)) &&
    (!("targetHandle" in value) || isOptionalString(value.targetHandle)) &&
    (!("resourceType" in value) ||
      value.resourceType === "solid" ||
      value.resourceType === "energy") &&
    (!("flowRate" in value) || isFiniteNumber(value.flowRate))
  );
}

type ActiveHandle = {
  resourceType: ResourceType;
  kind: "item" | "port";
};

type ActiveNodeHandles = {
  source: Map<string, ActiveHandle>;
  target: Map<string, ActiveHandle>;
};

function addActiveHandle(
  handles: Map<string, ActiveHandle>,
  id: string,
  resourceType: ResourceType,
  kind: ActiveHandle["kind"],
): void {
  if (!handles.has(id)) handles.set(id, { resourceType, kind });
}

function getNodeHandles(node: MachineryNode): ActiveNodeHandles {
  const handles: ActiveNodeHandles = { source: new Map(), target: new Map() };
  if (node.type === "text") return handles;

  if (node.type === "energy") {
    addActiveHandle(handles.source, "energy", "energy", "port");
    for (const input of getRecipe(node.data.recipeId ?? "")?.inputs ?? []) {
      addActiveHandle(handles.target, input.itemId, "solid", "item");
      if (input.portId) addActiveHandle(handles.target, input.portId, "solid", "port");
    }
    return handles;
  }

  const machine = getMachine(node.data.machineType);
  for (const port of machine?.ports ?? []) {
    const handleSet = port.direction === "output" ? handles.source : handles.target;
    addActiveHandle(handleSet, port.id, port.resourceType, "port");
  }

  for (const output of getRecipe(node.data.recipeId ?? "")?.outputs ?? []) {
    addActiveHandle(handles.source, output.itemId, "solid", "item");
    if (output.portId) addActiveHandle(handles.source, output.portId, "solid", "port");
  }
  for (const input of getRecipe(node.data.recipeId ?? "")?.inputs ?? []) {
    addActiveHandle(handles.target, input.itemId, "solid", "item");
    if (input.portId) addActiveHandle(handles.target, input.portId, "solid", "port");
  }
  if (requiresPower(node)) addActiveHandle(handles.target, "energy", "energy", "port");
  return handles;
}

function areNodeHandlesCompatible(
  source: ActiveHandle | undefined,
  target: ActiveHandle | undefined,
  sourceHandle: string,
  targetHandle: string,
  resourceType?: ResourceType,
): boolean {
  if (!source || !target || source.resourceType !== target.resourceType) return false;
  if (resourceType && resourceType !== source.resourceType) return false;
  return source.kind === "port" || target.kind === "port" || sourceHandle === targetHandle;
}

function requiresPower(node: Extract<MachineryNode, { type: "machine" }>): boolean {
  const machinePower = getMachine(node.data.machineType)?.defaultPowerCost ?? 0;
  const recipePower = node.data.recipeId ? (getRecipe(node.data.recipeId)?.powerCost ?? 0) : 0;
  return Math.max(machinePower, recipePower) > 0;
}

function areNodesAndHandlesCompatible(
  sourceNode: MachineryNode | undefined,
  targetNode: MachineryNode | undefined,
  edge: Pick<MachineryEdge, "sourceHandle" | "targetHandle" | "resourceType">,
  handlesByNode: Map<string, ActiveNodeHandles>,
): boolean {
  if (!sourceNode || !targetNode || !edge.sourceHandle || !edge.targetHandle) return false;
  return areNodeHandlesCompatible(
    handlesByNode.get(sourceNode.id)?.source.get(edge.sourceHandle),
    handlesByNode.get(targetNode.id)?.target.get(edge.targetHandle),
    edge.sourceHandle,
    edge.targetHandle,
    edge.resourceType,
  );
}

export function sanitizeEdges(nodes: MachineryNode[], edges: MachineryEdge[]): MachineryEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const handlesByNode = new Map(nodes.map((node) => [node.id, getNodeHandles(node)]));
  const sourceHandles = new Set<string>();
  const targetHandles = new Set<string>();
  const edgeIds = new Set<string>();
  const validEdges: MachineryEdge[] = [];

  for (const edge of edges) {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    const sourceKey = `${edge.source}:${edge.sourceHandle ?? ""}`;
    const targetKey = `${edge.target}:${edge.targetHandle ?? ""}`;

    if (
      !isMachineryEdge(edge) ||
      !edge.id ||
      edgeIds.has(edge.id) ||
      edge.source === edge.target ||
      !areNodesAndHandlesCompatible(sourceNode, targetNode, edge, handlesByNode) ||
      sourceHandles.has(sourceKey) ||
      targetHandles.has(targetKey)
    ) {
      continue;
    }

    validEdges.push({ ...edge, animated: true, class: getEdgeClass(edge) });
    edgeIds.add(edge.id);
    sourceHandles.add(sourceKey);
    targetHandles.add(targetKey);
  }
  return validEdges;
}

export function isValidMachineryGraph(nodes: MachineryNode[], edges: MachineryEdge[]): boolean {
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (nodeIds.has(node.id) || !node.id || !isMachineryNode(node)) return false;
    nodeIds.add(node.id);
    if (node.type === "text") {
      if (!node.data.text.trim()) return false;
      continue;
    }
    if (node.type === "energy") {
      if (node.data.energyType !== "generator" || typeof node.data.name !== "string") return false;
      continue;
    }

    if (!getMachine(node.data.machineType)) return false;
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
  const handlesByNode = new Map(nodes.map((node) => [node.id, getNodeHandles(node)]));
  const edgeIds = new Set<string>();
  const sourceHandles = new Set<string>();
  const targetHandles = new Set<string>();
  for (const edge of edges) {
    if (
      !isMachineryEdge(edge) ||
      !edge.id ||
      edgeIds.has(edge.id) ||
      edge.source === edge.target ||
      !areNodesAndHandlesCompatible(
        nodeById.get(edge.source),
        nodeById.get(edge.target),
        edge,
        handlesByNode,
      )
    ) {
      return false;
    }

    const sourceKey = `${edge.source}:${edge.sourceHandle}`;
    const targetKey = `${edge.target}:${edge.targetHandle}`;
    if (sourceHandles.has(sourceKey) || targetHandles.has(targetKey)) return false;
    sourceHandles.add(sourceKey);
    targetHandles.add(targetKey);
    edgeIds.add(edge.id);
  }

  return true;
}
