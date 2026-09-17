import { audioStore } from '$lib/stores/audio.svelte';
import { getValue, setValue } from '$lib/db/storage';
import {
	LockpickLogic,
	STAGE_TIMEOUT,
	type GameMode,
	type LockpickSnapshot
} from '$lib/engine/lockpick';

export type { GameMode, LockpickSnapshot };

export interface LockpickSettings {
	mode: GameMode;
	singleDifficulty: 'easy' | 'medium' | 'hard' | 'custom';
	decayRate: number;
	progressPerTap: number;
}

export interface LockpickStats {
	bestStreak: number;
	bestStreakTime: number;
}

const LOCKPICK_SETTINGS_KEY = 'nopixelv_lockpick_settings_v1';
const LOCKPICK_STATS_KEY = 'nopixelv_lockpick_stats_v1';

export class LockpickStore {
	private readonly engine = new LockpickLogic();
	private animationFrame: number | null = null;
	private keyPressTimer: number | undefined;
	private stagePauseTimer: number | undefined;
	private failResetTimer: number | undefined;
	private winResetTimer: number | undefined;
	private lastTick = 0;
	private isStarted = false;
	private persistedStats: LockpickStats | null = null;

	public readonly stageTimeout = STAGE_TIMEOUT;
	public snapshot = $state<LockpickSnapshot>(this.engine.snapshot);
	public isKeyPressed = $state(false);
	public isFailedShaking = $state(false);

	public async start(): Promise<void> {
		if (this.isStarted) return;
		this.isStarted = true;
		window.addEventListener('keydown', this.handleKeyDown);

		await this.restorePersistedState();
		if (!this.isStarted) return;

		this.lastTick = performance.now();
		this.animationFrame = requestAnimationFrame(this.loop);
	}

	public stop(): void {
		this.isStarted = false;
		window.removeEventListener('keydown', this.handleKeyDown);
		if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
		this.animationFrame = null;
		this.clearTimers();
	}

	public tap(): void {
		audioStore.playLockpickClick();
		this.flashKeycap();

		const result = this.engine.tap();
		this.syncState();

		if (result.runWon) {
			audioStore.playSuccessChime();
			this.scheduleWinReset();
		} else if (result.stageCompleted) {
			audioStore.playSuccessChime();
			this.scheduleStageAdvance();
		}
	}

	public setMode(mode: GameMode): void {
		this.engine.setMode(mode);
		this.syncState();
		this.persistSettings();
	}

	public setSingleDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
		this.engine.setSingleDifficulty(difficulty);
		this.syncState();
		this.persistSettings();
	}

	public setPhysics(
		field: 'decayRate' | 'progressPerTap',
		value: number
	): void {
		const nextDecayRate = field === 'decayRate' ? value : this.snapshot.decayRate;
		const nextProgressPerTap =
			field === 'progressPerTap' ? value : this.snapshot.progressPerTap;
		this.engine.setCustomPhysics(nextDecayRate, nextProgressPerTap);
		this.syncState();
		this.persistSettings();
	}

	public resetPhysicsPreset(): void {
		this.engine.applyDifficultyForCurrentState();
		this.syncState();
		this.persistSettings();
	}

	public reset(): void {
		this.clearTimers();
		this.isFailedShaking = false;
		this.engine.reset();
		this.syncState();
	}

	private currentSettings(): LockpickSettings {
		return {
			mode: this.engine.mode,
			singleDifficulty: this.engine.singleDifficulty,
			decayRate: this.engine.decayRate,
			progressPerTap: this.engine.progressPerTap
		};
	}

	private persistSettings(): void {
		void setValue(LOCKPICK_SETTINGS_KEY, this.currentSettings());
	}

	private syncState(): void {
		const snapshot = this.engine.snapshot;
		this.snapshot = snapshot;

		const stats = {
			bestStreak: snapshot.bestStreak,
			bestStreakTime: snapshot.bestStreakTime
		};
		if (
			this.persistedStats &&
			(stats.bestStreak !== this.persistedStats.bestStreak ||
				stats.bestStreakTime !== this.persistedStats.bestStreakTime)
		) {
			this.persistedStats = stats;
			void setValue(LOCKPICK_STATS_KEY, stats);
		}
	}

	private async restorePersistedState(): Promise<void> {
		const [settings, stats] = await Promise.all([
			getValue<LockpickSettings>(LOCKPICK_SETTINGS_KEY),
			getValue<LockpickStats>(LOCKPICK_STATS_KEY)
		]);

		if (settings) {
			this.engine.setMode(settings.mode);
			if (settings.mode === 'single') {
				if (settings.singleDifficulty !== 'custom') {
					this.engine.setSingleDifficulty(settings.singleDifficulty);
				} else {
					this.engine.setCustomPhysics(settings.decayRate, settings.progressPerTap);
				}
			}
		}

		if (stats) {
			this.engine.bestStreak = stats.bestStreak;
			this.engine.bestStreakTime = stats.bestStreakTime;
		}
		this.persistedStats = {
			bestStreak: this.engine.bestStreak,
			bestStreakTime: this.engine.bestStreakTime
		};
		this.syncState();
	}

	private flashKeycap(): void {
		this.isKeyPressed = true;
		clearTimeout(this.keyPressTimer);
		this.keyPressTimer = window.setTimeout(() => {
			this.isKeyPressed = false;
			this.keyPressTimer = undefined;
		}, 75);
	}

	private scheduleStageAdvance(): void {
		clearTimeout(this.stagePauseTimer);
		this.stagePauseTimer = window.setTimeout(() => {
			this.engine.advanceStage();
			this.syncState();
			this.stagePauseTimer = undefined;
		}, 500);
	}

	private scheduleWinReset(): void {
		clearTimeout(this.winResetTimer);
		this.winResetTimer = window.setTimeout(() => {
			this.reset();
			this.winResetTimer = undefined;
		}, 1400);
	}

	private handleVisualFailure(): void {
		this.isFailedShaking = true;
		audioStore.playFailBuzz();

		clearTimeout(this.failResetTimer);
		this.failResetTimer = window.setTimeout(() => {
			this.isFailedShaking = false;
			this.reset();
			this.failResetTimer = undefined;
		}, 900);
	}

	private clearTimers(): void {
		clearTimeout(this.keyPressTimer);
		clearTimeout(this.stagePauseTimer);
		clearTimeout(this.failResetTimer);
		clearTimeout(this.winResetTimer);
		this.keyPressTimer = undefined;
		this.stagePauseTimer = undefined;
		this.failResetTimer = undefined;
		this.winResetTimer = undefined;
		this.isKeyPressed = false;
	}

	private loop = (now: number): void => {
		const delta = Math.min(0.1, (now - this.lastTick) / 1000);
		this.lastTick = now;

		const tickResult = this.engine.tick(delta);
		this.syncState();
		if (tickResult.failed) this.handleVisualFailure();

		if (this.isStarted) this.animationFrame = requestAnimationFrame(this.loop);
	};

	private handleKeyDown = (event: KeyboardEvent): void => {
		if (event.repeat) return;
		if (event.key === 'e' || event.key === 'E') {
			event.preventDefault();
			this.tap();
		}
	};
}

export function createLockpickStore(): LockpickStore {
	return new LockpickStore();
}
