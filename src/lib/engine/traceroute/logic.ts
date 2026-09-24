import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  BOARD_SIZE,
  type Board,
  type Direction,
  type GameSnapshot,
  type TracerouteNode,
} from "./types";

const BLOCKER_COUNT = 8;
const MIN_ROUTE_LENGTH = 18;
const MAX_ROUTE_LENGTH = 32;
const OPTIONAL_CONNECTION_CHANCE = 0.25;
const GRID_NEIGHBORS: number[][] = Array.from({ length: BOARD_SIZE }, (_, id) => {
  const neighbors: number[] = [];
  const row = Math.floor(id / BOARD_COLUMNS);
  const column = id % BOARD_COLUMNS;
  if (row > 0) neighbors.push(id - BOARD_COLUMNS);
  if (row < BOARD_ROWS - 1) neighbors.push(id + BOARD_COLUMNS);
  if (column > 0) neighbors.push(id - 1);
  if (column < BOARD_COLUMNS - 1) neighbors.push(id + 1);
  return neighbors;
});

function shuffle<T>(items: T[], random: () => number): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
}

function connect(adjacency: number[][], a: number, b: number): void {
  adjacency[a].push(b);
  adjacency[b].push(a);
}

type WindingRoute = {
  sourceId: number;
  destinationId: number;
  path: number[];
  branchRoots: Map<number, number>;
};

function getBranchRoots(path: number[], random: () => number): Map<number, number> {
  const routeNodes = new Set(path);
  const candidatesByRoute = path.slice(0, -1).map((id) => {
    const candidates = GRID_NEIGHBORS[id].filter((neighborId) => !routeNodes.has(neighborId));
    shuffle(candidates, random);
    return candidates;
  });
  const routeIndices = path.slice(0, -1).map((_, index) => index);
  shuffle(routeIndices, random);
  const ownerByRoot = new Int16Array(BOARD_SIZE);
  ownerByRoot.fill(-1);
  const rootByRoute = new Int16Array(path.length);
  rootByRoute.fill(-1);

  function assignRoot(routeIndex: number, visitedRoots: Uint8Array): boolean {
    for (const rootId of candidatesByRoute[routeIndex]) {
      if (visitedRoots[rootId]) continue;
      visitedRoots[rootId] = 1;
      const currentOwner = ownerByRoot[rootId];
      if (currentOwner === -1 || assignRoot(currentOwner, visitedRoots)) {
        ownerByRoot[rootId] = routeIndex;
        rootByRoute[routeIndex] = rootId;
        return true;
      }
    }
    return false;
  }

  for (const routeIndex of routeIndices) {
    assignRoot(routeIndex, new Uint8Array(BOARD_SIZE));
  }

  const branchRoots = new Map<number, number>();
  for (let index = 0; index < rootByRoute.length; index += 1) {
    if (rootByRoute[index] !== -1) branchRoots.set(index, rootByRoute[index]);
  }
  return branchRoots;
}

function createRandomRoute(random: () => number): Omit<WindingRoute, "branchRoots"> {
  const sourceRow = Math.floor(random() * BOARD_ROWS);
  const destinationRow = Math.floor(random() * BOARD_ROWS);
  const sourceId = sourceRow * BOARD_COLUMNS;
  const destinationId = destinationRow * BOARD_COLUMNS + BOARD_COLUMNS - 1;
  const routeLengths: number[] = [];
  const routeParity = (sourceRow + destinationRow + BOARD_COLUMNS - 1) % 2;
  for (let length = MIN_ROUTE_LENGTH; length <= MAX_ROUTE_LENGTH; length += 1) {
    if (length % 2 === routeParity) routeLengths.push(length);
  }
  const targetLength = routeLengths[Math.floor(random() * routeLengths.length)];
  const path = [sourceId];
  const visited = new Uint8Array(BOARD_SIZE);
  visited[sourceId] = 1;

  function visit(currentId: number): boolean {
    const steps = path.length - 1;
    if (currentId === destinationId) return steps === targetLength;
    if (steps >= targetLength) return false;

    const remainingSteps = targetLength - steps;
    const rowDistance = Math.abs(Math.floor(currentId / BOARD_COLUMNS) - destinationRow);
    const columnDistance = BOARD_COLUMNS - 1 - (currentId % BOARD_COLUMNS);
    const distanceToDestination = rowDistance + columnDistance;
    if (
      distanceToDestination > remainingSteps ||
      (remainingSteps - distanceToDestination) % 2 !== 0
    ) {
      return false;
    }

    const candidates = GRID_NEIGHBORS[currentId].filter((id) => !visited[id]);
    shuffle(candidates, random);
    for (const nextId of candidates) {
      if (nextId === destinationId && steps + 1 !== targetLength) continue;
      visited[nextId] = 1;
      path.push(nextId);
      if (visit(nextId)) return true;
      path.pop();
      visited[nextId] = 0;
    }
    return false;
  }

  if (!visit(sourceId)) throw new Error("Could not generate a winding traceroute route");
  return { sourceId, destinationId, path };
}

function createBranchRichFallback(random: () => number): WindingRoute {
  const routes: WindingRoute[] = [];
  for (const [firstGap, secondGap] of [
    [1, 2],
    [2, 1],
    [2, 2],
  ]) {
    const totalGap = firstGap + secondGap;
    const minimumSplit = totalGap === 3 ? 2 : 3;
    for (let startRow = 0; startRow + totalGap < BOARD_ROWS; startRow += 1) {
      for (const verticalDirection of [-1, 1]) {
        const sourceRow = verticalDirection === 1 ? startRow : startRow + totalGap;
        for (let splitColumn = minimumSplit; splitColumn <= BOARD_COLUMNS - 3; splitColumn += 1) {
          const path = [sourceRow * BOARD_COLUMNS];
          for (let column = 1; column < BOARD_COLUMNS; column += 1) {
            path.push(sourceRow * BOARD_COLUMNS + column);
          }

          let row = sourceRow;
          for (let step = 0; step < firstGap; step += 1) {
            row += verticalDirection;
            path.push(row * BOARD_COLUMNS + BOARD_COLUMNS - 1);
          }
          for (let column = BOARD_COLUMNS - 2; column >= splitColumn; column -= 1) {
            path.push(row * BOARD_COLUMNS + column);
          }
          for (let step = 0; step < secondGap; step += 1) {
            row += verticalDirection;
            path.push(row * BOARD_COLUMNS + splitColumn);
          }
          for (let column = splitColumn + 1; column < BOARD_COLUMNS; column += 1) {
            path.push(row * BOARD_COLUMNS + column);
          }

          const sourceId = path[0];
          const destinationId = path[path.length - 1];
          const branchRoots = getBranchRoots(path, random);
          if (branchRoots.size >= Math.ceil((path.length - 1) * 0.75)) {
            routes.push({ sourceId, destinationId, path, branchRoots });
          }
        }
      }
    }
  }

  if (routes.length === 0) throw new Error("Could not generate a branch-rich traceroute route");
  return routes[Math.floor(random() * routes.length)];
}

function createWindingRoute(random: () => number): WindingRoute {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const route = createRandomRoute(random);
    const branchRoots = getBranchRoots(route.path, random);
    if (branchRoots.size >= Math.ceil((route.path.length - 1) * 0.75)) {
      return { ...route, branchRoots };
    }
  }
  return createBranchRichFallback(random);
}

function createMazeTree(
  path: number[],
  branchRoots: Map<number, number>,
  random: () => number,
): number[][] {
  const adjacency = Array.from({ length: BOARD_SIZE }, () => [] as number[]);
  const visited = new Uint8Array(BOARD_SIZE);
  for (let index = 0; index < path.length; index += 1) visited[path[index]] = 1;
  for (let index = 1; index < path.length; index += 1) {
    connect(adjacency, path[index - 1], path[index]);
  }
  for (const [routeIndex, rootId] of branchRoots) {
    visited[rootId] = 1;
    connect(adjacency, path[routeIndex], rootId);
  }

  const stack = [...path, ...branchRoots.values()];
  while (stack.length > 0) {
    const currentId = stack[stack.length - 1];
    const candidates = GRID_NEIGHBORS[currentId].filter((id) => !visited[id]);
    if (candidates.length === 0) {
      stack.pop();
      continue;
    }
    const nextId = candidates[Math.floor(random() * candidates.length)];
    visited[nextId] = 1;
    connect(adjacency, currentId, nextId);
    stack.push(nextId);
  }
  return adjacency;
}

function getTreeDepths(adjacency: number[][], sourceId: number): Int16Array {
  const depths = new Int16Array(BOARD_SIZE);
  depths.fill(-1);
  depths[sourceId] = 0;
  const queue = [sourceId];
  for (let index = 0; index < queue.length; index += 1) {
    const currentId = queue[index];
    for (const neighborId of adjacency[currentId]) {
      if (depths[neighborId] !== -1) continue;
      depths[neighborId] = depths[currentId] + 1;
      queue.push(neighborId);
    }
  }
  return depths;
}

export function edgeKey(a: number, b: number): number {
  const lower = Math.min(a, b);
  const higher = Math.max(a, b);
  return lower * BOARD_SIZE + higher;
}

export function shortestPathLength(board: Board): number | null {
  const distance = new Int16Array(BOARD_SIZE);
  distance.fill(-1);
  const queue = new Int16Array(BOARD_SIZE);
  let queueHead = 0;
  let queueTail = 0;

  distance[board.sourceId] = 0;
  queue[queueTail++] = board.sourceId;

  while (queueHead < queueTail) {
    const currentId = queue[queueHead++];
    if (currentId === board.destinationId) return distance[currentId];

    for (const neighborId of board.adjacency[currentId] ?? []) {
      if (neighborId < 0 || neighborId >= board.nodes.length || distance[neighborId] !== -1)
        continue;
      if (board.nodes[neighborId]?.kind === "ids") continue;

      distance[neighborId] = distance[currentId] + 1;
      queue[queueTail++] = neighborId;
    }
  }

  return null;
}

export function generateBoard(random: () => number = Math.random): Board {
  const { sourceId, destinationId, path, branchRoots } = createWindingRoute(random);
  const routeNodes = new Set(path);
  const branchRootIds = new Set(branchRoots.values());
  const tree = createMazeTree(path, branchRoots, random);
  const blockerIds = new Set<number>();
  const remainingDegree = Uint8Array.from(tree, (neighbors) => neighbors.length);

  for (let count = 0; count < BLOCKER_COUNT; count += 1) {
    const candidates = [];
    for (let id = 0; id < BOARD_SIZE; id += 1) {
      if (
        !routeNodes.has(id) &&
        !branchRootIds.has(id) &&
        !blockerIds.has(id) &&
        remainingDegree[id] === 1
      ) {
        candidates.push(id);
      }
    }
    if (candidates.length === 0) throw new Error("Could not place traceroute IDS nodes");
    const blockerId = candidates[Math.floor(random() * candidates.length)];
    blockerIds.add(blockerId);
    remainingDegree[blockerId] = 0;
    for (const neighborId of tree[blockerId]) {
      if (!blockerIds.has(neighborId)) remainingDegree[neighborId] -= 1;
    }
  }

  const nodes: TracerouteNode[] = Array.from({ length: BOARD_SIZE }, (_, id) => {
    if (id === sourceId) return { id, kind: "src", label: "SRC" };
    if (id === destinationId) return { id, kind: "dst", label: "DST" };
    if (blockerIds.has(id)) return { id, kind: "ids", label: "IDS" };
    return {
      id,
      kind: "normal",
      label: Math.floor(random() * 256)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase(),
    };
  });
  const adjacency = tree.map((neighbors) => [...neighbors]);
  const depths = getTreeDepths(tree, sourceId);
  const extraEdges: Array<[number, number]> = [];

  for (let id = 0; id < BOARD_SIZE; id += 1) {
    for (const neighborId of GRID_NEIGHBORS[id]) {
      if (neighborId <= id || tree[id].includes(neighborId)) continue;
      if (!blockerIds.has(id) && !blockerIds.has(neighborId) && depths[id] !== depths[neighborId]) {
        continue;
      }
      extraEdges.push([id, neighborId]);
    }
  }

  shuffle(extraEdges, random);
  for (const [a, b] of extraEdges) {
    if (random() < OPTIONAL_CONNECTION_CHANCE) connect(adjacency, a, b);
  }

  let nodesWithMultipleConnections = adjacency.filter((neighbors) => neighbors.length >= 2).length;
  for (const [a, b] of extraEdges) {
    if (nodesWithMultipleConnections > BOARD_SIZE / 2) break;
    if (adjacency[a].includes(b)) continue;
    const degreeIncrease = Number(adjacency[a].length === 1) + Number(adjacency[b].length === 1);
    if (degreeIncrease === 0) continue;
    connect(adjacency, a, b);
    nodesWithMultipleConnections += degreeIncrease;
  }

  const board: Board = { nodes, adjacency, sourceId, destinationId, initialTTL: 0 };
  const initialTTL = shortestPathLength(board);
  if (initialTTL === null) throw new Error("Generated traceroute board has no valid route");
  board.initialTTL = initialTTL;
  return board;
}

const GAME_DURATION_MS = 32_000;

export class TracerouteGame {
  private currentNodeId: number;
  private remainingTTL: number;
  private remainingMs = GAME_DURATION_MS;
  private status: GameSnapshot["status"] = "playing";
  private lossReason: GameSnapshot["lossReason"] = null;
  private readonly filledEdges = new Set<number>();

  constructor(
    private readonly board: Board,
    private readonly startedAt: number,
  ) {
    this.currentNodeId = board.sourceId;
    this.remainingTTL = board.initialTTL;
  }

  move(direction: Direction, now: number): GameSnapshot {
    if (this.status !== "playing") return this.createSnapshot();
    this.refreshTime(now);
    if (this.status !== "playing") return this.createSnapshot();

    const targetId = this.targetFor(direction);
    if (targetId === null || !this.board.adjacency[this.currentNodeId]?.includes(targetId)) {
      return this.createSnapshot();
    }

    this.filledEdges.add(edgeKey(this.currentNodeId, targetId));
    this.currentNodeId = targetId;
    this.remainingTTL -= 1;

    if (this.board.nodes[targetId]?.kind === "dst") {
      this.status = "won";
    } else if (this.board.nodes[targetId]?.kind === "ids") {
      this.status = "lost";
      this.lossReason = "ids";
    } else if (this.remainingTTL <= 0) {
      this.status = "lost";
      this.lossReason = "ttl";
    }

    return this.createSnapshot();
  }

  tick(now: number): GameSnapshot {
    if (this.status === "playing") this.refreshTime(now);
    return this.createSnapshot();
  }

  private refreshTime(now: number): void {
    const elapsed = Math.max(0, now - this.startedAt);
    this.remainingMs = Math.max(0, GAME_DURATION_MS - elapsed);
    if (this.remainingMs === 0) {
      this.status = "lost";
      this.lossReason = "time";
    }
  }

  private targetFor(direction: Direction): number | null {
    const row = Math.floor(this.currentNodeId / BOARD_COLUMNS);
    const column = this.currentNodeId % BOARD_COLUMNS;
    switch (direction) {
      case "up":
        return row > 0 ? this.currentNodeId - BOARD_COLUMNS : null;
      case "down":
        return row < BOARD_ROWS - 1 ? this.currentNodeId + BOARD_COLUMNS : null;
      case "left":
        return column > 0 ? this.currentNodeId - 1 : null;
      case "right":
        return column < BOARD_COLUMNS - 1 ? this.currentNodeId + 1 : null;
    }
  }

  private createSnapshot(): GameSnapshot {
    return {
      board: this.board,
      status: this.status,
      lossReason: this.lossReason,
      currentNodeId: this.currentNodeId,
      remainingTTL: this.remainingTTL,
      remainingMs: this.remainingMs,
      filledEdges: Array.from(this.filledEdges),
    };
  }
}
