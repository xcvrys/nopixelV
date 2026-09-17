import { getValue, setValue } from "$lib/db/storage";
import { detectInputMode } from "$lib/input/device";
import { AudioEngine } from "$lib/engine/audio";

const VOLUME_KEY = "sound_volume";
const MUTED_KEY = "sound_muted";
const LEGACY_VOLUME_KEY = "np_sound_volume";
const LEGACY_MUTED_KEY = "np_sound_muted";

export class AudioStore {
  private readonly engine = new AudioEngine();

  public volume = $state(detectInputMode() === "touch" ? 1 : 0.6);
  public muted = $state(false);
  public readonly ready: Promise<void>;

  constructor() {
    this.ready = this.restore();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.persist();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.persist();
  }

  public playRatchetClick(): void {
    if (!this.muted) this.engine.playRatchetClick(this.volume);
  }

  public playNotchThud(): void {
    if (!this.muted) this.engine.playNotchThud(this.volume);
  }

  public playLockpickClick(): void {
    if (!this.muted) this.engine.playLockpickClick(this.volume);
  }

  public playSuccessChime(): void {
    if (!this.muted) this.engine.playSuccessChime(this.volume);
  }

  public playFailBuzz(): void {
    if (!this.muted) this.engine.playFailBuzz(this.volume);
  }

  private persist(): void {
    void Promise.all([setValue(VOLUME_KEY, this.volume), setValue(MUTED_KEY, this.muted)]);
  }

  private async restore(): Promise<void> {
    const [volume, muted] = await Promise.all([
      getValue<number>(VOLUME_KEY),
      getValue<boolean>(MUTED_KEY),
    ]);

    if (volume !== undefined || muted !== undefined) {
      if (volume !== undefined) this.volume = Math.max(0, Math.min(1, volume));
      if (muted !== undefined) this.muted = muted;
      return;
    }

    const [legacyVolume, legacyMuted] = await Promise.all([
      getValue<number>(LEGACY_VOLUME_KEY),
      getValue<boolean>(LEGACY_MUTED_KEY),
    ]);
    if (legacyVolume !== undefined || legacyMuted !== undefined) {
      if (legacyVolume !== undefined) this.volume = Math.max(0, Math.min(1, legacyVolume));
      if (legacyMuted !== undefined) this.muted = legacyMuted;
      this.persist();
      return;
    }

    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const legacyVolumeValue = window.localStorage.getItem(LEGACY_VOLUME_KEY);
      const legacyVolumeValueAsNumber =
        legacyVolumeValue === null ? NaN : Number(legacyVolumeValue);
      const legacyMutedValue = window.localStorage.getItem(LEGACY_MUTED_KEY);
      if (Number.isFinite(legacyVolumeValueAsNumber)) {
        this.volume = Math.max(0, Math.min(1, legacyVolumeValueAsNumber));
      }
      if (legacyMutedValue !== null) this.muted = legacyMutedValue === "true";
      if (legacyVolumeValue !== null || legacyMutedValue !== null) this.persist();
    } catch {
      // Ignore storage access issues in restricted environments.
    }
  }
}

export const audioStore = new AudioStore();
