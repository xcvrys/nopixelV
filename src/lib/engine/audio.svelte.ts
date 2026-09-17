/**
 * Procedural Web Audio Sound Engine for NoPixel V Minigames & Tools.
 * Generates clicks, safe dial ratchet ticks, sweet-spot notch thuds, and outcome chimes
 * entirely in real-time with zero external sound files.
 *
 * Reactive Svelte 5 runes ($state) allow direct 2-way UI binding and reactive observation.
 */

const STORAGE_KEY_VOLUME = 'np_sound_volume';
const STORAGE_KEY_MUTED = 'np_sound_muted';

export class SoundEngine {
 private ctx: AudioContext | null = null;
 public muted: boolean = $state(false);
 public volume: number = $state(0.6);

 constructor() {
  if (typeof window !== 'undefined' && window.localStorage) {
   try {
    const savedVol = window.localStorage.getItem(STORAGE_KEY_VOLUME);
    if (savedVol !== null) {
     const parsed = parseFloat(savedVol);
     if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      this.volume = parsed;
     }
    }
    const savedMuted = window.localStorage.getItem(STORAGE_KEY_MUTED);
    if (savedMuted !== null) {
     this.muted = savedMuted === 'true';
    }
   } catch {
    // Ignore storage access issues in restricted environments
   }
  }
 }

 private persist(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
   try {
    window.localStorage.setItem(STORAGE_KEY_VOLUME, this.volume.toString());
    window.localStorage.setItem(STORAGE_KEY_MUTED, this.muted.toString());
   } catch {
    // Ignore storage access issues
   }
  }
 }

 private getContext(): AudioContext | null {
  if (this.muted) return null;
  if (typeof window === 'undefined') return null;

  if (!this.ctx) {
   const AudioContextClass =
    window.AudioContext ||
    // @ts-expect-error webkit prefix fallback
    window.webkitAudioContext;
   if (AudioContextClass) {
    this.ctx = new AudioContextClass();
   }
  }

  if (this.ctx && this.ctx.state === 'suspended') {
   this.ctx.resume().catch(() => {
    // Ignore resume errors if blocked by browser
   });
  }

  return this.ctx;
 }

 public isMuted(): boolean {
  return this.muted;
 }

 public setMuted(muted: boolean): void {
  this.muted = muted;
  this.persist();
 }

 public toggleMute(): boolean {
  this.muted = !this.muted;
  this.persist();
  return this.muted;
 }

 public setVolume(volume: number): void {
  this.volume = Math.max(0, Math.min(1, volume));
  this.persist();
 }

 public getVolume(): number {
  return this.volume;
 }

 /**
  * Subtle mechanical ratchet tick for rotating safe dial numbers.
  */
 public playRatchetClick(): void {
  const ctx = this.getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const bufferSize = Math.floor(ctx.sampleRate * 0.008); // 8ms burst
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
   data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2400, now);
  filter.Q.setValueAtTime(4.0, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(this.volume * 0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.008);
 }

 /**
  * Distinct mechanical "notch thud" when combination dial lands on or crosses the sweet-spot.
  */
 public playNotchThud(): void {
  const ctx = this.getContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Low metallic thud component
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.06);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(this.volume * 0.9, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.06);

  // Higher click accent
  const clickOsc = ctx.createOscillator();
  clickOsc.type = 'triangle';
  clickOsc.frequency.setValueAtTime(420, now);
  clickOsc.frequency.exponentialRampToValueAtTime(180, now + 0.025);

  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(this.volume * 0.6, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);

  clickOsc.start(now);
  clickOsc.stop(now + 0.025);
 }

 /**
  * Lockpick tumbler tap click (higher metallic ping).
  */
 public playLockpickClick(): void {
  const ctx = this.getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1800, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.015);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1600, now);
  filter.Q.setValueAtTime(6, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(this.volume * 0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.015);
 }

 /**
  * Success harmonic chime.
  */
 public playSuccessChime(): void {
  const ctx = this.getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

  notes.forEach((freq, idx) => {
   const noteTime = now + idx * 0.08;
   const osc = ctx.createOscillator();
   osc.type = 'triangle';
   osc.frequency.setValueAtTime(freq, noteTime);

   const gain = ctx.createGain();
   gain.gain.setValueAtTime(this.volume * 0.4, noteTime);
   gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

   osc.connect(gain);
   gain.connect(ctx.destination);

   osc.start(noteTime);
   osc.stop(noteTime + 0.35);
  });
 }

 /**
  * Failure buzzer sound.
  */
 public playFailBuzz(): void {
  const ctx = this.getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.linearRampToValueAtTime(80, now + 0.25);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(this.volume * 0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
 }
}

// Global singleton instance for easy import across components
export const soundEngine = new SoundEngine();
