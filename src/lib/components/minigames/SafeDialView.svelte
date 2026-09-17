<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { SafeDialLogic } from '$lib/engine/safedial';
	import { soundEngine } from '$lib/engine/audio';
	import {
		Lock,
		RotateCcw,
		Volume2,
		VolumeX,
		Eye,
		EyeOff,
		CheckCircle2,
		Trophy,
		Sparkles,
		Sliders,
		Radio
	} from 'lucide-svelte';

	let safe = $state(new SafeDialLogic({ tolerance: 1 }));

	let currentNumber = $state(0);
	let currentStage = $state(0);
	let totalStages = $state(3);
	let status = $state<'idle' | 'running' | 'won'>('idle');
	let elapsedTime = $state(0);
	let code = $state<number[]>([25, 60, 10]);

	// Practice & Accessibility Options
	let showVisualCue = $state(false);
	let revealCodes = $state(false);
	let tolerance = $state(1);
	let isSweetSpotActive = $state(false);
	let failedAttemptShake = $state(false);

	let dialContainer: HTMLDivElement | null = null;
	let isDragging = false;
	let previousDragAngle = 0;
	let timerInterval: number | null = null;

	function syncState() {
		currentNumber = safe.currentDialNumber;
		currentStage = safe.currentStage;
		totalStages = safe.totalStages;
		status = safe.status;
		elapsedTime = safe.elapsedTime;
		code = [...safe.code];
		isSweetSpotActive = safe.isAtSweetSpot();
	}

	function handleRotationResult(res: { numberChanged: boolean; hitSweetSpot: boolean }) {
		if (res.numberChanged) {
			soundEngine.playRatchetClick();
		}
		if (res.hitSweetSpot) {
			soundEngine.playNotchThud();
		}
		syncState();
	}

	function turnClockwise(amount = 3.6) {
		const res = safe.rotateBy(amount);
		handleRotationResult(res);
	}

	function turnCounterClockwise(amount = 3.6) {
		const res = safe.rotateBy(-amount);
		handleRotationResult(res);
	}

	function tryUnlock() {
		if (status === 'won') {
			handleReset();
			return;
		}

		const res = safe.tryUnlockCurrentStage();
		syncState();

		if (res.success) {
			soundEngine.playSuccessChime();
		} else {
			soundEngine.playFailBuzz();
			failedAttemptShake = true;
			setTimeout(() => (failedAttemptShake = false), 400);
		}
	}

	function handleReset() {
		safe.reset();
		safe.tolerance = tolerance;
		syncState();
	}

	function startTimer() {
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = window.setInterval(() => {
			if (safe.status === 'running') {
				elapsedTime = (Date.now() - safe.startTime) / 1000;
			}
		}, 100);
	}

	// Mouse & Touch dial dragging calculations
	function getAngleFromEvent(e: MouseEvent | TouchEvent): number {
		if (!dialContainer) return 0;
		const rect = dialContainer.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

		const dx = clientX - centerX;
		const dy = clientY - centerY;
		const radians = Math.atan2(dy, dx);
		let degrees = (radians * 180) / Math.PI;
		// Orient 0 degrees to the top (12 o'clock)
		degrees = degrees + 90;
		if (degrees < 0) degrees += 360;
		return degrees;
	}

	function handlePointerDown(e: MouseEvent | TouchEvent) {
		if (status === 'won') return;
		isDragging = true;
		previousDragAngle = getAngleFromEvent(e);
	}

	function handlePointerMove(e: MouseEvent | TouchEvent) {
		if (!isDragging) return;
		e.preventDefault();

		const currentAngle = getAngleFromEvent(e);
		let delta = currentAngle - previousDragAngle;

		// Handle 360/0 crossover
		if (delta > 180) delta -= 360;
		if (delta < -180) delta += 360;

		previousDragAngle = currentAngle;
		turnClockwise(delta);
	}

	function handlePointerUp() {
		isDragging = false;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.repeat) {
			if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
				turnCounterClockwise(e.shiftKey ? 7.2 : 3.6);
			} else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
				turnClockwise(e.shiftKey ? 7.2 : 3.6);
			}
			return;
		}

		if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
			e.preventDefault();
			turnCounterClockwise(e.shiftKey ? 7.2 : 3.6);
		} else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
			e.preventDefault();
			turnClockwise(e.shiftKey ? 7.2 : 3.6);
		} else if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			tryUnlock();
		}
	}

	onMount(() => {
		syncState();
		startTimer();
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('mousemove', handlePointerMove);
		window.addEventListener('mouseup', handlePointerUp);
		window.addEventListener('touchmove', handlePointerMove, { passive: false });
		window.addEventListener('touchend', handlePointerUp);
	});

	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('mousemove', handlePointerMove);
			window.removeEventListener('mouseup', handlePointerUp);
			window.removeEventListener('touchmove', handlePointerMove);
			window.removeEventListener('touchend', handlePointerUp);
		}
	});

	// Dial visual rotation in degrees
	let dialRotationDegrees = $derived(currentNumber * 3.6);
</script>

<div class="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full min-h-[calc(100vh-2rem)]">
	<!-- Header title -->
	<div class="text-center mb-6">
		<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">
			<Lock class="w-3.5 h-3.5 text-white" />
			<span>NoPixel V Mechanics</span>
		</div>
		<h1 class="text-3xl font-black tracking-tight text-white">
			STORE SAFE <span class="text-neutral-400">CRACKER</span>
		</h1>
		<p class="text-neutral-400 text-sm mt-1 max-w-lg">
			Rotate the dial with mouse drag or <kbd class="px-1.5 py-0.5 rounded bg-neutral-900 text-white font-mono text-xs border border-neutral-800">A</kbd>/<kbd class="px-1.5 py-0.5 rounded bg-neutral-900 text-white font-mono text-xs border border-neutral-800">D</kbd> keys. Listen carefully for the deep acoustic notch clunk, then press <kbd class="px-1.5 py-0.5 rounded bg-neutral-900 text-white font-mono text-xs border border-neutral-800">Space</kbd> to unlock the stage.
		</p>
	</div>

	<!-- Main Safe Dial Viewport -->
	<div class="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center {failedAttemptShake ? 'animate-bounce' : ''}">
		<!-- Stages Counter -->
		<div class="flex items-center justify-center gap-2.5 w-full mb-6">
			{#each code as secretNum, i}
				<div class="flex-1 flex flex-col items-center p-2.5 rounded-lg border transition-all {i < currentStage
					? 'bg-neutral-900 border-neutral-800 text-neutral-300'
					: i === currentStage
						? 'bg-neutral-900 border-neutral-600 text-white'
						: 'bg-black border-neutral-900 text-neutral-600'}">
					<span class="text-[10px] uppercase font-semibold tracking-wider">Stage {i + 1}</span>
					<div class="flex items-center gap-1 mt-0.5">
						{#if i < currentStage}
							<CheckCircle2 class="w-3.5 h-3.5 text-white" />
							<span class="font-mono font-bold text-xs">{secretNum}</span>
						{:else if i === currentStage}
							<span class="font-mono font-bold text-xs">
								{revealCodes ? secretNum : '???'}
							</span>
						{:else}
							<span class="font-mono text-xs text-neutral-600">--</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Interactive Dial Container -->
		<div class="relative flex items-center justify-center my-4">
			<!-- Top Alignment Pointer (12 o'clock needle) -->
			<div class="absolute -top-3 z-30 flex flex-col items-center pointer-events-none">
				<div class="w-1.5 h-3.5 bg-white rounded-b"></div>
				<div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-white"></div>
			</div>

			<!-- Visual Sound Wave Cue Ring (Practice Assist) -->
			{#if showVisualCue}
				<div
					class="absolute -inset-4 rounded-full border transition-all duration-100 pointer-events-none {isSweetSpotActive
						? 'border-white scale-105 opacity-100 ring-2 ring-white/20'
						: 'border-neutral-900 opacity-0 scale-100'}"
				></div>
			{/if}
			<!-- Rotating Dial Disc -->
			<div
				bind:this={dialContainer}
				onmousedown={handlePointerDown}
				ontouchstart={handlePointerDown}
				class="relative w-64 h-64 md:w-72 md:h-72 rounded-full cursor-grab active:cursor-grabbing select-none transition-transform duration-75 shadow-2xl flex items-center justify-center bg-black border-2 border-neutral-800 hover:border-neutral-700"
				style="transform: rotate({-dialRotationDegrees}deg)"
				role="slider"
				tabindex="0"
				aria-valuenow={currentNumber}
				aria-valuemin="0"
				aria-valuemax="99"
				aria-label="Safe combination dial"
			>
				<!-- Outer Dial Ring with Tick Marks -->
				<svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
					<!-- Numbers around the dial every 10 ticks -->
					{#each Array(10) as _, i}
						{@const num = i * 10}
						{@const angle = num * 3.6}
						{@const rad = ((angle - 90) * Math.PI) / 180}
						{@const x = 50 + 38 * Math.cos(rad)}
						{@const y = 50 + 38 * Math.sin(rad)}
						<text
							{x}
							{y}
							text-anchor="middle"
							dominant-baseline="central"
							fill="#94a3b8"
							font-size="4.5"
							font-weight="bold"
							font-family="'Barlow Condensed', sans-serif"
							transform="rotate({angle}, {x}, {y})"
						>
							{num}
						</text>
					{/each}

					<!-- Ticks around perimeter -->
					{#each Array(50) as _, i}
						{@const angle = i * 7.2}
						{@const rad = ((angle - 90) * Math.PI) / 180}
						{@const isMajor = i % 5 === 0}
						{@const innerR = isMajor ? 43 : 45}
						{@const x1 = 50 + innerR * Math.cos(rad)}
						{@const y1 = 50 + innerR * Math.sin(rad)}
						{@const x2 = 50 + 47 * Math.cos(rad)}
						{@const y2 = 50 + 47 * Math.sin(rad)}
						<line
							{x1}
							{y1}
							{x2}
							{y2}
							stroke={isMajor ? '#cbd5e1' : '#475569'}
							stroke-width={isMajor ? '1' : '0.5'}
						/>
					{/each}
				</svg>

				<!-- Center Knob with Grip Pattern -->
				<div class="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center pointer-events-none">
					<!-- Grip Ridges -->
					<div class="w-20 h-20 rounded-full border border-neutral-850 flex items-center justify-center">
						<div class="w-12 h-12 rounded-full bg-black border border-neutral-800 flex items-center justify-center">
							<Lock class="w-4 h-4 text-neutral-400" />
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Current Position Display & Unlock Action -->
		<div class="flex items-center justify-between w-full mt-4 pt-4 border-t border-neutral-900">
			<div>
				<span class="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Dial Reading</span>
				<span class="font-mono font-bold text-2xl text-white">{currentNumber}</span>
			</div>

			<button
				onclick={tryUnlock}
				class="px-5 py-2.5 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all duration-75 flex items-center gap-2 active:scale-[0.98] {status === 'won'
					? 'bg-neutral-200 text-black hover:bg-white'
					: 'bg-white text-black hover:bg-neutral-200'}"
			>
				<span>{status === 'won' ? 'Next Safe' : 'Set Number (Space)'}</span>
			</button>
		</div>

		<!-- Victory Banner -->
		{#if status === 'won'}
			<div class="w-full mt-6 p-4 rounded-xl bg-black border border-neutral-800 text-center animate-in fade-in duration-150">
				<div class="flex items-center justify-center gap-2 text-white font-bold mb-1">
					<Trophy class="w-4 h-4 text-white" />
					<span>Safe Successfully Cracked!</span>
				</div>
				<p class="text-neutral-400 text-xs">
					Combination <span class="text-white font-mono font-bold">{code.join(' - ')}</span> unlocked in <span class="text-white font-bold">{elapsedTime.toFixed(1)}s</span>.
				</p>
				<button
					onclick={handleReset}
					class="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors"
				>
					<RotateCcw class="w-3.5 h-3.5" />
					<span>New Safe Combination (Space)</span>
				</button>
			</div>
		{/if}
	</div>

	<!-- Practice Assists & Settings Drawer -->
	<div class="w-full max-w-lg mt-6 bg-neutral-950 border border-neutral-900 rounded-xl p-5">
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
				<Sliders class="w-3.5 h-3.5 text-neutral-400" />
				<span>Training Assists & Audio Settings</span>
			</div>
			<button
				onclick={handleReset}
				class="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors"
			>
				<RotateCcw class="w-3.5 h-3.5" />
				<span>New Codes</span>
			</button>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
			<!-- Toggle visual wave indicator -->
			<button
				onclick={() => (showVisualCue = !showVisualCue)}
				class="flex items-center justify-between p-3 rounded-lg border transition-colors {showVisualCue
					? 'bg-white text-black border-white font-medium'
					: 'bg-black border-neutral-800 text-neutral-400 hover:text-white'}"
			>
				<div class="flex items-center gap-2">
					<Radio class="w-4 h-4" />
					<span>Visual Sound Wave</span>
				</div>
				<span class="font-bold">{showVisualCue ? 'ON' : 'OFF'}</span>
			</button>

			<!-- Reveal Codes toggle (Training cheat) -->
			<button
				onclick={() => (revealCodes = !revealCodes)}
				class="flex items-center justify-between p-3 rounded-lg border transition-colors {revealCodes
					? 'bg-white text-black border-white font-medium'
					: 'bg-black border-neutral-800 text-neutral-400 hover:text-white'}"
			>
				<div class="flex items-center gap-2">
					{#if revealCodes}
						<Eye class="w-4 h-4" />
					{:else}
						<EyeOff class="w-4 h-4" />
					{/if}
					<span>Reveal Code</span>
				</div>
				<span class="font-bold">{revealCodes ? 'ON' : 'OFF'}</span>
			</button>
		</div>
	</div>
</div>
