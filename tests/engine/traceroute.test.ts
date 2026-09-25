import { describe, expect, it } from "vitest";
import {
  edgeKey,
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
