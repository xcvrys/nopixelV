export type FirewallStatus = "idle" | "playing" | "success" | "failed";

/** Lane shift requested by a key press. */
export type LaneStep = -1 | 1;

export type FirewallWall = {
  id: number;
  /** Row centre from the top of the board, in SVG units. */
  y: number;
  /** The single lane this wall leaves open. */
  openLane: number;
};

export type FirewallRunSnapshot = {
  status: FirewallStatus;
  walls: readonly FirewallWall[];
  lane: number;
  elapsedSeconds: number;
  /** Lane the run died in, or `null` while alive. */
  crashLane: number | null;
};

/** Returns a float in `[0, 1)`. */
export type Rng = () => number;

export type FirewallRunConfig = {
  /** Survive this long to breach. */
  runSeconds: number;
  /** Descent speed of every wall, in SVG units per second. */
  wallSpeed: number;
};
