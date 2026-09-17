<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { dev } from "$app/environment";
	import { soundEngine } from "$lib/engine/audio";
	import LockpickModeSelector from "./LockpickModeSelector.svelte";
	import LockpickStageTracker from "./LockpickStageTracker.svelte";
	import LockpickStatsPanel from "./LockpickStats.svelte";
	import LockpickSettingsPanel from "./LockpickSettings.svelte";
	import {
		getLockpickSettings,
		getLockpickStats,
		saveLockpickSettings,
		saveLockpickStats,
		type LockpickSettings,
		type LockpickStats,
	} from "$lib/db/storage";
	import {
		LockpickLogic,
		STAGE_TIMEOUT,
		type GameMode,
		type LockpickSnapshot,
	} from "$lib/engine/lockpick";
	import { Check, X } from "lucide-svelte";

	// Decoupled Game Engine
	const engine = new LockpickLogic();

	// Single reactive snapshot of domain state
	let lockState = $state<LockpickSnapshot>(engine.snapshot);

	// Visual-only states and animation timers
	let isKeyPressed = $state(false);
	let isFailedShaking = $state(false);

	let animFrame: number | null = null;
	let lastTick = 0;
	let stagePauseTimer: number | null = null;
	let failResetTimer: number | null = null;
	let winResetTimer: number | null = null;

	let persistedStats: LockpickStats | null = null;

	function currentSettings(): LockpickSettings {
		return {
			mode: engine.mode,
			singleDifficulty: engine.singleDifficulty,
			decayRate: engine.decayRate,
			progressPerTap: engine.progressPerTap,
		};
	}

	function persistSettings() {
		void saveLockpickSettings(currentSettings());
	}

	function syncState() {
		const snapshot = engine.snapshot;
		lockState = snapshot;

		const stats = {
			bestStreak: snapshot.bestStreak,
			bestStreakTime: snapshot.bestStreakTime,
		};
		if (
			persistedStats &&
			(stats.bestStreak !== persistedStats.bestStreak ||
				stats.bestStreakTime !== persistedStats.bestStreakTime)
		) {
			persistedStats = stats;
			void saveLockpickStats(stats);
		}
	}

	async function restorePersistedState() {
		const [settings, stats] = await Promise.all([
			getLockpickSettings(),
			getLockpickStats(),
		]);

		if (settings) {
			engine.setMode(settings.mode);
			if (settings.mode === "single") {
				if (settings.singleDifficulty !== "custom") {
					engine.setSingleDifficulty(settings.singleDifficulty);
				} else {
					engine.setCustomPhysics(settings.decayRate, settings.progressPerTap);
				}
			}
		}

		if (stats) {
			engine.bestStreak = stats.bestStreak;
			engine.bestStreakTime = stats.bestStreakTime;
		}
		persistedStats = {
			bestStreak: engine.bestStreak,
			bestStreakTime: engine.bestStreakTime,
		};
		syncState();
	}

	function handleTap() {
		soundEngine.playLockpickClick();
		flashKeycap();

		const result = engine.tap();
		syncState();

		if (result.runWon) {
			soundEngine.playSuccessChime();
			scheduleWinReset();
		} else if (result.stageCompleted) {
			soundEngine.playSuccessChime();
			scheduleStageAdvance();
		}
	}

	function flashKeycap() {
		isKeyPressed = true;
		setTimeout(() => (isKeyPressed = false), 75);
	}

	function scheduleStageAdvance() {
		if (stagePauseTimer) clearTimeout(stagePauseTimer);
		stagePauseTimer = window.setTimeout(() => {
			engine.advanceStage();
			syncState();
		}, 500);
	}

	function scheduleWinReset() {
		if (winResetTimer) clearTimeout(winResetTimer);
		winResetTimer = window.setTimeout(() => {
			handleReset();
		}, 1400);
	}

	function handleVisualFailure() {
		isFailedShaking = true;
		soundEngine.playFailBuzz();

		if (failResetTimer) clearTimeout(failResetTimer);
		failResetTimer = window.setTimeout(() => {
			isFailedShaking = false;
			handleReset();
		}, 900);
	}

	function handleReset() {
		if (stagePauseTimer) clearTimeout(stagePauseTimer);
		if (failResetTimer) clearTimeout(failResetTimer);
		if (winResetTimer) clearTimeout(winResetTimer);

		isFailedShaking = false;
		engine.reset();
		syncState();
	}

	function setMode(newMode: GameMode) {
		engine.setMode(newMode);
		syncState();
		persistSettings();
	}

	function setSingleDifficulty(diff: "easy" | "medium" | "hard") {
		engine.setSingleDifficulty(diff);
		syncState();
		persistSettings();
	}

	function handlePhysicsChange(
		field: "decayRate" | "progressPerTap",
		value: number,
	) {
		const nextDecayRate = field === "decayRate" ? value : lockState.decayRate;
		const nextProgressPerTap =
			field === "progressPerTap" ? value : lockState.progressPerTap;
		engine.setCustomPhysics(nextDecayRate, nextProgressPerTap);
		syncState();
		persistSettings();
	}

	function resetPhysicsPreset() {
		engine.applyDifficultyForCurrentState();
		syncState();
		persistSettings();
	}

	function loop(now: number) {
		const delta = Math.min(0.1, (now - lastTick) / 1000);
		lastTick = now;

		const tickResult = engine.tick(delta);
		syncState();

		if (tickResult.failed) {
			handleVisualFailure();
		}

		animFrame = requestAnimationFrame(loop);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.repeat) return;
		if (e.key === "e" || e.key === "E") {
			e.preventDefault();
			handleTap();
		}
	}

	onMount(() => {
		window.addEventListener("keydown", handleKeyDown);
		void restorePersistedState().finally(() => {
			lastTick = performance.now();
			animFrame = requestAnimationFrame(loop);
		});
	});

	onDestroy(() => {
		if (animFrame !== null) cancelAnimationFrame(animFrame);
		if (stagePauseTimer) clearTimeout(stagePauseTimer);
		if (failResetTimer) clearTimeout(failResetTimer);
		if (winResetTimer) clearTimeout(winResetTimer);
		if (typeof window !== "undefined") {
			window.removeEventListener("keydown", handleKeyDown);
		}
	});

	const radius = 38;
	const circumference = 2 * Math.PI * radius; // ~238.76
	let dashOffset = $derived(
		circumference -
			(circumference * Math.min(100, Math.max(0, lockState.progress))) / 100,
	);

	let countdownColor = $derived.by(() => {
		const ratio = Math.max(
			0,
			Math.min(1, lockState.stageTimeLeft / STAGE_TIMEOUT),
		);
		const hue = Math.round(ratio * 32);
		return `hsl(${hue}, 95%, 55%)`;
	});
</script>

<div
	class="relative w-full h-screen bg-black flex flex-col items-center justify-center select-none overflow-hidden"
>
	<!-- Top Mode Switcher & Stage Tracker -->
	<div
		class="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 z-40 select-none"
	>
		<LockpickModeSelector mode={lockState.mode} onModeChange={setMode} />
		<LockpickStageTracker
			snapshot={lockState}
			onDifficultyChange={setSingleDifficulty}
		/>
	</div>
	<!-- Lockpick Circular Container (Non-clickable, keyboard E only) -->
	<div
		class="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center select-none pointer-events-none transition-transform duration-75 {isFailedShaking
			? 'animate-shake'
			: ''}"
	>
		<!-- SVG Circular Track and Progress Arc -->
		<svg
			class="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
			viewBox="0 0 100 100"
		>
			<circle
				cx="50"
				cy="50"
				r={radius}
				fill="transparent"
				stroke={lockState.status === "failed"
					? "rgba(239, 68, 68, 0.25)"
					: "rgba(255, 255, 255, 0.18)"}
				stroke-width="12"
			/>

			{#if lockState.status === "failed"}
				<circle
					cx="50"
					cy="50"
					r={radius}
					fill="transparent"
					stroke="#ef4444"
					stroke-width="12"
					stroke-linecap="butt"
				/>
			{:else if lockState.progress > 0}
				<circle
					cx="50"
					cy="50"
					r={radius}
					fill="transparent"
					stroke={lockState.status === "won" ? "#34d399" : "#ffffff"}
					stroke-width="12"
					stroke-dasharray={circumference}
					stroke-dashoffset={dashOffset}
					stroke-linecap="butt"
					class="transition-all duration-75 ease-out"
				/>
			{/if}
		</svg>

		<!-- Center Keycap Indicator (Non-clickable with mouse, keyboard E only) -->
		<div
			class="relative z-10 w-11 h-11 md:w-12 md:h-12 rounded-[4px] flex items-center justify-center shadow-lg transition-transform duration-75 pointer-events-none select-none cursor-default {isKeyPressed
				? 'scale-90'
				: 'scale-100'} {lockState.status === 'failed'
				? 'bg-red-500 text-black'
				: lockState.status === 'won'
					? 'bg-emerald-400 text-black'
					: 'bg-white text-black'}"
		>
			{#if lockState.status === "failed"}
				<X class="w-6 h-6 md:w-7 md:h-7 stroke-[3]" />
			{:else if lockState.status === "won"}
				<Check class="w-6 h-6 md:w-7 md:h-7 stroke-[3]" />
			{:else}
				<span class="leading-none select-none text-2xl md:text-3xl font-black"
					>E</span
				>
			{/if}
		</div>
	</div>

	<!-- Status / Timer Directly Under Lockpick with Small Gap -->
	<div
		class="mt-3.5 min-h-8 flex items-center justify-center select-none text-center pointer-events-none"
	>
		{#if lockState.status === "waiting_start"}
			<span
				class="font-mono text-lg md:text-xl font-bold tracking-widest tabular-nums transition-colors duration-75"
				style="color: {countdownColor}"
			>
				{lockState.stageTimeLeft.toFixed(1)}s
			</span>
		{:else if lockState.status === "idle"}
			<span
				class="text-xs md:text-sm font-bold italic tracking-wider text-neutral-500 uppercase"
			>
				PRESS E TO START
			</span>
		{:else if lockState.status === "failed"}
			<span
				class="px-3.5 py-1 bg-red-500 text-black text-sm md:text-base font-semibold italic tracking-wider uppercase leading-none rounded-none shadow-lg"
			>
				{lockState.failReason === "timeout"
					? "TIME EXPIRED"
					: "LOCKPICK SNAPPED"}
			</span>
		{:else if lockState.status === "won"}
			<span
				class="px-3.5 py-1 bg-emerald-400 text-black text-sm md:text-base font-semibold italic tracking-wider uppercase leading-none rounded-none shadow-lg"
			>
				UNLOCKED
			</span>
		{/if}
	</div>

	<LockpickStatsPanel snapshot={lockState} />
	{#if dev}
		<LockpickSettingsPanel
			snapshot={lockState}
			onPhysicsChange={handlePhysicsChange}
			onResetPreset={resetPhysicsPreset}
		/>
	{/if}
</div>

<style>
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20%,
		60% {
			transform: translateX(-8px);
		}
		40%,
		80% {
			transform: translateX(8px);
		}
	}
	.animate-shake {
		animation: shake 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	}
</style>
