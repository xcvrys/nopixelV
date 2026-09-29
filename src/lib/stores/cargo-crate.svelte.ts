import { getValue, setValue } from "$lib/db/storage";
import {
  CARGO_TRACKS,
  CARGO_TRACK_KEYS,
  CargoCrateLogic,
  type CargoCrateSnapshot,
  type CargoTrack,
} from "$lib/engine/cargo-crate";
import { audioStore } from "$lib/stores/audio.svelte";

export type { CargoCrateSnapshot, CargoTrack };

export interface CargoCrateStats {
  bestStreak: number;
  bestProgress: number;
}

const CARGO_CRATE_STATS_KEY = "nopixelv_cargo_stats_v1";
const KEY_FLASH_MS = 120;

const TRACK_BY_KEY: Record<string, CargoTrack> = Object.fromEntries(
  CARGO_TRACKS.map((track) => [CARGO_TRACK_KEYS[track], track]),
);

const EMPTY_STATS: CargoCrateStats = { bestStreak: 0, bestProgress: 0 };

export class CargoCrateStore {
  private readonly engine = new CargoCrateLogic();
  private animationFrame: number | null = null;
  private lastTick = 0;
  private keyFlashTimer: number | undefined;
  private isListening = false;
  private statsRecord: CargoCrateStats | null = null;

  public snapshot = $state<CargoCrateSnapshot>(this.engine.snapshot);
  public pressedTrack = $state<CargoTrack | null>(null);
  public best = $state<CargoCrateStats>(EMPTY_STATS);

  /** Restore persisted bests and listen for input. Leaves the run in `idle`. */
  public async start(): Promise<void> {
    if (this.isListening) return;
    this.isListening = true;
    await this.restoreStats();
    window.addEventListener("keydown", this.handleKeyDown);
  }

  public stop(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.clearTimeout(this.keyFlashTimer);
    this.stopLoop();
    this.pressedTrack = null;
    this.isListening = false;
  }

  /** Begin a fresh run from `idle` or from a finished run. */
  public launch(): void {
    this.engine.start();
    this.snapshot = this.engine.snapshot;
    this.pressedTrack = null;
    this.startLoop();
  }

  public press(track: CargoTrack): void {
    if (this.snapshot.status !== "playing") return;
    this.pressedTrack = track;
    window.clearTimeout(this.keyFlashTimer);
    this.keyFlashTimer = window.setTimeout(() => {
      this.pressedTrack = null;
    }, KEY_FLASH_MS);

    const result = this.engine.press(track);
    if (result === "hit") audioStore.playLockpickClick();
    if (result === "miss") audioStore.playFailBuzz();
    this.syncState();
    if (this.snapshot.status !== "playing") this.finishRun();
  }

  private readonly loop = (now: number): void => {
    const deltaSeconds = (now - this.lastTick) / 1000;
    this.lastTick = now;
    this.engine.tick(deltaSeconds);
    this.syncState();
    if (this.snapshot.status !== "playing") {
      this.finishRun();
      return;
    }
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;

    if (this.snapshot.status === "idle") {
      event.preventDefault();
      this.launch();
      return;
    }

    if (this.snapshot.status !== "playing") {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.launch();
      }
      return;
    }

    const track = TRACK_BY_KEY[event.key.toLowerCase()];
    if (!track) return;
    event.preventDefault();
    this.press(track);
  };

  private startLoop(): void {
    this.stopLoop();
    this.lastTick = performance.now();
    this.animationFrame = requestAnimationFrame(this.loop);
  }

  private stopLoop(): void {
    if (this.animationFrame === null) return;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
  }

  private syncState(): void {
    this.snapshot = this.engine.snapshot;
  }

  private finishRun(): void {
    this.stopLoop();
    if (this.snapshot.status === "success") audioStore.playSuccessChime();
    void this.recordRun();
  }

  private async restoreStats(): Promise<void> {
    const stats = (await getValue<CargoCrateStats>(CARGO_CRATE_STATS_KEY)) ?? EMPTY_STATS;
    this.statsRecord = stats;
    this.best = stats;
  }

  private async recordRun(): Promise<void> {
    if (this.statsRecord === null) return;
    const next: CargoCrateStats = {
      bestStreak: Math.max(this.statsRecord.bestStreak, this.snapshot.streak),
      bestProgress: Math.max(this.statsRecord.bestProgress, this.snapshot.progress),
    };
    this.statsRecord = next;
    this.best = next;
    await setValue(CARGO_CRATE_STATS_KEY, next);
  }
}
