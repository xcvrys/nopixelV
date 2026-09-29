import type { CargoCrateConfig } from "./types";

export const CARGO_CRATE_CONFIG: CargoCrateConfig = {
  targetProgress: 24,
  maxMisses: 6,
  crateTravelSeconds: 1.4,
  hitWindowStart: 0.0865,
  hitWindowEnd: 0.1565,
  spawnGapStartSeconds: 0.52,
  spawnGapEndSeconds: 0.33,
  spawnJitterMin: 0.8,
  spawnJitterMax: 1.25,
  chordChance: 0.3,
  chordStaggerSeconds: 0.045,
  feedbackSeconds: 0.3,
};

/** Spawn gap interpolates linearly from the first to the last target of a run. */
export function spawnGapSeconds(
  progress: number,
  config: CargoCrateConfig = CARGO_CRATE_CONFIG,
): number {
  const span = Math.max(1, config.targetProgress - 1);
  const ratio = Math.min(1, Math.max(0, progress / span));
  const delta = config.spawnGapEndSeconds - config.spawnGapStartSeconds;
  return config.spawnGapStartSeconds + delta * ratio;
}
