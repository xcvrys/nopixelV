/**
 * Domain types for the Lockpick minigame engine.
 */

export type GameMode = 'single' | 'progressive' | 'maxing';

export type SingleDifficulty = 'easy' | 'medium' | 'hard' | 'custom';

export type LockpickStatus =
 | 'idle'
 | 'waiting_start'
 | 'running'
 | 'stage_complete'
 | 'won'
 | 'failed'
 | 'lost';

export type LockpickFailReason = 'decay' | 'timeout' | null;

export interface DifficultyConfig {
 decayRate: number;
 progressPerTap: number;
 label: string;
}

export interface LockpickOptions {
 progressPerTap?: number;
 decayRate?: number;
 maxPins?: number;
 failOnZero?: boolean;
 mode?: GameMode;
}

export interface LockpickTapResult {
 tapped: boolean;
 stageCompleted: boolean;
 runWon: boolean;
 stage: number;
 level: number;
 newBestStreak: boolean;
 pinAdvanced?: boolean;
 won?: boolean;
}

export interface LockpickTickResult {
 failed: boolean;
 failReason: LockpickFailReason;
}

export interface LockpickSnapshot {
 status: LockpickStatus;
 mode: GameMode;
 singleDifficulty: SingleDifficulty;
 currentStage: number;
 currentLevel: number;
 progress: number;
 stageTimeLeft: number;
 failReason: LockpickFailReason;
 runTaps: number;
 runElapsedTime: number;
 currentRunCps: string;
 isRunActive: boolean;
 bestStreak: number;
 bestStreakTime: number;
 lastRunTaps: number;
 lastRunTime: number;
 lastRunCps: string;
 decayRate: number;
 progressPerTap: number;
}
