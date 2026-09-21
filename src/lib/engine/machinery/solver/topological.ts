import { getMachine } from "$lib/data/machines";
import {
  calculateMachineRates,
  type BottleneckWarning,
  type MachineRateResult,
  type MachineStats,
  type MachineryEdge,
  type MachineryNode,
  type NetworkCalculationResult,
} from "../../calculator";
import { findStronglyConnectedComponents, type StronglyConnectedComponent } from "./cycles";
import { evaluatePowerGrids } from "./power-grid";

type ProductionEdge = {
  id: string;
  sourceNodeId: string;
  sourceHandle: string;
  targetNodeId: string;
  targetHandle: string;
  sourceItemId: string | undefined;
  targetItemId: string | undefined;
  isPower: boolean;
};
type EdgeIndex = {
  incomingByNodeItem: Map<string, ProductionEdge[]>;
  outgoingByNodeItem: Map<string, ProductionEdge[]>;
};

type ComponentState = {
  component: StronglyConnectedComponent;
  predecessors: number;
  successors: Set<number>;
};

type SolverState = {
  node: MachineryNode;
  rates: MachineRateResult;
  efficiency: number;
  actualOutputs: MachineRateResult["outputs"];
};

const RELAXATION_ITERATIONS = 100;
const RELAXATION_DAMPING = 0.5;
const RELAXATION_EPSILON = 0.000001;

function getRequirementId(
  requirements: Array<{ itemId: string; portId?: string }>,
  handle: string,
  prefix: "in" | "out",
): string | undefined {
  const byPort = requirements.find((requirement) => requirement.portId === handle);
  if (byPort) return byPort.itemId;

  const byItem = requirements.find((requirement) => requirement.itemId === handle);
  if (byItem) return byItem.itemId;

  const indexMatch = new RegExp(`^${prefix}_(\\d+)$`).exec(handle);
  if (indexMatch) return requirements[Number(indexMatch[1])]?.itemId;
  if (requirements.length === 1) return requirements[0].itemId;
  return undefined;
}

function isPowerEdge(edge: MachineryEdge): boolean {
  return (
    edge.resourceType === "energy" ||
    edge.sourceHandle === "energy" ||
    edge.sourceHandle === "power" ||
    edge.targetHandle === "energy" ||
    edge.targetHandle === "power"
  );
}

function toProductionEdge(
  edge: MachineryEdge,
  nodesById: Map<string, MachineryNode>,
): ProductionEdge {
  const source = nodesById.get(edge.sourceNodeId);
  const target = nodesById.get(edge.targetNodeId);
  const sourceHandle = edge.sourceHandle ?? "";
  const targetHandle = edge.targetHandle ?? "";
  const power = isPowerEdge(edge);

  return {
    id: edge.id,
    sourceNodeId: edge.sourceNodeId,
    sourceHandle,
    targetNodeId: edge.targetNodeId,
    targetHandle,
    sourceItemId:
      power || !source?.recipe
        ? undefined
        : getRequirementId(source.recipe.outputs, sourceHandle, "out"),
    targetItemId:
      power || !target?.recipe
        ? undefined
        : getRequirementId(target.recipe.inputs, targetHandle, "in"),
    isPower: power,
  };
}

function getBasePowerDraw(node: MachineryNode): number {
  if (node.basePowerDrawKW !== undefined && Number.isFinite(node.basePowerDrawKW)) {
    return node.basePowerDrawKW;
  }
  return getMachine(node.type)?.basePowerDrawKW ?? 0;
}

function createRates(node: MachineryNode): MachineRateResult {
  if (!node.recipe) {
    return {
      effectiveDuration: 0,
      cyclesPerMinute: 0,
      inputs: [],
      outputs: [],
      powerPerMinute: 0,
    };
  }
  return calculateMachineRates(node.recipe, node.customDurationOverride, node.powerCostOverride);
}

function buildComponents(
  nodeIds: string[],
  edges: ProductionEdge[],
): {
  components: StronglyConnectedComponent[];
  states: ComponentState[];
  componentByNode: Map<string, number>;
} {
  const components = findStronglyConnectedComponents(
    nodeIds,
    edges
      .filter((edge) => !edge.isPower)
      .map((edge) => ({ source: edge.sourceNodeId, target: edge.targetNodeId })),
  );
  const componentByNode = new Map<string, number>();
  components.forEach((component, index) => {
    component.nodeIds.forEach((nodeId) => componentByNode.set(nodeId, index));
  });

  const states = components.map((component) => ({
    component,
    predecessors: 0,
    successors: new Set<number>(),
  }));
  for (const edge of edges) {
    if (edge.isPower) continue;
    const sourceComponent = componentByNode.get(edge.sourceNodeId);
    const targetComponent = componentByNode.get(edge.targetNodeId);
    if (
      sourceComponent === undefined ||
      targetComponent === undefined ||
      sourceComponent === targetComponent
    ) {
      continue;
    }
    const targetState = states[targetComponent];
    if (!states[sourceComponent].successors.has(targetComponent)) {
      states[sourceComponent].successors.add(targetComponent);
      targetState.predecessors += 1;
    }
  }
  return { components, states, componentByNode };
}

function topologicalOrder(states: ComponentState[]): number[] {
  const indegrees = states.map((state) => state.predecessors);
  const ready = states.flatMap((state, index) => (state.predecessors === 0 ? [index] : []));
  const order: number[] = [];

  for (let cursor = 0; cursor < ready.length; cursor += 1) {
    const componentIndex = ready[cursor];
    order.push(componentIndex);
    for (const successor of states[componentIndex].successors) {
      indegrees[successor] -= 1;
      if (indegrees[successor] === 0) ready.push(successor);
    }
  }

  return order;
}

function edgeIndexKey(nodeId: string, itemId: string): string {
  return `${nodeId}:${itemId}`;
}

function buildEdgeIndex(edges: ProductionEdge[]): EdgeIndex {
  const incomingByNodeItem = new Map<string, ProductionEdge[]>();
  const outgoingByNodeItem = new Map<string, ProductionEdge[]>();
  for (const edge of edges) {
    if (edge.isPower || edge.sourceItemId === undefined || edge.targetItemId === undefined)
      continue;
    const incomingKey = edgeIndexKey(edge.targetNodeId, edge.targetItemId);
    const outgoingKey = edgeIndexKey(edge.sourceNodeId, edge.sourceItemId);
    const incoming = incomingByNodeItem.get(incomingKey);
    if (incoming) incoming.push(edge);
    else incomingByNodeItem.set(incomingKey, [edge]);
    const outgoing = outgoingByNodeItem.get(outgoingKey);
    if (outgoing) outgoing.push(edge);
    else outgoingByNodeItem.set(outgoingKey, [edge]);
  }
  return { incomingByNodeItem, outgoingByNodeItem };
}

function getOutgoingEdges(
  index: EdgeIndex,
  sourceNodeId: string,
  sourceItemId: string,
): ProductionEdge[] {
  return index.outgoingByNodeItem.get(edgeIndexKey(sourceNodeId, sourceItemId)) ?? [];
}

function suppliedRate(
  nodeId: string,
  itemId: string,
  edgeIndex: EdgeIndex,
  solverStates: Map<string, SolverState>,
): number {
  let supplied = 0;
  const incoming = edgeIndex.incomingByNodeItem.get(edgeIndexKey(nodeId, itemId)) ?? [];
  for (const edge of incoming) {
    if (edge.sourceItemId === undefined) continue;
    const sourceState = solverStates.get(edge.sourceNodeId);
    if (!sourceState) continue;
    const siblings = getOutgoingEdges(edgeIndex, edge.sourceNodeId, edge.sourceItemId);
    const sourceOutput = sourceState.actualOutputs.find(
      (output) => output.itemId === edge.sourceItemId,
    );
    if (sourceOutput) supplied += sourceOutput.amountPerMin / Math.max(1, siblings.length);
  }
  return supplied;
}

function calculateEfficiency(
  state: SolverState,
  edgeIndex: EdgeIndex,
  solverStates: Map<string, SolverState>,
  powerMultiplier: number,
): number {
  let efficiency = Math.max(0, Math.min(1, powerMultiplier));
  for (const input of state.rates.inputs) {
    const incoming = edgeIndex.incomingByNodeItem.has(edgeIndexKey(state.node.id, input.itemId));
    if (!incoming) continue;
    const supplied = suppliedRate(state.node.id, input.itemId, edgeIndex, solverStates);
    const ratio = input.amountPerMin > 0 ? supplied / input.amountPerMin : 1;
    efficiency = Math.min(efficiency, Math.max(0, ratio));
  }
  return efficiency;
}

function updateOutputs(state: SolverState): void {
  state.actualOutputs = state.rates.outputs.map((output) => ({
    itemId: output.itemId,
    amountPerMin: output.amountPerMin * state.efficiency,
  }));
}

function solveAcyclicComponent(
  component: StronglyConnectedComponent,
  edgeIndex: EdgeIndex,
  solverStates: Map<string, SolverState>,
  powerMultipliers: Record<string, number>,
): void {
  const nodeId = component.nodeIds[0];
  const state = solverStates.get(nodeId);
  if (!state) return;
  state.efficiency =
    state.rates.outputs.length === 0 && !state.node.recipe
      ? 0
      : calculateEfficiency(state, edgeIndex, solverStates, powerMultipliers[nodeId] ?? 1);
  updateOutputs(state);
}

function solveCyclicComponent(
  component: StronglyConnectedComponent,
  edgeIndex: EdgeIndex,
  solverStates: Map<string, SolverState>,
  powerMultipliers: Record<string, number>,
): void {
  for (const nodeId of component.nodeIds) {
    const state = solverStates.get(nodeId);
    if (!state) continue;
    state.efficiency = state.node.recipe
      ? Math.max(0, Math.min(1, powerMultipliers[nodeId] ?? 1))
      : 0;
    updateOutputs(state);
  }

  for (let iteration = 0; iteration < RELAXATION_ITERATIONS; iteration += 1) {
    let largestChange = 0;
    for (const nodeId of component.nodeIds) {
      const state = solverStates.get(nodeId);
      if (!state) continue;
      const candidate = calculateEfficiency(
        state,
        edgeIndex,
        solverStates,
        powerMultipliers[nodeId] ?? 1,
      );
      const nextEfficiency = state.efficiency + RELAXATION_DAMPING * (candidate - state.efficiency);
      largestChange = Math.max(largestChange, Math.abs(nextEfficiency - state.efficiency));
      state.efficiency = nextEfficiency;
      updateOutputs(state);
    }
    if (largestChange < RELAXATION_EPSILON) break;
  }
}

function roundRate(rate: number): number {
  return Number(rate.toFixed(2));
}

function collectResults(
  nodes: MachineryNode[],
  edgeIndex: EdgeIndex,
  solverStates: Map<string, SolverState>,
): NetworkCalculationResult {
  const machineStats: Record<string, MachineStats> = {};
  const bottleneckByKey = new Map<string, BottleneckWarning>();
  const rawInputs = new Map<string, number>();
  const netOutputs = new Map<string, number>();
  const edgeFlowRates: Record<string, number> = {};
  let totalPowerDraw = 0;

  for (const node of nodes) {
    const state = solverStates.get(node.id);
    if (!state) continue;
    machineStats[node.id] = {
      efficiency: state.efficiency,
      rates: state.rates,
      actualOutputs: state.actualOutputs,
    };
    if (!node.recipe) continue;

    totalPowerDraw += state.rates.powerPerMinute * state.efficiency;
    for (const input of state.rates.inputs) {
      const incoming = edgeIndex.incomingByNodeItem.has(edgeIndexKey(node.id, input.itemId));
      if (!incoming) {
        rawInputs.set(
          input.itemId,
          (rawInputs.get(input.itemId) ?? 0) + input.amountPerMin * state.efficiency,
        );
        continue;
      }
      const supplied = suppliedRate(node.id, input.itemId, edgeIndex, solverStates);
      const ratio = input.amountPerMin > 0 ? supplied / input.amountPerMin : 1;
      if (ratio < 0.99) {
        const key = `${node.id}:${input.itemId}`;
        bottleneckByKey.set(key, {
          nodeId: node.id,
          machineName: node.name,
          itemId: input.itemId,
          suppliedRate: roundRate(supplied),
          demandedRate: roundRate(input.amountPerMin),
          efficiency: Number(state.efficiency.toFixed(3)),
        });
      }
    }

    for (const output of state.actualOutputs) {
      const outgoing = getOutgoingEdges(edgeIndex, node.id, output.itemId);
      if (outgoing.length === 0) {
        netOutputs.set(output.itemId, (netOutputs.get(output.itemId) ?? 0) + output.amountPerMin);
      }
      for (const edge of outgoing) edgeFlowRates[edge.id] = output.amountPerMin / outgoing.length;
    }
  }

  return {
    machineStats,
    bottlenecks: [...bottleneckByKey.values()],
    edgeFlowRates,
    summary: {
      rawInputsNeeded: [...rawInputs.entries()].map(([itemId, ratePerMin]) => ({
        itemId,
        ratePerMin: roundRate(ratePerMin),
      })),
      netOutputsProduced: [...netOutputs.entries()].map(([itemId, ratePerMin]) => ({
        itemId,
        ratePerMin: roundRate(ratePerMin),
      })),
      totalPowerDraw: roundRate(totalPowerDraw),
    },
  };
}

export function solveProductionGraph(
  nodes: MachineryNode[],
  edges: MachineryEdge[],
): NetworkCalculationResult {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const productionEdges = edges.map((edge) => toProductionEdge(edge, nodesById));
  const edgeIndex = buildEdgeIndex(productionEdges);
  const solverStates = new Map<string, SolverState>();

  for (const node of nodes) {
    const rates = createRates(node);
    solverStates.set(node.id, {
      node,
      rates,
      efficiency: node.recipe ? 1 : 0,
      actualOutputs: rates.outputs.map((output) => ({ ...output })),
    });
  }

  const powerEvaluation = evaluatePowerGrids(
    nodes.map((node) => ({
      id: node.id,
      basePowerDrawKW: getBasePowerDraw(node),
      powerCostOverride: node.powerCostOverride,
    })),
    edges.map((edge) => ({
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      resourceType: edge.resourceType,
    })),
  );
  const { components, states } = buildComponents(
    nodes.map((node) => node.id),
    productionEdges,
  );
  const order = topologicalOrder(states);
  for (const componentIndex of order) {
    const component = components[componentIndex];
    if (component.isCyclic) {
      solveCyclicComponent(
        component,
        edgeIndex,
        solverStates,
        powerEvaluation.nodeEfficiencyMultipliers,
      );
    } else {
      solveAcyclicComponent(
        component,
        edgeIndex,
        solverStates,
        powerEvaluation.nodeEfficiencyMultipliers,
      );
    }
  }

  return collectResults(nodes, edgeIndex, solverStates);
}
