import { beforeEach, describe, expect, it } from "vitest";
import { AudioEngine } from "../../src/lib/engine/audio";

describe("AudioEngine", () => {
  let engine: AudioEngine;

  beforeEach(() => {
    engine = new AudioEngine();
  });

  it("gracefully degrades when AudioContext is unavailable", () => {
    expect(() => {
      engine.playRatchetClick();
      engine.playNotchThud();
      engine.playLockpickClick();
      engine.playSuccessChime();
      engine.playFailBuzz();
    }).not.toThrow();
  });
});
