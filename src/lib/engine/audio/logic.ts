/**
 * Procedural Web Audio Sound Engine for NoPixel V Minigames & Tools.
 * Generates clicks, safe dial ratchet ticks, sweet-spot notch thuds, and outcome chimes
 * entirely in real-time with zero external sound files.
 *
 */

export class AudioEngine {
 private ctx: AudioContext | null = null;

 private getContext(): AudioContext | null {
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

 /**
  * Subtle mechanical ratchet tick for rotating safe dial numbers.
  */
 public playRatchetClick(volume = 1): void {
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
  gain.gain.setValueAtTime(volume * 0.4, now);
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
 public playNotchThud(volume = 1): void {
  const ctx = this.getContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Low metallic thud component
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.06);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(volume * 0.9, now);
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
  clickGain.gain.setValueAtTime(volume * 0.6, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);

  clickOsc.start(now);
  clickOsc.stop(now + 0.025);
 }

 /**
  * Lockpick tumbler tap click (higher metallic ping).
  */
 public playLockpickClick(volume = 1): void {
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
  gain.gain.setValueAtTime(volume * 0.5, now);
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
 public playSuccessChime(volume = 1): void {
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
   gain.gain.setValueAtTime(volume * 0.4, noteTime);
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
 public playFailBuzz(volume = 1): void {
  const ctx = this.getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.linearRampToValueAtTime(80, now + 0.25);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume * 0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
 }
}

