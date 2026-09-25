import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  BOARD_SIZE,
  type Board,
  type Direction,
  type GameSnapshot,
} from "./types";

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
