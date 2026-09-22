import { isPowerEdge } from "../schema/port";

export interface PowerGridSubnet {
  id: number;
  nodeIds: string[];
  totalGenerationKW: number;
  totalDemandKW: number;
  satisfactionRatio: number;
}

export interface PowerGridEvaluation {
  subnets: PowerGridSubnet[];
  nodeEfficiencyMultipliers: Record<string, number>;
  totalGenerationKW: number;
  totalDemandKW: number;
}

type PowerGridNode = {
  id: string;
  basePowerDrawKW: number;
  powerCostOverride?: number;
};

type PowerGridEdge = {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  resourceType?: "solid" | "energy";
};

class DisjointSet {
  private readonly parents: number[];
  private readonly ranks: number[];

  constructor(size: number) {
    this.parents = Array.from({ length: size }, (_, index) => index);
    this.ranks = Array.from({ length: size }, () => 0);
  }

  find(value: number): number {
    const parent = this.parents[value];
    if (parent === value) return value;
    const root = this.find(parent);
    this.parents[value] = root;
    return root;
  }

  union(first: number, second: number): void {
    let firstRoot = this.find(first);
    let secondRoot = this.find(second);
    if (firstRoot === secondRoot) return;

    if (this.ranks[firstRoot] < this.ranks[secondRoot]) {
      [firstRoot, secondRoot] = [secondRoot, firstRoot];
    }
    this.parents[secondRoot] = firstRoot;
    if (this.ranks[firstRoot] === this.ranks[secondRoot]) this.ranks[firstRoot] += 1;
  }
}

function getPowerDraw(node: PowerGridNode): number {
  const basePowerDraw = Number.isFinite(node.basePowerDrawKW) ? node.basePowerDrawKW : 0;
  if (basePowerDraw === 0) return 0;

  const override = node.powerCostOverride;
  if (override === undefined || !Number.isFinite(override) || override < 0) {
    return basePowerDraw;
  }

  return Math.sign(basePowerDraw) * override;
}

export function evaluatePowerGrids(
  nodes: PowerGridNode[],
  edges: PowerGridEdge[],
): PowerGridEvaluation {
  const nodeIndexById = new Map<string, number>();
  for (let index = 0; index < nodes.length; index += 1) {
    nodeIndexById.set(nodes[index].id, index);
  }

  const disjointSet = new DisjointSet(nodes.length);
  for (const edge of edges) {
    if (!isPowerEdge(edge)) continue;
    const sourceIndex = nodeIndexById.get(edge.source);
    const targetIndex = nodeIndexById.get(edge.target);
    if (sourceIndex === undefined || targetIndex === undefined) continue;
    disjointSet.union(sourceIndex, targetIndex);
  }

  const nodesByRoot = new Map<number, number[]>();
  for (let index = 0; index < nodes.length; index += 1) {
    const root = disjointSet.find(index);
    const subnetNodes = nodesByRoot.get(root);
    if (subnetNodes) subnetNodes.push(index);
    else nodesByRoot.set(root, [index]);
  }

  const subnets: PowerGridSubnet[] = [];
  const nodeEfficiencyMultipliers: Record<string, number> = {};
  let totalGenerationKW = 0;
  let totalDemandKW = 0;

  for (const subnetNodeIndexes of nodesByRoot.values()) {
    let subnetGenerationKW = 0;
    let subnetDemandKW = 0;
    for (const nodeIndex of subnetNodeIndexes) {
      const draw = getPowerDraw(nodes[nodeIndex]);
      if (draw < 0) subnetGenerationKW -= draw;
      else subnetDemandKW += draw;
    }

    const satisfactionRatio =
      subnetDemandKW > 0 ? Math.min(1, subnetGenerationKW / subnetDemandKW) : 1;
    const nodeIds = subnetNodeIndexes.map((nodeIndex) => nodes[nodeIndex].id);
    for (const nodeIndex of subnetNodeIndexes) {
      nodeEfficiencyMultipliers[nodes[nodeIndex].id] =
        nodes[nodeIndex].basePowerDrawKW === 0 ? 1 : satisfactionRatio;
    }

    subnets.push({
      id: subnets.length,
      nodeIds,
      totalGenerationKW: subnetGenerationKW,
      totalDemandKW: subnetDemandKW,
      satisfactionRatio,
    });
    totalGenerationKW += subnetGenerationKW;
    totalDemandKW += subnetDemandKW;
  }

  return { subnets, nodeEfficiencyMultipliers, totalGenerationKW, totalDemandKW };
}
