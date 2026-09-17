import { describe, it, expect, beforeEach } from 'vitest';
import { SafeDialLogic } from '../../src/lib/engine/safedial';

describe('SafeDialLogic Engine', () => {
	let safe: SafeDialLogic;

	beforeEach(() => {
		safe = new SafeDialLogic({
			code: [25, 60, 10],
			tolerance: 1
		});
	});

	it('initializes at dial number 0 and stage 0', () => {
		expect(safe.currentDialNumber).toBe(0);
		expect(safe.currentStage).toBe(0);
		expect(safe.totalStages).toBe(3);
		expect(safe.status).toBe('idle');
	});

	it('maps angle correctly to dial numbers 0-99', () => {
		// 0 deg -> 0
		safe.setAngle(0);
		expect(safe.currentDialNumber).toBe(0);

		// 90 deg -> 25 (90 / 360 * 100 = 25)
		safe.setAngle(90);
		expect(safe.currentDialNumber).toBe(25);

		// 180 deg -> 50
		safe.setAngle(180);
		expect(safe.currentDialNumber).toBe(50);

		// 360 deg -> 0
		safe.setAngle(360);
		expect(safe.currentDialNumber).toBe(0);

		// Negative angles wrap around correctly: -90 deg -> 75
		safe.setAngle(-90);
		expect(safe.currentDialNumber).toBe(75);
	});

	it('detects when the dial is in the sweet-spot for the current stage', () => {
		// Stage 0 target is 25, tolerance is 1 (24, 25, 26)
		safe.setAngle(0);
		expect(safe.isAtSweetSpot()).toBe(false);

		safe.setDialNumber(24);
		expect(safe.isAtSweetSpot()).toBe(true);

		safe.setDialNumber(25);
		expect(safe.isAtSweetSpot()).toBe(true);

		safe.setDialNumber(26);
		expect(safe.isAtSweetSpot()).toBe(true);

		safe.setDialNumber(27);
		expect(safe.isAtSweetSpot()).toBe(false);
	});

	it('advances through stages on unlock attempt and wins when all complete', () => {
		// Stage 0 target = 25
		safe.setDialNumber(25);
		let res = safe.tryUnlockCurrentStage();
		expect(res.success).toBe(true);
		expect(res.stageCompleted).toBe(0);
		expect(res.gameWon).toBe(false);
		expect(safe.currentStage).toBe(1);

		// Stage 1 target = 60
		safe.setDialNumber(60);
		res = safe.tryUnlockCurrentStage();
		expect(res.success).toBe(true);
		expect(res.stageCompleted).toBe(1);
		expect(res.gameWon).toBe(false);
		expect(safe.currentStage).toBe(2);

		// Stage 2 target = 10
		safe.setDialNumber(10);
		res = safe.tryUnlockCurrentStage();
		expect(res.success).toBe(true);
		expect(res.stageCompleted).toBe(2);
		expect(res.gameWon).toBe(true);
		expect(safe.status).toBe('won');
	});

	it('fails unlock attempt when not at sweet spot', () => {
		safe.setDialNumber(50); // Target is 25
		const res = safe.tryUnlockCurrentStage();
		expect(res.success).toBe(false);
		expect(res.gameWon).toBe(false);
		expect(safe.currentStage).toBe(0);
	});
});
