import { describe, it, expect, beforeEach } from 'vitest';
import {
	LockpickLogic,
	DIFFICULTY_PRESETS,
	PROGRESSIVE_STAGES,
	getMaxingConfig
} from '../../src/lib/engine/lockpick';
describe('LockpickLogic Engine', () => {
	let lock: LockpickLogic;

	beforeEach(() => {
		lock = new LockpickLogic({
			progressPerTap: 5,
			decayRate: 10, // 10% per second
			maxPins: 3
		});
	});

	it('initializes in idle state at 0% progress', () => {
		expect(lock.status).toBe('idle');
		expect(lock.progress).toBe(0);
		expect(lock.currentPin).toBe(1);
		expect(lock.taps).toBe(0);
	});

	it('starts running on first tap and advances progress', () => {
		lock.tap();
		expect(lock.status).toBe('running');
		expect(lock.progress).toBe(5);
		expect(lock.taps).toBe(1);
	});

	it('decays progress over time during running state', () => {
		lock.tap(); // progress = 5
		lock.tap(); // progress = 10
		expect(lock.progress).toBe(10);

		// Advance 0.5s with decay rate of 10% per second -> drops by 5
		lock.tick(0.5);
		expect(lock.progress).toBeCloseTo(5, 1);

		// Advance another 1s -> should not drop below 0
		lock.tick(1.0);
		expect(lock.progress).toBe(0);
	});

	it('advances pin or triggers win when progress reaches 100%', () => {
		// Single pin mode for quick test
		const singlePinLock = new LockpickLogic({
			progressPerTap: 50,
			decayRate: 0,
			maxPins: 1
		});

		singlePinLock.tap();
		expect(singlePinLock.progress).toBe(50);
		expect(singlePinLock.status).toBe('running');

		singlePinLock.tap();
		expect(singlePinLock.progress).toBe(100);
		expect(singlePinLock.status).toBe('won');
	});

	it('advances through multiple pins', () => {
		const twoPinLock = new LockpickLogic({
			progressPerTap: 100,
			decayRate: 0,
			maxPins: 2
		});

		twoPinLock.tap();
		// Reached 100% on pin 1 -> advances to pin 2 and resets progress
		expect(twoPinLock.currentPin).toBe(2);
		expect(twoPinLock.progress).toBe(0);
		expect(twoPinLock.status).toBe('running');

		twoPinLock.tap();
		// Reached 100% on pin 2 -> completes all pins and wins
		expect(twoPinLock.status).toBe('won');
	});

	it('triggers failed status when failOnZero is enabled and progress decays back to 0', () => {
		const strictLock = new LockpickLogic({
			progressPerTap: 10,
			decayRate: 20,
			failOnZero: true
		});

		strictLock.tap();
		expect(strictLock.status).toBe('running');
		expect(strictLock.progress).toBe(10);

		// Decay 1 second -> progress drops by 20, hitting 0
		const tickRes = strictLock.tick(1.0);
		expect(tickRes.failed).toBe(true);
		expect(tickRes.failReason).toBe('decay');
		expect(strictLock.status).toBe('failed');
		expect(strictLock.progress).toBe(0);
	});

	it('scales maxing mode difficulty upwards with each level', () => {
		const lvl1 = getMaxingConfig(1);
		const lvl2 = getMaxingConfig(2);
		const lvl5 = getMaxingConfig(5);

		expect(lvl2.decayRate).toBeGreaterThan(lvl1.decayRate);
		expect(lvl2.progressPerTap).toBeLessThan(lvl1.progressPerTap);
		expect(lvl5.decayRate).toBeGreaterThan(lvl2.decayRate);
	});

	it('provides progressive stage difficulties for easy, medium, and hard', () => {
		expect(PROGRESSIVE_STAGES[1].decayRate).toBe(DIFFICULTY_PRESETS.easy.decayRate);
		expect(PROGRESSIVE_STAGES[2].decayRate).toBe(DIFFICULTY_PRESETS.medium.decayRate);
		expect(PROGRESSIVE_STAGES[3].decayRate).toBe(DIFFICULTY_PRESETS.hard.decayRate);
	});

	it('advances through 3-progressive stages with 500ms pause and 3s timeout', () => {
		const prog = new LockpickLogic({ mode: 'progressive' });
		expect(prog.currentStage).toBe(1);

		// Complete stage 1
		for (let i = 0; i < 20; i++) prog.tap();
		expect(prog.status).toBe('stage_complete');
		expect(prog.currentStage).toBe(1);

		// Advance to stage 2
		prog.advanceStage();
		expect(prog.currentStage).toBe(2);
		expect(prog.status).toBe('waiting_start');
		expect(prog.stageTimeLeft).toBe(3.0);

		// Test timeout if not tapped within 3s
		const timeoutRes = prog.tick(3.1);
		expect(timeoutRes.failed).toBe(true);
		expect(timeoutRes.failReason).toBe('timeout');
		expect(prog.status).toBe('failed');
	});
});
