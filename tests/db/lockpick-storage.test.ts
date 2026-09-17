import { beforeEach, describe, expect, it } from 'vitest';
import {
	clearLockpickStorage,
	getLockpickSettings,
	getLockpickStats,
	saveLockpickSettings,
	saveLockpickStats
} from '../../src/lib/db/storage';

describe('Lockpick Database Storage', () => {
	beforeEach(async () => {
		await clearLockpickStorage();
	});

	it('persists lockpick settings and personal best stats', async () => {
		const settings = {
			mode: 'single' as const,
			singleDifficulty: 'hard' as const,
			decayRate: 20,
			progressPerTap: 4
		};
		const stats = { bestStreak: 3, bestStreakTime: 12.4 };

		await saveLockpickSettings(settings);
		await saveLockpickStats(stats);

		expect(await getLockpickSettings()).toEqual(settings);
		expect(await getLockpickStats()).toEqual(stats);
	});
});
