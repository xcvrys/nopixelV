import { describe, it, expect, beforeEach } from 'vitest';
import { SoundEngine } from '../../src/lib/engine/audio';

describe('SoundEngine', () => {
	let engine: SoundEngine;

	beforeEach(() => {
		engine = new SoundEngine();
	});

	it('initializes in unmuted state', () => {
		expect(engine.isMuted()).toBe(false);
	});

	it('allows toggling and setting muted state', () => {
		engine.setMuted(true);
		expect(engine.isMuted()).toBe(true);

		const newState = engine.toggleMute();
		expect(newState).toBe(false);
		expect(engine.isMuted()).toBe(false);
	});

	it('gracefully handles play methods when muted', () => {
		engine.setMuted(true);
		// Should not throw or initialize audio context
		expect(() => {
			engine.playRatchetClick();
			engine.playNotchThud();
			engine.playLockpickClick();
			engine.playSuccessChime();
			engine.playFailBuzz();
		}).not.toThrow();
	});

	it('gracefully degrades when AudioContext is undefined (Node/SSR env)', () => {
		// In node environment without browser AudioContext, methods should safely no-op
		expect(() => {
			engine.playRatchetClick();
			engine.playNotchThud();
			engine.playLockpickClick();
			engine.playSuccessChime();
			engine.playFailBuzz();
		}).not.toThrow();
	});

	it('initializes with default volume of 0.6', () => {
		expect(engine.getVolume()).toBe(0.6);
		expect(engine.volume).toBe(0.6);
	});

	it('sets volume and clamps values within [0, 1]', () => {
		engine.setVolume(0.85);
		expect(engine.getVolume()).toBe(0.85);

		engine.setVolume(1.5);
		expect(engine.getVolume()).toBe(1.0);

		engine.setVolume(-0.5);
		expect(engine.getVolume()).toBe(0.0);
	});

	it('loads and persists settings to localStorage when available', () => {
		const store = new Map<string, string>();
		const mockLocalStorage = {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, val: string) => store.set(key, val),
			removeItem: (key: string) => store.delete(key),
			clear: () => store.clear()
		};

		const originalWindow = (globalThis as unknown as { window?: unknown }).window;
		(globalThis as unknown as { window: unknown }).window = { localStorage: mockLocalStorage };

		try {
			const persistedEngine = new SoundEngine();
			persistedEngine.setVolume(0.42);
			persistedEngine.setMuted(true);

			expect(store.get('np_sound_volume')).toBe('0.42');
			expect(store.get('np_sound_muted')).toBe('true');

			// New instance should hydrate from localStorage
			const restoredEngine = new SoundEngine();
			expect(restoredEngine.getVolume()).toBe(0.42);
			expect(restoredEngine.isMuted()).toBe(true);
		} finally {
			(globalThis as unknown as { window: unknown }).window = originalWindow;
		}
	});
});
