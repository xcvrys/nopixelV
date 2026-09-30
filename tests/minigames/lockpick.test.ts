import { describe, it, expect, beforeEach } from "vitest";
import {
  LockpickLogic,
  DIFFICULTY_PRESETS,
  PROGRESSIVE_STAGES,
  getMaxingConfig,
  bucketTap,
  chartColumns,
  cpsSeries,
  smoothSeries,
  traceCps,
  BUCKET_SECONDS,
  MAX_BUCKETS,
  type CpsTrace,
} from "../../src/lib/engine/lockpick";

describe("LockpickLogic Engine", () => {
  let lock: LockpickLogic;

  beforeEach(() => {
    lock = new LockpickLogic({
      progressPerTap: 5,
      decayRate: 10, // 10% per second
      maxPins: 3,
    });
  });

  it("initializes in idle state at 0% progress", () => {
    expect(lock.status).toBe("idle");
    expect(lock.progress).toBe(0);
    expect(lock.currentPin).toBe(1);
    expect(lock.taps).toBe(0);
  });

  it("starts running on first tap and advances progress", () => {
    lock.tap();
    expect(lock.status).toBe("running");
    expect(lock.progress).toBe(5);
    expect(lock.taps).toBe(1);
  });

  it("decays progress over time during running state", () => {
    lock.tap(); // progress = 5
    lock.tap(); // progress = 10
    expect(lock.progress).toBe(10);

    // Advance 0.5s with decay rate of 10% per second -> drops by 5
    lock.tick(0.5);
    expect(lock.progress).toBeCloseTo(5, 1);

    // Advance another 1s -> should not drop below 0
    lock.tick(1.0);
    expect(lock.progress).toBe(0);
  });

  it("advances pin or triggers win when progress reaches 100%", () => {
    // Single pin mode for quick test
    const singlePinLock = new LockpickLogic({
      progressPerTap: 50,
      decayRate: 0,
      maxPins: 1,
    });

    singlePinLock.tap();
    expect(singlePinLock.progress).toBe(50);
    expect(singlePinLock.status).toBe("running");

    singlePinLock.tap();
    expect(singlePinLock.progress).toBe(100);
    expect(singlePinLock.status).toBe("won");
  });

  it("ignores taps throughout the victory state", () => {
    const singlePinLock = new LockpickLogic({
      progressPerTap: 50,
      decayRate: 0,
      maxPins: 1,
    });
    const originalNow = Date.now;

    try {
      singlePinLock.tap();
      singlePinLock.tap();
      expect(singlePinLock.status).toBe("won");
      singlePinLock.progressPerTap = 5;
      Date.now = () => originalNow() + 601;
      for (let index = 0; index < 10; index++) singlePinLock.tap();

      expect(singlePinLock.status).toBe("won");
      expect(singlePinLock.progress).toBe(100);
      expect(singlePinLock.taps).toBe(2);
    } finally {
      Date.now = originalNow;
    }
  });

  it("advances through multiple pins", () => {
    const twoPinLock = new LockpickLogic({
      progressPerTap: 100,
      decayRate: 0,
      maxPins: 2,
    });

    twoPinLock.tap();
    // Reached 100% on pin 1 -> advances to pin 2 and resets progress
    expect(twoPinLock.currentPin).toBe(2);
    expect(twoPinLock.progress).toBe(0);
    expect(twoPinLock.status).toBe("running");

    twoPinLock.tap();
    // Reached 100% on pin 2 -> completes all pins and wins
    expect(twoPinLock.status).toBe("won");
  });

  it("triggers failed status when failOnZero is enabled and progress decays back to 0", () => {
    const strictLock = new LockpickLogic({
      progressPerTap: 10,
      decayRate: 20,
      failOnZero: true,
    });

    strictLock.tap();
    expect(strictLock.status).toBe("running");
    expect(strictLock.progress).toBe(10);

    // Decay 1 second -> progress drops by 20, hitting 0
    const tickRes = strictLock.tick(1.0);
    expect(tickRes.failed).toBe(true);
    expect(tickRes.failReason).toBe("decay");
    expect(strictLock.status).toBe("failed");
    expect(strictLock.progress).toBe(0);
  });

  it("scales maxing mode difficulty upwards with each level", () => {
    const lvl1 = getMaxingConfig(1);
    const lvl2 = getMaxingConfig(2);
    const lvl5 = getMaxingConfig(5);

    expect(lvl2.decayRate).toBeGreaterThan(lvl1.decayRate);
    expect(lvl2.progressPerTap).toBeLessThan(lvl1.progressPerTap);
    expect(lvl5.decayRate).toBeGreaterThan(lvl2.decayRate);
  });

  it("provides progressive stage difficulties for easy, medium, and hard", () => {
    expect(PROGRESSIVE_STAGES[1].decayRate).toBe(DIFFICULTY_PRESETS.easy.decayRate);
    expect(PROGRESSIVE_STAGES[2].decayRate).toBe(DIFFICULTY_PRESETS.medium.decayRate);
    expect(PROGRESSIVE_STAGES[3].decayRate).toBe(DIFFICULTY_PRESETS.hard.decayRate);
  });

  it("advances through 3-progressive stages with 500ms pause and 3s timeout", () => {
    const prog = new LockpickLogic({ mode: "progressive" });
    expect(prog.currentStage).toBe(1);

    // Complete stage 1
    for (let i = 0; i < 20; i++) prog.tap();
    expect(prog.status).toBe("stage_complete");
    expect(prog.currentStage).toBe(1);

    // Advance to stage 2
    prog.advanceStage();
    expect(prog.currentStage).toBe(2);
    expect(prog.status).toBe("waiting_start");
    expect(prog.stageTimeLeft).toBe(3.0);

    // Test timeout if not tapped within 3s
    const timeoutRes = prog.tick(3.1);
    expect(timeoutRes.failed).toBe(true);
    expect(timeoutRes.failReason).toBe("timeout");
    expect(prog.status).toBe("failed");
  });
});

describe("tap cadence analytics", () => {
  function traceOf(tapTimes: number[]): CpsTrace {
    const buckets: number[] = [];
    for (const t of tapTimes) bucketTap(buckets, t);
    const duration = tapTimes.length > 0 ? Math.max(...tapTimes) : 0;
    return { buckets, duration, truncated: false };
  }

  it("stops growing once the trace reaches its ceiling", () => {
    const buckets: number[] = [];
    let accepted = 0;
    for (let i = 0; i < MAX_BUCKETS + 500; i += 1) {
      if (bucketTap(buckets, i * BUCKET_SECONDS)) accepted += 1;
    }
    expect(accepted).toBe(MAX_BUCKETS);
    expect(buckets).toHaveLength(MAX_BUCKETS);
  });

  it("counts several taps landing in the same bucket", () => {
    const buckets: number[] = [];
    for (const t of [0.01, 0.05, 0.26, 0.3]) bucketTap(buckets, t);
    expect(buckets).toEqual([2, 2]);
  });

  it("returns nothing for a run with no taps", () => {
    expect(cpsSeries(traceOf([]), 50)).toEqual([]);
  });

  it("spans the run from its first instant to its last", () => {
    // Sampling each column at its right edge leaves the trace starting a whole
    // column in from the left, so the run never reaches the axis origin.
    const points = cpsSeries(traceOf([0.25, 0.5, 0.75, 1]), 40);
    expect(points[0].t).toBe(0);
    expect(points[points.length - 1].t).toBeCloseTo(1);
  });

  it("emits a sample per column plus the closing instant", () => {
    const long = traceOf(Array.from({ length: 2000 }, (_, i) => i * 0.25));
    expect(cpsSeries(long, 200)).toHaveLength(201);
    expect(cpsSeries(long, 37)).toHaveLength(38);
  });

  it("ramps up as the window fills, then tracks the steady rate", () => {
    const steady = traceOf(Array.from({ length: 16 }, (_, i) => (i + 1) * 0.25));
    const points = cpsSeries(steady, 40);
    // The window always spans the full second, so a young run under-reports
    // rather than spiking; it settles on the true rate once it has filled.
    expect(points[4].cps).toBeLessThan(points[20].cps);
    expect(points[20].t).toBeCloseTo(2);
    expect(points[20].cps).toBeCloseTo(4);
  });

  it("spikes above a steady baseline", () => {
    const taps = [
      ...Array.from({ length: 8 }, (_, i) => 0.1 + i * 0.1),
      ...Array.from({ length: 16 }, (_, i) => 2 + i * 0.25),
    ];
    const points = cpsSeries(traceOf(taps), 40);
    const atBurst = points.find((p) => p.t >= 0.8);
    const later = points.find((p) => p.t >= 5);
    expect(atBurst?.cps).toBeCloseTo(8);
    expect(later?.cps).toBeCloseTo(4);
  });

  it("decays to zero once the player stops tapping", () => {
    // The run keeps going after the last tap, so the window has to slide past
    // the recorded buckets instead of re-reading the last few of them.
    const stopped: CpsTrace = {
      buckets: traceOf([0.25, 0.5, 0.75, 1]).buckets,
      duration: 6,
      truncated: false,
    };
    const points = cpsSeries(stopped, 60);
    expect(points.find((p) => p.t >= 2.5)?.cps).toBeCloseTo(0);
    expect(points[points.length - 1].t).toBeCloseTo(6);
    expect(points[points.length - 1].cps).toBeCloseTo(0);
  });

  it("never draws more columns than the run has buckets", () => {
    // 600 columns over 40 buckets would draw each value nine times over,
    // which is what turns the trace into a staircase of vertical lines.
    expect(chartColumns(40 * BUCKET_SECONDS, 600)).toBe(40);
  });

  it("caps at the plot width once a run outruns it", () => {
    expect(chartColumns(5000 * BUCKET_SECONDS, 600)).toBe(600);
  });

  it("draws nothing for a run with no time", () => {
    expect(chartColumns(0, 600)).toBe(0);
  });

  it("anchors columns to absolute time so the trace holds still", () => {
    // Re-normalising a growing run by its own duration moves every point on
    // each new bucket, which reads as a snake. Columns must land on the same
    // instants however far the run has gone.
    const buckets: number[] = [];
    for (let i = 0; i < 40; i += 1) bucketTap(buckets, (i + 0.5) * BUCKET_SECONDS);
    const at10s = cpsSeries({ buckets, duration: 10, truncated: false }, chartColumns(10, 600));
    const at20s = cpsSeries({ buckets, duration: 20, truncated: false }, chartColumns(20, 600));
    for (let i = 0; i < 40; i += 1) {
      expect(at20s[i].t).toBeCloseTo(at10s[i].t);
    }
  });

  it("smooths without moving points in time", () => {
    const flat = [
      { t: 0, cps: 4 },
      { t: 1, cps: 4 },
      { t: 2, cps: 4 },
    ];
    expect(smoothSeries(flat).map((p) => p.cps)).toEqual([4, 4, 4]);
    expect(smoothSeries(flat).map((p) => p.t)).toEqual([0, 1, 2]);
  });

  it("pulls a spike down toward its neighbours", () => {
    const spiky = [
      { t: 0, cps: 0 },
      { t: 1, cps: 8 },
      { t: 2, cps: 0 },
    ];
    const smoothed = smoothSeries(spiky);
    expect(smoothed[1].cps).toBeLessThan(8);
    expect(smoothed[1].cps).toBeGreaterThan(0);
  });

  it("leaves the series untouched when smoothing is off", () => {
    const points = [
      { t: 0, cps: 0 },
      { t: 1, cps: 8 },
      { t: 2, cps: 0 },
    ];
    expect(smoothSeries(points, 1)).toEqual(points);
  });

  it("ranks a run by its average cadence", () => {
    expect(traceCps(traceOf([0.25, 0.5, 0.75, 1]))).toBeCloseTo(4);
    expect(traceCps({ buckets: [], duration: 0, truncated: false })).toBe(0);
  });
});
