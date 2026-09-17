import type { DifficultyConfig } from './types';

/**
 * Standard difficulty presets for single and progressive modes.
 */
export const DIFFICULTY_PRESETS: Record<'easy' | 'medium' | 'hard', DifficultyConfig> = {
 easy: { decayRate: 8.5, progressPerTap: 6.5, label: 'EASY' },
 medium: { decayRate: 13.5, progressPerTap: 5.2, label: 'MEDIUM' },
 hard: { decayRate: 20.0, progressPerTap: 4.0, label: 'HARD' }
};

/**
 * Progressive heist mode stages (1 = Easy, 2 = Medium, 3 = Hard).
 */
export const PROGRESSIVE_STAGES: Record<number, DifficultyConfig> = {
 1: DIFFICULTY_PRESETS.easy,
 2: DIFFICULTY_PRESETS.medium,
 3: DIFFICULTY_PRESETS.hard
};

/**
 * Duration in seconds to tap 'E' when a new stage appears before failing.
 */
export const STAGE_TIMEOUT = 3.0;

/**
 * Pause in milliseconds holding full lockpick before advancing to next stage.
 */
export const STAGE_PAUSE_MS = 500;

/**
 * Window in milliseconds at the tail of the stage pause where taps are buffered.
 */
export const INPUT_BUFFER_WINDOW_MS = 120;

/**
 * Dynamically computes scaling difficulty curve for infinite Maxing mode.
 */
export function getMaxingConfig(level: number): DifficultyConfig {
 const lvl = Math.max(1, level);
 return {
  decayRate: Number((6.0 + (lvl - 1) * 0.95).toFixed(2)),
  progressPerTap: Number(Math.max(3.2, 8.0 - (lvl - 1) * 0.32).toFixed(2)),
  label: `LEVEL ${lvl}`
 };
}
