/**
 * Safe Combination Dial Logic & Physics Engine for NoPixel V Store Safe Cracker.
 * Translates rotation angle to combination numbers (0-99), evaluates sweet-spot proximity,
 * and handles multi-stage combination unlocks.
 */

export interface SafeDialOptions {
	code?: number[];
	tolerance?: number;
}

export interface RotationResult {
	numberChanged: boolean;
	previousNumber: number;
	currentNumber: number;
	hitSweetSpot: boolean;
}

export interface UnlockResult {
	success: boolean;
	stageCompleted: number;
	gameWon: boolean;
}

export class SafeDialLogic {
	public code: number[];
	public tolerance: number;

	public currentDialNumber: number = 0;
	public angleDegrees: number = 0;
	public currentStage: number = 0;
	public totalStages: number;
	public status: 'idle' | 'running' | 'won' = 'idle';

	public startTime: number = 0;
	public elapsedTime: number = 0;

	constructor(options: SafeDialOptions = {}) {
		this.code = options.code ?? SafeDialLogic.generateRandomCode(3);
		this.tolerance = options.tolerance ?? 1;
		this.totalStages = this.code.length;
	}

	public static generateRandomCode(stages = 3): number[] {
		const numbers: number[] = [];
		for (let i = 0; i < stages; i++) {
			let num = Math.floor(Math.random() * 96) + 2; // 2 to 97
			// Ensure consecutive numbers are separated by at least 15 ticks
			if (numbers.length > 0) {
				while (Math.abs(num - numbers[numbers.length - 1]) < 15) {
					num = Math.floor(Math.random() * 96) + 2;
				}
			}
			numbers.push(num);
		}
		return numbers;
	}

	/**
	 * Converts an angle (in degrees) to dial number 0 - 99.
	 */
	public static angleToDialNumber(degrees: number): number {
		const normalized = ((degrees % 360) + 360) % 360;
		// 360 degrees / 100 ticks = 3.6 degrees per tick
		const tick = Math.round(normalized / 3.6) % 100;
		return tick;
	}

	public setAngle(degrees: number): RotationResult {
		const prev = this.currentDialNumber;
		this.angleDegrees = degrees;
		const next = SafeDialLogic.angleToDialNumber(degrees);
		this.currentDialNumber = next;

		if (this.status === 'idle') {
			this.status = 'running';
			this.startTime = Date.now();
		}

		const numberChanged = prev !== next;
		const atSweetSpot = this.isAtSweetSpot();
		const hitSweetSpot = numberChanged && atSweetSpot;

		return {
			numberChanged,
			previousNumber: prev,
			currentNumber: next,
			hitSweetSpot
		};
	}

	public rotateBy(deltaDegrees: number): RotationResult {
		return this.setAngle(this.angleDegrees + deltaDegrees);
	}

	public setDialNumber(num: number): RotationResult {
		const targetAngle = num * 3.6;
		return this.setAngle(targetAngle);
	}

	public getCurrentTarget(): number {
		return this.code[this.currentStage] ?? 0;
	}

	/**
	 * Checks if the current dial number is within tolerance of the active stage's secret code.
	 * Handles circular wraparound around 0 / 99.
	 */
	public isAtSweetSpot(): boolean {
		if (this.currentStage >= this.code.length) return false;

		const target = this.code[this.currentStage];
		const current = this.currentDialNumber;

		// Circular distance on 100-number dial
		const diff = Math.abs(current - target);
		const circularDistance = Math.min(diff, 100 - diff);

		return circularDistance <= this.tolerance;
	}

	public tryUnlockCurrentStage(): UnlockResult {
		if (this.status === 'won') {
			return { success: true, stageCompleted: this.currentStage, gameWon: true };
		}

		if (this.isAtSweetSpot()) {
			const completed = this.currentStage;
			this.currentStage++;

			if (this.currentStage >= this.totalStages) {
				this.status = 'won';
				this.elapsedTime = (Date.now() - this.startTime) / 1000;
				return { success: true, stageCompleted: completed, gameWon: true };
			}

			return { success: true, stageCompleted: completed, gameWon: false };
		}

		return { success: false, stageCompleted: this.currentStage, gameWon: false };
	}

	public reset(newCode?: number[]): void {
		this.code = newCode ?? SafeDialLogic.generateRandomCode(this.totalStages);
		this.currentStage = 0;
		this.currentDialNumber = 0;
		this.angleDegrees = 0;
		this.status = 'idle';
		this.startTime = 0;
		this.elapsedTime = 0;
	}
}
