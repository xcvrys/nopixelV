export interface StronglyConnectedComponent {
  nodeIds: string[];
  isCyclic: boolean;
}

type DfsFrame = {
  nodeId: string;
  nextNeighborIndex: number;
  parentId?: string;
};

export function findStronglyConnectedComponents(
  nodeIds: string[],
  edges: Array<{ source: string; target: string }>,
): StronglyConnectedComponent[] {
  const adjacency = new Map<string, string[]>();
  for (const nodeId of nodeIds) {
    if (!adjacency.has(nodeId)) adjacency.set(nodeId, []);
  }

  for (const edge of edges) {
    const neighbors = adjacency.get(edge.source);
    if (neighbors && adjacency.has(edge.target)) neighbors.push(edge.target);
  }

  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: StronglyConnectedComponent[] = [];
  let nextIndex = 0;

  for (const startNodeId of adjacency.keys()) {
    if (indices.has(startNodeId)) continue;

    indices.set(startNodeId, nextIndex);
    lowLinks.set(startNodeId, nextIndex);
    nextIndex += 1;
    stack.push(startNodeId);
    onStack.add(startNodeId);

    const frames: DfsFrame[] = [{ nodeId: startNodeId, nextNeighborIndex: 0 }];
    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      const neighbors = adjacency.get(frame.nodeId) ?? [];

      if (frame.nextNeighborIndex < neighbors.length) {
        const neighborId = neighbors[frame.nextNeighborIndex];
        frame.nextNeighborIndex += 1;

        if (!indices.has(neighborId)) {
          indices.set(neighborId, nextIndex);
          lowLinks.set(neighborId, nextIndex);
          nextIndex += 1;
          stack.push(neighborId);
          onStack.add(neighborId);
          frames.push({ nodeId: neighborId, nextNeighborIndex: 0, parentId: frame.nodeId });
        } else if (onStack.has(neighborId)) {
          const nodeLowLink = lowLinks.get(frame.nodeId) ?? 0;
          const neighborIndex = indices.get(neighborId) ?? 0;
          lowLinks.set(frame.nodeId, Math.min(nodeLowLink, neighborIndex));
        }
        continue;
      }

      frames.pop();
      if (frame.parentId !== undefined) {
        const parentLowLink = lowLinks.get(frame.parentId) ?? 0;
        const nodeLowLink = lowLinks.get(frame.nodeId) ?? 0;
        lowLinks.set(frame.parentId, Math.min(parentLowLink, nodeLowLink));
      }

      if (lowLinks.get(frame.nodeId) !== indices.get(frame.nodeId)) continue;

      const componentNodeIds: string[] = [];
      let poppedNodeId = "";
      do {
        poppedNodeId = stack.pop() ?? "";
        onStack.delete(poppedNodeId);
        componentNodeIds.push(poppedNodeId);
      } while (poppedNodeId !== frame.nodeId);

      components.push({
        nodeIds: componentNodeIds,
        isCyclic:
          componentNodeIds.length > 1 ||
          (componentNodeIds.length === 1 &&
            (adjacency.get(componentNodeIds[0]) ?? []).includes(componentNodeIds[0])),
      });
    }
  }

  return components;
}
