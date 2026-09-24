import { describe, expect, it } from "vitest";
import {
  edgeKey,
  generateBoard,
  shortestPathLength,
  TracerouteGame,
  type Board,
  type Direction,
} from "../../src/lib/engine/traceroute";

function createBoard(
  connections: [number, number][],
  blockers: number[] = [],
  destinationId = 5,
  initialTTL?: number,
): Board {
  const nodes: Board["nodes"] = Array.from({ length: 72 }, (_, id) => ({
    id,
    kind: blockers.includes(id) ? ("ids" as const) : ("normal" as const),
    label: blockers.includes(id) ? "IDS" : "00",
  }));
  nodes[0] = { id: 0, kind: "src", label: "SRC" };
  nodes[destinationId] = { id: destinationId, kind: "dst", label: "DST" };
  const adjacency = Array.from({ length: 72 }, () => [] as number[]);
  for (const [a, b] of connections) {
    adjacency[a].push(b);
    adjacency[b].push(a);
  }
  const board: Board = {
    nodes,
    adjacency,
    sourceId: 0,
    destinationId,
    initialTTL: 0,
  };
  board.initialTTL = initialTTL ?? shortestPathLength(board) ?? 0;
  return board;
}

describe("traceroute shortest route", () => {
  it("returns the minimum number of connections across multiple routes", () => {
    const board = createBoard(
      [
        [0, 1],
        [1, 2],
        [0, 12],
        [12, 13],
        [13, 14],
        [14, 2],
      ],
      [],
      2,
    );

    expect(shortestPathLength(board)).toBe(2);
  });

  it("returns null when the destination is unreachable", () => {
    expect(shortestPathLength(createBoard([[0, 1]], [], 2))).toBeNull();
  });

  it("never traverses a blocker, even if a fixture connects through it", () => {
    const board = createBoard(
      [
        [0, 1],
        [1, 2],
      ],
      [1],
      2,
    );

    expect(shortestPathLength(board)).toBeNull();
  });
});

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function reachableWalkableNodeCount(board: Board): number {
  const visited = new Set([board.sourceId]);
  const queue = [board.sourceId];
  for (let index = 0; index < queue.length; index += 1) {
    for (const neighborId of board.adjacency[queue[index]]) {
      if (board.nodes[neighborId].kind === "ids" || visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push(neighborId);
    }
  }
  return visited.size;
}

function shortestRoute(board: Board): number[] {
  const distance = Array.from({ length: board.nodes.length }, () => -1);
  const queue = [board.destinationId];
  distance[board.destinationId] = 0;
  for (let index = 0; index < queue.length; index += 1) {
    const currentId = queue[index];
    for (const neighborId of board.adjacency[currentId]) {
      if (board.nodes[neighborId].kind === "ids" || distance[neighborId] !== -1) continue;
      distance[neighborId] = distance[currentId] + 1;
      queue.push(neighborId);
    }
  }

  const route = [board.sourceId];
  while (route[route.length - 1] !== board.destinationId) {
    const currentId = route[route.length - 1];
    const nextId = board.adjacency[currentId].find(
      (neighborId) =>
        board.nodes[neighborId].kind !== "ids" && distance[neighborId] === distance[currentId] - 1,
    );
    if (nextId === undefined) throw new Error("Could not reconstruct generated shortest route");
    route.push(nextId);
  }
  return route;
}

function getWrongForwardChoices(
  board: Board,
  route: number[],
): { forkCount: number; branchRoots: number[] } {
  let forkCount = 0;
  const branchRoots: number[] = [];
  for (let index = 0; index < route.length - 1; index += 1) {
    const previousId = route[index - 1] ?? -1;
    const correctNextId = route[index + 1];
    const branchRoot = board.adjacency[route[index]].find(
      (neighborId) =>
        neighborId !== previousId &&
        neighborId !== correctNextId &&
        board.nodes[neighborId].kind !== "ids",
    );
    if (branchRoot === undefined) continue;
    forkCount += 1;
    branchRoots.push(branchRoot);
  }
  return { forkCount, branchRoots };
}

describe("traceroute board generation", () => {
  it("creates a connected maze with a winding shortest route and no isolated points", () => {
    const board = generateBoard(seededRandom(42));
    expect(board).toEqual(generateBoard(seededRandom(42)));
    expect(board.nodes).toHaveLength(72);
    expect(board.nodes.map((node) => node.id)).toEqual(Array.from({ length: 72 }, (_, id) => id));
    expect(board.nodes.filter((node) => node.kind === "ids")).toHaveLength(8);

    const source = board.nodes[board.sourceId];
    const destination = board.nodes[board.destinationId];
    expect(source).toMatchObject({ kind: "src", label: "SRC" });
    expect(source.id % 12).toBe(0);
    expect(destination).toMatchObject({ kind: "dst", label: "DST" });
    expect(destination.id % 12).toBe(11);

    for (const node of board.nodes.filter((item) => item.kind === "normal")) {
      expect(node.label).toMatch(/^[0-9A-F]{2}$/);
    }
    for (const node of board.nodes) {
      expect(board.adjacency[node.id].length).toBeGreaterThanOrEqual(1);
      for (const neighborId of board.adjacency[node.id]) {
        expect(board.adjacency[neighborId]).toContain(node.id);
        const rowDistance = Math.abs(Math.floor(node.id / 12) - Math.floor(neighborId / 12));
        const columnDistance = Math.abs((node.id % 12) - (neighborId % 12));
        expect(rowDistance + columnDistance).toBe(1);
      }
    }

    expect(
      board.nodes.filter((node) => board.adjacency[node.id].length >= 2).length,
    ).toBeGreaterThan(board.nodes.length / 2);
    expect(reachableWalkableNodeCount(board)).toBe(
      board.nodes.filter((node) => node.kind !== "ids").length,
    );
    expect(board.initialTTL).toBeGreaterThanOrEqual(18);
    expect(board.initialTTL).toBeLessThanOrEqual(32);
    expect(board.initialTTL).toBe(shortestPathLength(board));
  });

  it("keeps the maze route in range for different deterministic rounds", () => {
    for (const seed of [1, 7, 99, 2026, 65_537]) {
      const board = generateBoard(seededRandom(seed));
      expect(board.initialTTL).toBeGreaterThanOrEqual(18);
      expect(board.initialTTL).toBeLessThanOrEqual(32);
    }
  });

  it("offers a wrong forward choice on most shortest-route steps", () => {
    for (const seed of [7, 42, 99, 2026, 65_537]) {
      const board = generateBoard(seededRandom(seed));
      const route = shortestRoute(board);
      const { forkCount, branchRoots } = getWrongForwardChoices(board, route);

      expect(route.length - 1).toBe(board.initialTTL);
      expect(forkCount).toBeGreaterThanOrEqual(Math.ceil((route.length - 1) * 0.75));
      expect(new Set(branchRoots).size).toBe(branchRoots.length);
    }
  });
});

describe("traceroute game transitions", () => {
  it("wins on the final TTL move and freezes after reaching the destination", () => {
    const board = createBoard(
      [
        [0, 1],
        [1, 2],
      ],
      [],
      2,
    );
    const game = new TracerouteGame(board, 0);

    const firstMove = game.move("right", 100);
    expect(firstMove).toMatchObject({
      status: "playing",
      currentNodeId: 1,
      remainingTTL: 1,
      filledEdges: [edgeKey(0, 1)],
    });

    const win = game.move("right", 200);
    expect(win).toMatchObject({
      status: "won",
      currentNodeId: 2,
      remainingTTL: 0,
      filledEdges: [edgeKey(0, 1), edgeKey(1, 2)],
    });
    expect(game.move("left", 300)).toEqual(win);
  });

  it("allows backtracking, charges TTL again, and retains the filled edge", () => {
    const game = new TracerouteGame(
      createBoard(
        [
          [0, 1],
          [1, 2],
        ],
        [],
        2,
      ),
      0,
    );

    game.move("right", 100);
    const loss = game.move("left", 200);

    expect(loss).toMatchObject({
      status: "lost",
      lossReason: "ttl",
      currentNodeId: 0,
      remainingTTL: 0,
      filledEdges: [edgeKey(0, 1)],
    });
  });
  it("fails on entry into IDS and charges the attempted hop", () => {
    const game = new TracerouteGame(
      createBoard(
        [
          [0, 1],
          [1, 2],
        ],
        [1],
        2,
        1,
      ),
      0,
    );

    const loss = game.move("right", 100);

    expect(loss).toMatchObject({
      status: "lost",
      lossReason: "ids",
      currentNodeId: 1,
      remainingTTL: 0,
      filledEdges: [edgeKey(0, 1)],
    });
    expect(game.move("left", 200)).toEqual(loss);
  });

  it("leaves position, TTL, and filled edges unchanged for illegal moves", () => {
    const game = new TracerouteGame(
      createBoard(
        [
          [0, 1],
          [1, 2],
        ],
        [],
        2,
        2,
      ),
      0,
    );

    for (const direction of ["left", "up", "down"] satisfies Direction[]) {
      const snapshot = game.move(direction, 0);
      expect(snapshot).toMatchObject({
        status: "playing",
        currentNodeId: 0,
        remainingTTL: 2,
        filledEdges: [],
      });
    }
  });

  it("expires at the deadline and resolves timeout before a move", () => {
    const board = createBoard(
      [
        [0, 1],
        [1, 2],
      ],
      [],
      2,
    );
    const game = new TracerouteGame(board, 0);
    expect(game.tick(31_999)).toMatchObject({
      status: "playing",
      remainingMs: 1,
    });
    expect(game.move("right", 32_000)).toMatchObject({
      status: "lost",
      lossReason: "time",
      currentNodeId: 0,
      remainingTTL: 2,
      remainingMs: 0,
      filledEdges: [],
    });
  });
});
