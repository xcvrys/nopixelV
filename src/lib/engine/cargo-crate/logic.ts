import { CARGO_CRATE_CONFIG, spawnGapSeconds } from "./constants";
import {
  CARGO_TRACKS,
  type CargoCrate,
  type CargoCrateConfig,
  type CargoCrateSnapshot,
  type CargoFeedback,
  type CargoPressResult,
  type CargoStatus,
  type CargoTrack,
  type Rng,
} from "./types";

/**
 * Three lanes of crates scrolling right to left. A press scores only when a
 * crate on that lane sits inside the judge band; anything else is a miss.
 *
 * Time arrives through `tick`, randomness through the injected `Rng`. The class
 * reads no clock and no global, so a run replays exactly for a given seed.
 */
export class CargoCrateLogic {
  private readonly rng: Rng;
  private readonly config: CargoCrateConfig;
  private crates: CargoCrate[] = [];
  private status: CargoStatus = "idle";
  private progress = 0;
  private streak = 0;
  private misses = 0;
  private feedback: CargoFeedback | null = null;
  private feedbackRemaining = 0;
  private spawnTimer = 0;
  private nextCrateId = 1;
  private chordTimer: number | null = null;
  private chordTrack: CargoTrack | null = null;

  constructor(rng: Rng = Math.random, config: CargoCrateConfig = CARGO_CRATE_CONFIG) {
    this.rng = rng;
    this.config = config;
  }

  get snapshot(): CargoCrateSnapshot {
    return {
      status: this.status,
      crates: this.crates.map((crate) => ({ ...crate })),
      progress: this.progress,
      streak: this.streak,
      misses: this.misses,
      feedback: this.feedback,
    };
  }

  public start(): void {
    this.crates = [];
    this.status = "playing";
    this.progress = 0;
    this.streak = 0;
    this.misses = 0;
    this.feedback = null;
    this.feedbackRemaining = 0;
    this.spawnTimer = 0;
    this.nextCrateId = 1;
    this.chordTimer = null;
    this.chordTrack = null;
  }

  public press(track: CargoTrack): CargoPressResult {
    if (this.status !== "playing") return "ignored";

    const targetIndex = this.findLeftmostInBand(track);
    if (targetIndex >= 0) {
      this.crates.splice(targetIndex, 1);
      this.progress += 1;
      this.streak += 1;
      this.setFeedback(track, "hit");
      this.evaluateStatus();
      return "hit";
    }

    this.registerMiss(track);
    return "miss";
  }

  public tick(deltaSeconds: number): void {
    if (this.status !== "playing" || deltaSeconds <= 0) return;

    const travelled = deltaSeconds / this.config.crateTravelSeconds;
    const alive: CargoCrate[] = [];
    for (const crate of this.crates) {
      const x = crate.x - travelled;
      if (x > 0) {
        alive.push({ ...crate, x });
      } else if (this.status === "playing") {
        this.registerMiss(crate.track);
      }
    }
    this.crates = alive;
    if (this.status !== "playing") return;

    this.advanceSchedule(deltaSeconds);

    if (this.feedbackRemaining > 0) {
      this.feedbackRemaining -= deltaSeconds;
      if (this.feedbackRemaining <= 0) this.feedback = null;
    }
  }

  private findLeftmostInBand(track: CargoTrack): number {
    let bestIndex = -1;
    let bestX = Number.POSITIVE_INFINITY;
    for (const [index, crate] of this.crates.entries()) {
      if (crate.track !== track) continue;
      if (crate.x < this.config.hitWindowStart || crate.x > this.config.hitWindowEnd) continue;
      if (crate.x < bestX) {
        bestX = crate.x;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  /**
   * Spawns are paced by a jittered gap rather than a fixed one, and a share of
   * them queue a partner on a free lane so two keys can be demanded at once.
   */
  private advanceSchedule(deltaSeconds: number): void {
    if (this.chordTimer !== null) {
      this.chordTimer -= deltaSeconds;
      if (this.chordTimer <= 0) {
        if (this.chordTrack !== null) this.spawnCrate(this.chordTrack);
        this.chordTimer = null;
        this.chordTrack = null;
      }
    }

    this.spawnTimer -= deltaSeconds;
    if (this.spawnTimer > 0) return;

    const lead = this.pickFreeTrack();
    if (lead === null) {
      this.spawnTimer = this.config.chordStaggerSeconds;
      return;
    }
    this.spawnCrate(lead);
    const jitter =
      this.config.spawnJitterMin +
      (this.config.spawnJitterMax - this.config.spawnJitterMin) * this.rng();
    this.spawnTimer = spawnGapSeconds(this.progress, this.config) * jitter;

    if (this.rng() >= this.config.chordChance) return;
    const partner = this.pickFreeTrack(lead);
    if (partner === null) return;
    this.chordTrack = partner;
    this.chordTimer = this.config.chordStaggerSeconds;
  }

  private spawnCrate(track: CargoTrack): void {
    this.crates.push({ id: this.nextCrateId, track, x: 1 });
    this.nextCrateId += 1;
  }

  /** Prefers a lane with nothing in the judge band, so a chord is always two keys. */
  private pickFreeTrack(exclude?: CargoTrack): CargoTrack | null {
    const pool = CARGO_TRACKS.filter((track) => track !== exclude && !this.hasCrateInBand(track));
    if (pool.length === 0) return null;
    return pool[Math.min(pool.length - 1, Math.floor(this.rng() * pool.length))];
  }

  private hasCrateInBand(track: CargoTrack): boolean {
    return this.crates.some(
      (crate) =>
        crate.track === track &&
        crate.x >= this.config.hitWindowStart &&
        crate.x <= this.config.hitWindowEnd,
    );
  }

  private registerMiss(track: CargoTrack): void {
    this.misses += 1;
    this.streak = 0;
    this.setFeedback(track, "miss");
    this.evaluateStatus();
  }

  private setFeedback(track: CargoTrack, kind: CargoFeedback["kind"]): void {
    this.feedback = { track, kind };
    this.feedbackRemaining = this.config.feedbackSeconds;
  }

  private evaluateStatus(): void {
    if (this.progress >= this.config.targetProgress) this.status = "success";
    else if (this.misses >= this.config.maxMisses) this.status = "failed";
  }
}
