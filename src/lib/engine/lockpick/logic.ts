import type {
	GameMode,
	SingleDifficulty,
	LockpickStatus,
	LockpickFailReason,
	LockpickOptions,
	LockpickTapResult,
	LockpickTickResult,
	LockpickSnapshot
} from './types';
import {
	DIFFICULTY_PRESETS,
	PROGRESSIVE_STAGES,
	STAGE_TIMEOUT,
	STAGE_PAUSE_MS,
	INPUT_BUFFER_WINDOW_MS,
	getMaxingConfig
} from './constants';

export class LockpickLogic {
	public mode: GameMode;
	public singleDifficulty: SingleDifficulty = 'medium';
	public status: LockpickStatus = 'idle';
	public failReason: LockpickFailReason = null;

	public progress: number = 0;
	public decayRate: number = 8.5;
	public progressPerTap: number = 6.5;

	public currentStage: number = 1;
	public currentLevel: number = 1;
	public stageTimeLeft: number = STAGE_TIMEOUT;

	public runTaps: number = 0;
	public runElapsedTime: number = 0;
	public isRunActive: boolean = false;
	public hasStartedTapping: boolean = false;

	public bestStreak: number = 0;
	public bestStreakTime: number = 0;

	public lastRunTaps: number = 0;
	public lastRunTime: number = 0;
	public lastRunCps: string = '0.0';

	public maxPins: number = 1;
	public failOnZero: boolean;

	private winTime: number = 0;
	private stageCompleteTime: number = 0;
	private hasBufferedNextStageTap: boolean = false;

	constructor(options: LockpickOptions = {}) {
		this.failOnZero = options.failOnZero ?? true;
		this.mode = options.mode ?? (options.maxPins !== undefined ? 'single' : 'progressive');
		this.maxPins = options.maxPins ?? 1;

		if (options.progressPerTap !== undefined || options.decayRate !== undefined) {
			this.singleDifficulty = 'custom';
			this.progressPerTap = options.progressPerTap ?? DIFFICULTY_PRESETS.easy.progressPerTap;
			this.decayRate = options.decayRate ?? DIFFICULTY_PRESETS.easy.decayRate;
		} else {
			this.applyDifficultyForCurrentState();
		}
	}

	get currentPin(): number {
		return this.currentStage;
	}

	get taps(): number {
		return this.runTaps;
	}

	get currentCps(): string {
		return this.runElapsedTime > 0 ? (this.runTaps / this.runElapsedTime).toFixed(1) : '0.0';
	}

	get snapshot(): LockpickSnapshot {
		return {
			status: this.status,
			mode: this.mode,
			singleDifficulty: this.singleDifficulty,
			currentStage: this.currentStage,
			currentLevel: this.currentLevel,
			progress: this.progress,
			stageTimeLeft: this.stageTimeLeft,
			failReason: this.failReason,
			runTaps: this.runTaps,
			runElapsedTime: this.runElapsedTime,
			currentRunCps: this.currentCps,
			isRunActive: this.isRunActive,
			bestStreak: this.bestStreak,
			bestStreakTime: this.bestStreakTime,
			lastRunTaps: this.lastRunTaps,
			lastRunTime: this.lastRunTime,
			lastRunCps: this.lastRunCps,
			decayRate: this.decayRate,
			progressPerTap: this.progressPerTap
		};
	}

	public tap(): LockpickTapResult {
		if (this.status === 'failed' || this.status === 'lost') {
			return this.createTapResult(false, false, false, false);
		}

		if (this.status === 'stage_complete') {
			this.bufferInputIfNearEnd();
			return this.createTapResult(false, false, false, false);
		}

		if (this.status === 'won') {
			if (Date.now() - this.winTime < 600) {
				return this.createTapResult(false, false, false, false);
			}
			this.reset();
			return this.createTapResult(false, false, false, false);
		}

		if (this.status === 'idle') {
			this.startRun();
		} else if (this.status === 'waiting_start') {
			this.resumeStage();
		}

		this.runTaps++;
		this.progress = Math.min(100, this.progress + this.progressPerTap);

		if (this.progress >= 100) {
			this.progress = 100;
			return this.handleProgressThresholdReached();
		}

		return this.createTapResult(true, false, false, false);
	}

	public tick(deltaSeconds: number): LockpickTickResult {
		if (this.isRunActive) {
			this.runElapsedTime += deltaSeconds;
		}

		if (this.status === 'running') {
			this.progress = Math.max(0, this.progress - this.decayRate * deltaSeconds);

			if (this.failOnZero && this.hasStartedTapping && this.progress <= 0) {
				this.progress = 0;
				return this.triggerFailure('decay');
			}
		} else if (this.status === 'waiting_start') {
			this.stageTimeLeft = Math.max(0, this.stageTimeLeft - deltaSeconds);

			if (this.stageTimeLeft <= 0) {
				this.stageTimeLeft = 0;
				return this.triggerFailure('timeout');
			}
		}

		return { failed: false, failReason: null };
	}

	public advanceStage(): void {
		if (this.status !== 'stage_complete') return;

		if (this.mode === 'progressive') {
			this.currentStage++;
		} else if (this.mode === 'maxing') {
			this.currentLevel++;
		}

		this.applyDifficultyForCurrentState();
		this.progress = 0;
		this.status = 'waiting_start';
		this.stageTimeLeft = STAGE_TIMEOUT;
		this.hasStartedTapping = false;

		// Consume buffered input seamlessly if tapped during the tail of the pause
		if (this.hasBufferedNextStageTap) {
			this.hasBufferedNextStageTap = false;
			this.tap();
		}
	}

	public setMode(mode: GameMode): void {
		if (this.mode === mode) return;
		this.mode = mode;
		this.reset();
	}

	public setSingleDifficulty(diff: 'easy' | 'medium' | 'hard'): void {
		this.singleDifficulty = diff;
		this.applyDifficultyForCurrentState();
		this.reset();
	}

	public setCustomPhysics(decayRate: number, progressPerTap: number): void {
		this.decayRate = decayRate;
		this.progressPerTap = progressPerTap;
		if (this.mode === 'single') {
			this.singleDifficulty = 'custom';
		}
	}

	public reset(): void {
		this.status = 'idle';
		this.progress = 0;
		this.isRunActive = false;
		this.runTaps = 0;
		this.runElapsedTime = 0;
		this.currentStage = 1;
		this.currentLevel = 1;
		this.hasStartedTapping = false;
		this.hasBufferedNextStageTap = false;
		this.failReason = null;
		this.stageTimeLeft = STAGE_TIMEOUT;
		if (this.singleDifficulty !== 'custom') {
			this.applyDifficultyForCurrentState();
		}
	}

	public configure(options: Partial<LockpickOptions>): void {
		if (options.progressPerTap !== undefined) {
			this.progressPerTap = options.progressPerTap;
			this.singleDifficulty = 'custom';
		}
		if (options.decayRate !== undefined) {
			this.decayRate = options.decayRate;
			this.singleDifficulty = 'custom';
		}
		if (options.maxPins !== undefined) this.maxPins = options.maxPins;
		if (options.failOnZero !== undefined) this.failOnZero = options.failOnZero;
		if (options.mode !== undefined) this.mode = options.mode;
		this.reset();
	}


	public applyDifficultyForCurrentState(): void {
		if (this.mode === 'progressive') {
			const stageConf = PROGRESSIVE_STAGES[this.currentStage] || PROGRESSIVE_STAGES[1];
			this.decayRate = stageConf.decayRate;
			this.progressPerTap = stageConf.progressPerTap;
		} else if (this.mode === 'maxing') {
			const lvlConf = getMaxingConfig(this.currentLevel);
			this.decayRate = lvlConf.decayRate;
			this.progressPerTap = lvlConf.progressPerTap;
		} else if (this.mode === 'single') {
			if (this.singleDifficulty !== 'custom') {
				const diffConf = DIFFICULTY_PRESETS[this.singleDifficulty];
				this.decayRate = diffConf.decayRate;
				this.progressPerTap = diffConf.progressPerTap;
			}
		}
	}

	private bufferInputIfNearEnd(): void {
		const elapsedSinceComplete = Date.now() - this.stageCompleteTime;
		const remainingPause = STAGE_PAUSE_MS - elapsedSinceComplete;
		if (remainingPause <= INPUT_BUFFER_WINDOW_MS && remainingPause > 0) {
			this.hasBufferedNextStageTap = true;
		}
	}

	private startRun(): void {
		this.status = 'running';
		this.isRunActive = true;
		this.hasStartedTapping = true;
		this.runTaps = 0;
		this.runElapsedTime = 0;
	}

	private resumeStage(): void {
		this.status = 'running';
		this.hasStartedTapping = true;
	}

	private handleProgressThresholdReached(): LockpickTapResult {
		this.stageCompleteTime = Date.now();
		this.hasBufferedNextStageTap = false;

		if (this.mode === 'progressive') {
			if (this.currentStage < 3) {
				this.status = 'stage_complete';
				return this.createTapResult(true, true, false, false, true, false);
			}
			return this.triggerVictory();
		}

		if (this.mode === 'maxing') {
			this.status = 'stage_complete';
			const newBest = this.updateBestStreakRecord(this.currentLevel);
			return this.createTapResult(true, true, false, newBest, true, false);
		}

		if (this.currentStage < this.maxPins) {
			this.currentStage++;
			this.progress = 0;
			return this.createTapResult(true, false, false, false, true, false);
		}

		return this.triggerVictory();
	}

	private triggerVictory(): LockpickTapResult {
		this.status = 'won';
		this.winTime = Date.now();
		this.isRunActive = false;
		this.recordRunMetrics();
		return this.createTapResult(true, true, true, false, false, true);
	}

	private triggerFailure(reason: 'decay' | 'timeout'): LockpickTickResult {
		this.status = 'failed';
		this.failReason = reason;
		this.isRunActive = false;
		this.recordRunMetrics();

		if (this.mode === 'maxing') {
			this.updateBestStreakRecord(this.currentLevel - 1);
		}

		return { failed: true, failReason: reason };
	}

	private recordRunMetrics(): void {
		this.lastRunTime = this.runElapsedTime;
		this.lastRunTaps = this.runTaps;
		this.lastRunCps = this.lastRunTime > 0 ? (this.lastRunTaps / this.lastRunTime).toFixed(1) : '0.0';
	}

	private updateBestStreakRecord(streak: number): boolean {
		if (streak <= 0) return false;
		const time = this.runElapsedTime;
		const beatsRecord = streak > this.bestStreak;
		const beatsTime = streak === this.bestStreak && (this.bestStreakTime === 0 || time < this.bestStreakTime);

		if (beatsRecord || beatsTime) {
			this.bestStreak = streak;
			this.bestStreakTime = time;
			return true;
		}
		return false;
	}

	private createTapResult(
		tapped: boolean,
		stageCompleted: boolean,
		runWon: boolean,
		newBestStreak: boolean,
		pinAdvanced: boolean = false,
		won: boolean = false
	): LockpickTapResult {
		return {
			tapped,
			stageCompleted,
			runWon,
			stage: this.currentStage,
			level: this.currentLevel,
			newBestStreak,
			pinAdvanced,
			won: won || runWon
		};
	}
}
