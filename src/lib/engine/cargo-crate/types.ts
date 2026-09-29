export type CargoTrack = "A" | "B" | "C";

export const CARGO_TRACKS: readonly CargoTrack[] = ["A", "B", "C"];

/** Keyboard key that scores each lane, lowercase to match `KeyboardEvent.key`. */
export const CARGO_TRACK_KEYS: Record<CargoTrack, string> = { A: "a", B: "s", C: "d" };

export type CargoStatus = "idle" | "playing" | "success" | "failed";

export type CargoCrate = {
  id: number;
  track: CargoTrack;
  /** Position across the lane: 1 at the right edge, 0 at the left. */
  x: number;
};

export type CargoFeedback = { track: CargoTrack; kind: "hit" | "miss" };

export type CargoPressResult = "hit" | "miss" | "ignored";

export type CargoCrateSnapshot = {
  status: CargoStatus;
  crates: readonly CargoCrate[];
  progress: number;
  streak: number;
  misses: number;
  feedback: CargoFeedback | null;
};

/** Returns a float in `[0, 1)`. */
export type Rng = () => number;

export type CargoCrateConfig = {
  targetProgress: number;
  maxMisses: number;
  /** Time a crate needs to cross the whole lane. */
  crateTravelSeconds: number;
  /** Normalised lane positions bounding the judge band; a crate inside is hittable. */
  hitWindowStart: number;
  hitWindowEnd: number;
  spawnGapStartSeconds: number;
  spawnGapEndSeconds: number;
  /** Multipliers applied to the nominal gap so pacing is not metronomic. */
  spawnJitterMin: number;
  spawnJitterMax: number;
  /** Share of spawns that queue a partner crate on a free lane. */
  chordChance: number;
  /** Delay between a spawn and its chord partner, widening the two-key window. */
  chordStaggerSeconds: number;
  /** How long a row stays outlined after a hit or a miss. */
  feedbackSeconds: number;
};
