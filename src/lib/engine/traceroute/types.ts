export const BOARD_COLUMNS = 12;
export const BOARD_ROWS = 6;
export const BOARD_SIZE = BOARD_COLUMNS * BOARD_ROWS;

export type NodeKind = "src" | "dst" | "normal" | "ids";

export interface TracerouteNode {
  id: number;
  kind: NodeKind;
  label: string;
}

export interface Board {
  nodes: TracerouteNode[];
  adjacency: number[][];
  sourceId: number;
  destinationId: number;
  initialTTL: number;
}

export type Direction = "up" | "down" | "left" | "right";
export type GameStatus = "playing" | "won" | "lost";
export type LossReason = "time" | "ttl" | "ids" | null;

export interface GameSnapshot {
  board: Board;
  status: GameStatus;
  lossReason: LossReason;
  currentNodeId: number;
  remainingTTL: number;
  remainingMs: number;
  filledEdges: number[];
}
