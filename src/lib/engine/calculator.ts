/**
 * Production Calculator Math Engine for NoPixel V Industrial System.
 * Calculates throughput, machine cycles, conveyor edge balances,
 * bottleneck diagnostics, and total power draw.
 */

import type { Recipe } from "$lib/data/types";
import { solveProductionGraph } from "./machinery/solver";
export { solveProductionGraph };

export interface MachineryNode {
  id: string;
  type: string;
  name: string;
  recipe: Recipe | null;
  customDurationOverride?: number;
  powerCostOverride?: number;
  basePowerDrawKW?: number;
}

export interface MachineryEdge {
  id: string;
  sourceNodeId: string;
  sourceHandle: string;
  targetNodeId: string;
  targetHandle: string;
  resourceType?: "solid" | "energy";
}

export interface MachineRateItem {
  itemId: string;
  amountPerMin: number;
}

export interface MachineRateResult {
  effectiveDuration: number;
  cyclesPerMinute: number;
  inputs: MachineRateItem[];
  outputs: MachineRateItem[];
  powerPerMinute: number;
}

export interface MachineStats {
  efficiency: number; // 0 to 1
  rates: MachineRateResult;
  actualOutputs: MachineRateItem[];
}

export interface BottleneckWarning {
  nodeId: string;
  machineName: string;
  itemId: string;
  suppliedRate: number;
  demandedRate: number;
  efficiency: number;
}

export interface ItemFlowTotal {
  itemId: string;
  ratePerMin: number;
}

export interface NetworkSummary {
  rawInputsNeeded: ItemFlowTotal[];
  netOutputsProduced: ItemFlowTotal[];
  totalPowerDraw: number;
}

export interface NetworkCalculationResult {
  machineStats: Record<string, MachineStats>;
  bottlenecks: BottleneckWarning[];
  edgeFlowRates: Record<string, number>;
  summary: NetworkSummary;
}

/**
 * Calculates theoretical 100%-efficiency rates for an individual machine.
 */
export function calculateMachineRates(
  recipe: Recipe,
  durationOverride?: number,
  powerCostOverride?: number,
): MachineRateResult {
  const validDuration =
    durationOverride !== undefined && Number.isFinite(durationOverride) && durationOverride >= 0
      ? durationOverride
      : recipe.duration;
  const effectiveDuration = Math.max(0.001, validDuration);
  const safeDuration = effectiveDuration;
  const cyclesPerMinute = 60 / safeDuration;

  const inputs = recipe.inputs.map((inp) => ({
    itemId: inp.itemId,
    amountPerMin: inp.amount * cyclesPerMinute,
  }));

  const outputs = recipe.outputs.map((out) => ({
    itemId: out.itemId,
    amountPerMin: out.amount * cyclesPerMinute,
  }));

  const unitPower =
    powerCostOverride !== undefined && Number.isFinite(powerCostOverride) && powerCostOverride >= 0
      ? powerCostOverride
      : recipe.powerCost;
  const powerPerMinute = unitPower * cyclesPerMinute;

  return {
    effectiveDuration,
    cyclesPerMinute,
    inputs,
    outputs,
    powerPerMinute,
  };
}

/**
 * Evaluates the entire network through the SCC-aware production solver.
 */
export function evaluateProductionNetwork(
  nodes: MachineryNode[],
  edges: MachineryEdge[],
): NetworkCalculationResult {
  return solveProductionGraph(
    nodes.map((node) => ({
      ...node,
      basePowerDrawKW: node.basePowerDrawKW ?? 0,
    })),
    edges,
  );
}
