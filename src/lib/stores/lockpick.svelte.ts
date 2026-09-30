import { audioStore } from "$lib/stores/audio.svelte";
import { getValue, setValue } from "$lib/db/storage";
import { detectInputMode, type InputMode } from "$lib/input/device";
import {
  LockpickLogic,
  bucketTap,
  STAGE_TIMEOUT,
  traceCps,
  type CpsTrace,
  type GameMode,
  type LockpickSnapshot,
} from "$lib/engine/lockpick";

export type { CpsTrace, GameMode, LockpickSnapshot };

export interface LockpickSettings {
  mode: GameMode;
  singleDifficulty: "easy" | "medium" | "hard" | "custom";
  decayRate: number;
  progressPerTap: number;
}

export interface LockpickStats {
  bestStreak: number;
  bestStreakTime: number;
}

const LOCKPICK_SETTINGS_KEY = "nopixelv_lockpick_settings_v1";
const LOCKPICK_STATS_KEY = "nopixelv_lockpick_stats_v1";
const LOCKPICK_BEST_CPS_KEY = "nopixelv_lockpick_best_cps_v1";

function isCpsTrace(trace: CpsTrace | undefined): boolean {
  return typeof trace?.duration === "number" && Array.isArray(trace?.buckets);
}

export class LockpickStore {
  private readonly engine = new LockpickLogic();
  private animationFrame: number | null = null;
  private keyPressTimer: number | undefined;
  private stagePauseTimer: number | undefined;
  private failResetTimer: number | undefined;
  private winResetTimer: number | undefined;
  private lastTick = 0;
  private isStarted = false;
  private keyboardInputRegistered = false;
  private persistedStats: LockpickStats | null = null;
  private bestCpsByConfig: Record<string, CpsTrace> = {};

  public readonly stageTimeout = STAGE_TIMEOUT;
  public inputMode = $state<InputMode>("keyboard");
  public snapshot = $state<LockpickSnapshot>(this.engine.snapshot);
  public isKeyPressed = $state(false);
  public isFailedShaking = $state(false);
  /** Tap counts per 250ms bucket for the run in progress, bounded in length. */
  public tapBuckets: number[] = $state([]);
  /** Fastest run recorded for the current mode and difficulty. */
  public bestTrace: CpsTrace | null = $state(null);
  /** True once a run outgrew the trace ceiling, so the chart stops extending. */
  public traceTruncated = $state(false);

  public async start(): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;
    this.inputMode = detectInputMode();
    if (this.inputMode === "keyboard") {
      window.addEventListener("keydown", this.handleKeyDown);
      this.keyboardInputRegistered = true;
    }

    await this.restorePersistedState();
    if (!this.isStarted) return;

    this.lastTick = performance.now();
    this.animationFrame = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.isStarted = false;
    if (this.keyboardInputRegistered) {
      window.removeEventListener("keydown", this.handleKeyDown);
      this.keyboardInputRegistered = false;
    }
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.clearTimers();
  }

  public tap(): void {
    if (
      this.snapshot.status === "failed" ||
      this.snapshot.status === "lost" ||
      this.snapshot.status === "stage_complete" ||
      this.snapshot.status === "won"
    ) {
      return;
    }

    audioStore.playLockpickClick();
    this.flashKeycap();

    const result = this.engine.tap();
    if (!bucketTap(this.tapBuckets, this.engine.runElapsedTime)) this.traceTruncated = true;
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
    this.tapBuckets = [];
    this.traceTruncated = false;
    this.refreshBestTrace();
    this.syncState();
    this.persistSettings();
  }

  public setSingleDifficulty(difficulty: "easy" | "medium" | "hard"): void {
    this.engine.setSingleDifficulty(difficulty);
    this.tapBuckets = [];
    this.traceTruncated = false;
    this.refreshBestTrace();
    this.syncState();
    this.persistSettings();
  }

  public setPhysics(field: "decayRate" | "progressPerTap", value: number): void {
    const nextDecayRate = field === "decayRate" ? value : this.snapshot.decayRate;
    const nextProgressPerTap = field === "progressPerTap" ? value : this.snapshot.progressPerTap;
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
    this.recordRunIfBest();
    this.engine.reset();
    this.tapBuckets = [];
    this.traceTruncated = false;
    this.syncState();
  }

  private currentSettings(): LockpickSettings {
    return {
      mode: this.engine.mode,
      singleDifficulty: this.engine.singleDifficulty,
      decayRate: this.engine.decayRate,
      progressPerTap: this.engine.progressPerTap,
    };
  }

  private persistSettings(): void {
    void setValue(LOCKPICK_SETTINGS_KEY, this.currentSettings());
  }

  private configKey(): string {
    return `${this.engine.mode}:${this.engine.singleDifficulty}`;
  }

  /** Keeps the run just finished only if its average cadence beats the stored best. */
  private recordRunIfBest(): void {
    const duration = this.engine.runElapsedTime;
    if (this.tapBuckets.length < 2 || duration <= 0) return;

    const candidate: CpsTrace = {
      buckets: [...this.tapBuckets],
      duration,
      truncated: this.traceTruncated,
    };
    const stored = this.bestCpsByConfig[this.configKey()] ?? null;
    if (stored && traceCps(stored) >= traceCps(candidate)) return;

    this.bestCpsByConfig[this.configKey()] = candidate;
    this.bestTrace = candidate;
    void setValue(LOCKPICK_BEST_CPS_KEY, this.bestCpsByConfig);
  }

  private refreshBestTrace(): void {
    this.bestTrace = this.bestCpsByConfig[this.configKey()] ?? null;
  }

  private syncState(): void {
    const snapshot = this.engine.snapshot;
    this.snapshot = snapshot;

    const stats = {
      bestStreak: snapshot.bestStreak,
      bestStreakTime: snapshot.bestStreakTime,
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
    const [settings, stats, bestCps] = await Promise.all([
      getValue<LockpickSettings>(LOCKPICK_SETTINGS_KEY),
      getValue<LockpickStats>(LOCKPICK_STATS_KEY),
      getValue<Record<string, CpsTrace>>(LOCKPICK_BEST_CPS_KEY),
    ]);

    if (settings) {
      this.engine.setMode(settings.mode);
      if (settings.mode === "single") {
        if (settings.singleDifficulty !== "custom") {
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
      bestStreakTime: this.engine.bestStreakTime,
    };
    // Storage is not validated on read, so a record left by an older build
    // would otherwise reach cpsSeries and throw on a missing buckets array.
    this.bestCpsByConfig = Object.fromEntries(
      Object.entries(bestCps ?? {}).filter(([, trace]) => isCpsTrace(trace)),
    );
    this.refreshBestTrace();
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
    if (event.key === "e" || event.key === "E") {
      event.preventDefault();
      this.tap();
    }
  };
}

export function createLockpickStore(): LockpickStore {
  return new LockpickStore();
}
