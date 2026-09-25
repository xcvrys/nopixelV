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

export interface Config {
  minL: number; // shortest solution length window (moves)
  maxL: number;
  minDetour: number; // Minimum L - Manhattan(src,dst); default is 6 (reference examples: 8–10)
  hazards: number; // reference boards: exactly 9
  extraEdges: [number, number]; // loop edges beyond the spanning skeleton
  maxRun: number; // longest straight segment on the solution
  minTurns: number;
  maxLeftMoves: number;
  maxShortestPaths: number; // reference boards allow small ties
  minReachableSafe: number; // share of safe cells the player can actually reach
  minDeadEnds: number; // reachable dead-end decoys
  minGreedyWaste: number; // myopic explorer moves / L
  maxMemorylessWin: number; // "just head toward the target" success rate
  growthRecency: number; // 0..1, higher = longer corridors
  maxAttempts: number;
}

export const DEFAULTS: Config = {
  minL: 18,
  maxL: 30,
  minDetour: 6,
  hazards: 9,
  extraEdges: [8, 14],
  maxRun: 4,
  minTurns: 9,
  maxLeftMoves: 2,
  maxShortestPaths: 4,
  minReachableSafe: 0.8,
  minDeadEnds: 5,
  minGreedyWaste: 1.3,
  maxMemorylessWin: 0.05,
  growthRecency: 0.75,
  maxAttempts: 400,
};

export const TIERS = {
  easy: { minL: 18, maxL: 21 },
  medium: { minL: 22, maxL: 26 },
  hard: { minL: 27, maxL: 30 },
} as const;

export type DifficultyTier = keyof typeof TIERS;
