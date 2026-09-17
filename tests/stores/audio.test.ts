import { beforeEach, describe, expect, it } from 'vitest';
import { deleteValue, getValue } from '../../src/lib/db/storage';
import { AudioStore } from '../../src/lib/stores/audio.svelte';

const VOLUME_KEY = 'np_sound_volume';
const MUTED_KEY = 'np_sound_muted';

describe('AudioStore', () => {
	beforeEach(async () => {
		await deleteValue(VOLUME_KEY);
		await deleteValue(MUTED_KEY);
	});

	it('owns reactive volume and mute settings and persists changes', async () => {
		const store = new AudioStore();
		await store.ready;

		expect(store.volume).toBe(0.6);
		expect(store.muted).toBe(false);

		store.setVolume(1.5);
		store.setMuted(true);

		expect(store.volume).toBe(1);
		expect(store.muted).toBe(true);
		expect(await getValue(VOLUME_KEY)).toBe(1);
		expect(await getValue(MUTED_KEY)).toBe(true);
	});
});
