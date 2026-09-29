import { describe, expect, it } from "vitest";
import {
  CARGO_CRATE_CONFIG,
  CargoCrateLogic,
  spawnGapSeconds,
  type CargoCrate,
  type CargoTrack,
  type CargoCrateConfig,
} from "../../src/lib/engine/cargo-crate";

const { crateTravelSeconds, hitWindowStart, hitWindowEnd } = CARGO_CRATE_CONFIG;

const BAND_MID = (hitWindowStart + hitWindowEnd) / 2;
/** Just inside the judge band, at its left edge. */
const IN_BAND_LOW = hitWindowStart + 0.01;
/** On screen but well past the judge band. */
const PAST_BAND = hitWindowStart * 0.5;

/** Elapsed run time at which a crate spawned at `x = 1` reaches `x`. */
const timeToReach = (x: number): number => (1 - x) * crateTravelSeconds;

/** At most one crate on the board, so hit/miss counts are unambiguous. */
const SOLO_SPAWN: CargoCrateConfig = {
  ...CARGO_CRATE_CONFIG,
  spawnGapStartSeconds: 5,
  spawnGapEndSeconds: 5,
  chordChance: 0,
};

/** Spawns fast enough that two crates share the judge band. */
const CLUSTERED_SPAWN: CargoCrateConfig = {
  ...CARGO_CRATE_CONFIG,
  spawnGapStartSeconds: crateTravelSeconds * 0.035,
  spawnGapEndSeconds: crateTravelSeconds * 0.035,
  chordChance: 0,
};

function repeatingRng(value: number): () => number {
  return () => value;
}

function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Start the run, then advance until the first crate settles in the judge band. */
function startAt(logic: CargoCrateLogic, x: number): void {
  logic.start();
  logic.tick(0.001);
  logic.tick(timeToReach(x) - 0.001);
}

function hitNextCrate(logic: CargoCrateLogic): void {
  let inBand: CargoCrate | null = null;
  for (let step = 0; step < 1000 && inBand === null; step += 1) {
    logic.tick(0.02);
    inBand =
      logic.snapshot.crates.find((c) => c.x >= hitWindowStart && c.x <= hitWindowEnd) ?? null;
  }
  if (!inBand) throw new Error("no crate reached the judge band");
  expect(logic.press(inBand.track)).toBe("hit");
}

describe("CargoCrateLogic", () => {
  it("starts idle with an empty board", () => {
    const logic = new CargoCrateLogic();
    expect(logic.snapshot).toMatchObject({
      status: "idle",
      crates: [],
      progress: 0,
      streak: 0,
      misses: 0,
      feedback: null,
    });
  });

  it("ignores presses before the run starts", () => {
    const logic = new CargoCrateLogic();
    expect(logic.press("A")).toBe("ignored");
    expect(logic.snapshot.misses).toBe(0);
  });

  it("ignores ticks before the run starts", () => {
    const logic = new CargoCrateLogic(repeatingRng(0));
    logic.tick(5);
    expect(logic.snapshot.crates).toHaveLength(0);
    expect(logic.snapshot.status).toBe("idle");
  });

  it("counts a press on an empty lane as a miss", () => {
    const logic = new CargoCrateLogic(repeatingRng(0), SOLO_SPAWN);
    startAt(logic, 0.6);
    expect(logic.press("C")).toBe("miss");
    expect(logic.snapshot.misses).toBe(1);
    expect(logic.snapshot.streak).toBe(0);
  });

  it("scores a press while a crate sits in the judge band", () => {
    const logic = new CargoCrateLogic(repeatingRng(0), SOLO_SPAWN);
    startAt(logic, BAND_MID);
    expect(logic.press("A")).toBe("hit");
    expect(logic.snapshot.progress).toBe(1);
    expect(logic.snapshot.streak).toBe(1);
    expect(logic.snapshot.crates).toHaveLength(0);
  });

  it("leaves a live crate hittable after a wrong-lane press", () => {
    const logic = new CargoCrateLogic(repeatingRng(0), SOLO_SPAWN);
    startAt(logic, BAND_MID);
    expect(logic.press("B")).toBe("miss");
    expect(logic.snapshot.crates).toHaveLength(1);
    expect(logic.press("A")).toBe("hit");
    expect(logic.snapshot.progress).toBe(1);
  });

  it("keeps a crate alive after it passes the band", () => {
    const logic = new CargoCrateLogic(repeatingRng(0), SOLO_SPAWN);
    startAt(logic, PAST_BAND);
    expect(logic.snapshot.misses).toBe(0);
    expect(logic.snapshot.crates).toHaveLength(1);
  });

  it("stops accepting a press once a crate has passed the band", () => {
    const logic = new CargoCrateLogic(repeatingRng(0), SOLO_SPAWN);
    startAt(logic, PAST_BAND);
    expect(logic.snapshot.crates).toHaveLength(1);
    expect(logic.press("A")).toBe("miss");
  });

  it("misses a crate only once it leaves the lane", () => {
    const logic = new CargoCrateLogic(repeatingRng(0), SOLO_SPAWN);
    logic.start();
    logic.tick(0.001);
    logic.tick(crateTravelSeconds + 0.05);
    expect(logic.snapshot.misses).toBe(1);
    expect(logic.snapshot.streak).toBe(0);
    expect(logic.snapshot.crates).toHaveLength(0);
  });

  it("consumes only the leftmost of two crates sharing a lane", () => {
    const logic = new CargoCrateLogic(repeatingRng(0.5), CLUSTERED_SPAWN);
    startAt(logic, IN_BAND_LOW);
    const byPosition = [...logic.snapshot.crates].sort((a, b) => a.x - b.x);
    const [leftmost, next] = byPosition;
    expect(logic.press("B")).toBe("hit");
    expect(logic.snapshot.crates.some((c) => c.id === leftmost.id)).toBe(false);
    expect(logic.snapshot.crates.some((c) => c.id === next.id)).toBe(true);
  });

  it("resets the streak on a miss and rebuilds it on hits", () => {
    const logic = new CargoCrateLogic(repeatingRng(0), SOLO_SPAWN);
    logic.start();
    hitNextCrate(logic);
    hitNextCrate(logic);
    expect(logic.snapshot.streak).toBe(2);
    logic.press("B");
    expect(logic.snapshot.streak).toBe(0);
    expect(logic.snapshot.progress).toBe(2);
  });

  it("wins at the target progress and latches", () => {
    const logic = new CargoCrateLogic(repeatingRng(0), SOLO_SPAWN);
    logic.start();
    for (let i = 0; i < CARGO_CRATE_CONFIG.targetProgress; i += 1) hitNextCrate(logic);
    expect(logic.snapshot.status).toBe("success");
    expect(logic.snapshot.progress).toBe(CARGO_CRATE_CONFIG.targetProgress);
    expect(logic.press("A")).toBe("ignored");
  });

  it("fails at the miss limit and latches", () => {
    const logic = new CargoCrateLogic(repeatingRng(0), SOLO_SPAWN);
    logic.start();
    logic.tick(0.001);
    for (let i = 0; i < CARGO_CRATE_CONFIG.maxMisses; i += 1) logic.press("C");
    expect(logic.snapshot.status).toBe("failed");
    expect(logic.press("C")).toBe("ignored");
  });

  it("clears the row feedback once it expires", () => {
    const logic = new CargoCrateLogic(repeatingRng(0), SOLO_SPAWN);
    logic.start();
    hitNextCrate(logic);
    expect(logic.snapshot.feedback).toEqual({ track: "A", kind: "hit" });
    logic.tick(CARGO_CRATE_CONFIG.feedbackSeconds + 0.01);
    expect(logic.snapshot.feedback).toBeNull();
  });

  it("replays identically for the same injected rng", () => {
    const play = (): string => {
      const logic = new CargoCrateLogic(seededRng(1234));
      logic.start();
      for (let i = 0; i < 200; i += 1) logic.tick(0.05);
      return logic.snapshot.crates.map((c) => `${c.track}:${c.x.toFixed(6)}`).join("|");
    };
    expect(play()).toBe(play());
  });
});

describe("spawn pacing", () => {
  it("puts two crates in the band at once, always on different lanes", () => {
    const logic = new CargoCrateLogic(seededRng(7));
    logic.start();
    let widestChord: readonly CargoTrack[] = [];
    for (let step = 0; step < 8000 && widestChord.length < 2; step += 1) {
      logic.tick(0.008);
      const inBand = logic.snapshot.crates
        .filter((c) => c.x >= hitWindowStart && c.x <= hitWindowEnd)
        .map((c) => c.track);
      if (inBand.length > widestChord.length) widestChord = inBand;
    }
    expect(widestChord.length).toBeGreaterThanOrEqual(2);
    // A chord on one lane would be a single press, not a two-key demand.
    expect(new Set(widestChord).size).toBe(widestChord.length);
  });

  it("charges one press per crate in a chord", () => {
    const logic = new CargoCrateLogic(seededRng(7));
    logic.start();
    for (let step = 0; step < 8000; step += 1) {
      logic.tick(0.008);
      const inBand = logic.snapshot.crates.filter(
        (c) => c.x >= hitWindowStart && c.x <= hitWindowEnd,
      );
      if (inBand.length < 2) continue;
      const before = logic.snapshot.progress;
      expect(logic.press(inBand[0].track)).toBe("hit");
      expect(logic.snapshot.progress).toBe(before + 1);
      expect(logic.press(inBand[1].track)).toBe("hit");
      expect(logic.snapshot.progress).toBe(before + 2);
      return;
    }
    throw new Error("no chord reached the judge band");
  });

  /** Wall-clock gaps between spawns, with chords off so base pacing is isolated. */
  function sampleGaps(seed: number): number[] {
    const logic = new CargoCrateLogic(seededRng(seed), { ...CARGO_CRATE_CONFIG, chordChance: 0 });
    logic.start();
    const spawnTimes: number[] = [];
    let elapsed = 0;
    let highestId = 0;
    for (let step = 0; step < 6000 && spawnTimes.length < 14; step += 1) {
      logic.tick(0.008);
      elapsed += 0.008;
      const ids = logic.snapshot.crates.map((c) => c.id);
      if (ids.length === 0) continue;
      const current = Math.max(...ids);
      if (current > highestId) {
        highestId = current;
        spawnTimes.push(elapsed);
      }
    }
    return spawnTimes.slice(1).map((time, i) => time - spawnTimes[i]);
  }

  it("varies the gap between spawns", () => {
    const gaps = sampleGaps(31);
    expect(gaps.length).toBeGreaterThan(4);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(0.05);
  });

  it("keeps pacing steady instead of swinging between dense and calm waves", () => {
    const gaps = sampleGaps(31);
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(2);
  });
});

describe("spawnGapSeconds", () => {
  it("spans the configured gap range across a run", () => {
    const last = CARGO_CRATE_CONFIG.targetProgress - 1;
    expect(spawnGapSeconds(0)).toBeCloseTo(CARGO_CRATE_CONFIG.spawnGapStartSeconds);
    expect(spawnGapSeconds(last)).toBeCloseTo(CARGO_CRATE_CONFIG.spawnGapEndSeconds);
  });

  it("narrows the gap as progress rises", () => {
    expect(spawnGapSeconds(10)).toBeLessThan(spawnGapSeconds(0));
  });
});
