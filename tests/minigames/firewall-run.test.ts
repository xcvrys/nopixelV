import { describe, expect, it } from "vitest";
import {
  FIREWALL_RUN_CONFIG,
  BLOCK_SIZE,
  ELEMENT_SIZE,
  FirewallRunLogic,
  LANE_COUNT,
  PLAYER_CENTER_Y,
  START_LANE,
  WALL_SPACING,
} from "../../src/lib/engine/firewall-run";
import type { FirewallRunConfig } from "../../src/lib/engine/firewall-run";

const { runSeconds, wallSpeed } = FIREWALL_RUN_CONFIG;
/** Half the combined size: the centres must sit closer than this for the boxes to overlap. */
const TOUCH_RANGE = (BLOCK_SIZE + ELEMENT_SIZE) / 2;
const CONTACT_EDGE = PLAYER_CENTER_Y - TOUCH_RANGE;
const CLEAR_EDGE = PLAYER_CENTER_Y + TOUCH_RANGE;

/** Fast enough that several lanes can be crossed before a wall arrives. */
const STEP = 0.02;
/** Crawling walls: a lane-clamping run must not be cut short by a wall landing. */
const CRAWL: FirewallRunConfig = { runSeconds: 20, wallSpeed: 20 };
/** Half the shipped speed: rows arrive every ~1.07s, enough for the scripted dodger
 * to cross lanes. The shipped speed is tuned for human reflexes, not a bot. */
const DODGE: FirewallRunConfig = { runSeconds, wallSpeed: wallSpeed / 2 };

function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Always leaves lane 0 open, so a player in the middle lane has to dodge. */
const laneZeroOpen: () => number = () => 0;

function dodgeThreat(logic: FirewallRunLogic): void {
  const { walls, lane } = logic.snapshot;
  // Walls run oldest first, so the first one inside the touch range is the one that
  // hits next; below that range a wall is spent and cannot hurt us.
  const threat = walls.find((wall) => wall.y <= CLEAR_EDGE);
  if (!threat || threat.openLane === lane) return;
  logic.move(threat.openLane > lane ? 1 : -1);
}

function advance(logic: FirewallRunLogic, seconds: number, onStep?: () => void): void {
  const steps = Math.ceil(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    logic.tick(STEP);
    onStep?.();
    if (logic.snapshot.status !== "playing") return;
  }
}

describe("FirewallRunLogic", () => {
  it("wins a run that dodges every wall", () => {
    const logic = new FirewallRunLogic(seededRng(7), DODGE);

    logic.start();
    advance(logic, runSeconds + 1, () => dodgeThreat(logic));

    const snapshot = logic.snapshot;
    expect(snapshot.status).toBe("success");
    expect(snapshot.crashLane).toBeNull();
    expect(snapshot.elapsedSeconds).toBeGreaterThanOrEqual(runSeconds);
  });

  it("ends a clean run at the configured duration", () => {
    const logic = new FirewallRunLogic(laneZeroOpen);

    logic.start();
    advance(logic, 1, () => logic.move(-1));
    expect(logic.snapshot.lane).toBe(0);
    advance(logic, runSeconds);

    const snapshot = logic.snapshot;
    expect(snapshot.status).toBe("success");
    expect(snapshot.elapsedSeconds).toBeGreaterThanOrEqual(runSeconds);
    expect(snapshot.elapsedSeconds).toBeLessThan(runSeconds + STEP);
  });

  it("fails in the sealed lane the instant a rectangle overlaps the player", () => {
    const logic = new FirewallRunLogic(laneZeroOpen);

    logic.start();
    advance(logic, 10);

    const snapshot = logic.snapshot;
    expect(snapshot.status).toBe("failed");
    expect(snapshot.crashLane).toBe(START_LANE);
    expect(snapshot.elapsedSeconds).toBeLessThan(runSeconds);

    const leading = Math.max(...snapshot.walls.map((wall) => wall.y));
    expect(leading).toBeLessThanOrEqual(CONTACT_EDGE + wallSpeed * STEP);
    expect(leading).toBeGreaterThan(CONTACT_EDGE);
  });

  it("ignores a wall that already passed before the player entered its lane", () => {
    const logic = new FirewallRunLogic(laneZeroOpen);

    logic.start();
    advance(logic, 1, () => logic.move(-1));
    expect(logic.snapshot.lane).toBe(0);

    for (let step = 0; step < 200; step += 1) {
      advance(logic, 0.2);
      if (Math.max(...logic.snapshot.walls.map((wall) => wall.y)) > CLEAR_EDGE) break;
    }
    expect(logic.snapshot.status).toBe("playing");
    expect(Math.max(...logic.snapshot.walls.map((wall) => wall.y))).toBeGreaterThan(CLEAR_EDGE);

    logic.move(1);
    expect(logic.snapshot.lane).toBe(1);
    expect(logic.snapshot.status).toBe("playing");
  });

  it("freezes the board after a crash", () => {
    const logic = new FirewallRunLogic(laneZeroOpen);

    logic.start();
    advance(logic, 10);
    const frozenRows = logic.snapshot.walls.map((wall) => wall.y);
    const elapsedAtCrash = logic.snapshot.elapsedSeconds;

    advance(logic, 2);

    expect(logic.snapshot.walls.map((wall) => wall.y)).toEqual(frozenRows);
    expect(logic.snapshot.elapsedSeconds).toBe(elapsedAtCrash);
  });

  it("spreads consecutive walls exactly 256px apart", () => {
    const logic = new FirewallRunLogic(seededRng(3));

    logic.start();
    advance(logic, 10);

    const walls = logic.snapshot.walls;
    const gaps: number[] = [];
    walls.forEach((wall, index) => {
      const previous = walls[index - 1];
      if (previous) gaps.push(previous.y - wall.y);
    });
    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) expect(gap).toBeCloseTo(WALL_SPACING, 5);
  });

  it("varies the open lane from wall to wall", () => {
    const logic = new FirewallRunLogic(seededRng(11), DODGE);
    const gaps = new Set<number>();

    logic.start();
    advance(logic, runSeconds, () => {
      dodgeThreat(logic);
      for (const wall of logic.snapshot.walls) gaps.add(wall.openLane);
    });

    expect(gaps.size).toBeGreaterThan(1);
  });

  it("clamps lane changes to the board edges", () => {
    const logic = new FirewallRunLogic(laneZeroOpen, CRAWL);

    logic.start();
    advance(logic, 2, () => logic.move(-1));
    expect(logic.snapshot.lane).toBe(0);

    advance(logic, 2, () => logic.move(1));
    expect(logic.snapshot.lane).toBe(LANE_COUNT - 1);
  });

  it("applies every lane change immediately, with no cooldown between steps", () => {
    const logic = new FirewallRunLogic(laneZeroOpen, CRAWL);

    logic.start();
    logic.move(1);
    logic.move(1);
    logic.move(1);

    expect(logic.snapshot.lane).toBe(START_LANE + 3);
  });

  it("ignores lane changes while idle", () => {
    const logic = new FirewallRunLogic(laneZeroOpen);

    logic.move(-1);

    expect(logic.snapshot.status).toBe("idle");
    expect(logic.snapshot.lane).toBe(START_LANE);
  });

  it("replays the same walls for the same seed", () => {
    const first = new FirewallRunLogic(seededRng(99), DODGE);
    const second = new FirewallRunLogic(seededRng(99), DODGE);

    first.start();
    second.start();
    advance(first, 12, () => dodgeThreat(first));
    advance(second, 12, () => dodgeThreat(second));

    expect(first.snapshot.walls.map((wall) => wall.openLane)).toEqual(
      second.snapshot.walls.map((wall) => wall.openLane),
    );
  });
});
