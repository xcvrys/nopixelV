import {
  BLOCK_SIZE,
  ELEMENT_SIZE,
  FIREWALL_RUN_CONFIG,
  LANE_COUNT,
  MAX_STEP_SECONDS,
  PLAYER_CENTER_Y,
  START_LANE,
  WALL_SPACING,
  BOARD_HEIGHT,
} from "./constants";
import type { FirewallRunConfig, FirewallRunSnapshot, FirewallWall, LaneStep, Rng } from "./types";

/**
 * Walls descend a six-lane board. Every wall seals five lanes and leaves one
 * open; the run ends the instant a sealed rectangle's box overlaps the player's box.
 * Block and chip are both centred on the player line, so their boxes overlap exactly
 * when the centres are within half their combined size: a wall that already sailed
 * past can never claim a hit.
 *
 * Time arrives through `tick`, randomness through the injected `Rng`. The class
 * reads no clock and no global, so a run replays exactly for a given seed.
 */
export class FirewallRunLogic {
  private readonly rng: Rng;
  private readonly config: FirewallRunConfig;
  /** Fixed by the 256px row spacing, so pacing never drifts. */
  private readonly spawnInterval: number;
  private walls: FirewallWall[] = [];
  private lane = START_LANE;
  private status: FirewallRunSnapshot["status"] = "idle";
  private elapsedSeconds = 0;
  private spawnedWalls = 0;
  private nextWallId = 1;
  private crashLane: number | null = null;

  constructor(rng: Rng = Math.random, config: FirewallRunConfig = FIREWALL_RUN_CONFIG) {
    this.rng = rng;
    this.config = config;
    this.spawnInterval = WALL_SPACING / config.wallSpeed;
  }

  get snapshot(): FirewallRunSnapshot {
    return {
      status: this.status,
      walls: this.walls,
      lane: this.lane,
      elapsedSeconds: this.elapsedSeconds,
      crashLane: this.crashLane,
    };
  }

  public start(): void {
    this.walls = [];
    this.lane = START_LANE;
    this.status = "playing";
    this.elapsedSeconds = 0;
    this.spawnedWalls = 0;
    this.nextWallId = 1;
    this.crashLane = null;
  }

  /**
   * Shifts one lane, clamped to the board edges. No cooldown: a tap lands on the
   * next frame, and a held key sweeps at the browser's key-repeat rate.
   */
  public move(step: LaneStep): FirewallRunSnapshot {
    if (this.status !== "playing") return this.snapshot;
    this.lane = Math.min(LANE_COUNT - 1, Math.max(0, this.lane + step));
    return this.snapshot;
  }

  public tick(deltaSeconds: number): void {
    if (this.status !== "playing") return;
    const delta = Math.min(deltaSeconds, MAX_STEP_SECONDS);
    this.elapsedSeconds += delta;

    for (const wall of this.walls) wall.y += this.config.wallSpeed * delta;
    this.walls = this.walls.filter((wall) => wall.y <= BOARD_HEIGHT + ELEMENT_SIZE);

    // Rows are placed on an exact schedule rather than on frame boundaries, so
    // neighbouring walls stay 256px apart no matter how the ticks land.
    while (this.spawnedWalls * this.spawnInterval <= this.elapsedSeconds) {
      this.walls.push({
        id: this.nextWallId++,
        y:
          -ELEMENT_SIZE +
          (this.elapsedSeconds - this.spawnedWalls * this.spawnInterval) * this.config.wallSpeed,
        openLane: Math.floor(this.rng() * LANE_COUNT),
      });
      this.spawnedWalls += 1;
    }

    for (const wall of this.walls) {
      // The chip and the block are centred on the same line, so their boxes overlap
      // exactly when the centres are within half their combined size. A wall that
      // already sailed past cannot claim a hit.
      if (
        Math.abs(wall.y - PLAYER_CENTER_Y) < (BLOCK_SIZE + ELEMENT_SIZE) / 2 &&
        wall.openLane !== this.lane
      ) {
        this.status = "failed";
        this.crashLane = this.lane;
        return;
      }
    }

    if (this.elapsedSeconds >= this.config.runSeconds) this.status = "success";
  }
}
