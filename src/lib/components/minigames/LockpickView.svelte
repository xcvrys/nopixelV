<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { dev } from "$app/environment";
	import { soundEngine } from "$lib/engine/audio";
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
	import {
		SlidersHorizontal,
		RotateCcw,
		Check,
		X,
		Flame,
		Timer,
	} from "lucide-svelte";

	// Decoupled Game Engine
	const engine = new LockpickLogic();

	// Single reactive snapshot of domain state
	let lockState = $state<LockpickSnapshot>(engine.snapshot);

	// Visual-only states and animation timers
	let isKeyPressed = $state(false);
	let isFailedShaking = $state(false);
	let showSettings = $state(false);

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

	function handleCustomPhysicsInput() {
		engine.setCustomPhysics(lockState.decayRate, lockState.progressPerTap);
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
		<div
			class="flex items-center border border-neutral-900 bg-black p-1 shadow-2xl"
		>
			<button
				onclick={() => setMode("progressive")}
				class="px-3.5 py-1.5 font-bold italic text-xs uppercase border-0 outline-none transition-colors cursor-pointer {lockState.mode ===
				'progressive'
					? 'bg-white text-black'
					: 'text-neutral-400 hover:text-white bg-transparent'}"
			>
				3-Progressive
			</button>
			<button
				onclick={() => setMode("maxing")}
				class="px-3.5 py-1.5 font-bold italic text-xs uppercase border-0 outline-none transition-colors cursor-pointer {lockState.mode ===
				'maxing'
					? 'bg-white text-black'
					: 'text-neutral-400 hover:text-white bg-transparent'}"
			>
				Maxing
			</button>
			<button
				onclick={() => setMode("single")}
				class="px-3.5 py-1.5 font-bold italic text-xs uppercase border-0 outline-none transition-colors cursor-pointer {lockState.mode ===
				'single'
					? 'bg-white text-black'
					: 'text-neutral-400 hover:text-white bg-transparent'}"
			>
				Single
			</button>
		</div>

		<!-- Mode Sub-bar / Stage Tracker -->
		{#if lockState.mode === "progressive"}
			<div
				class="flex items-center gap-3 text-xs font-bold italic uppercase tracking-wider"
			>
				<span class="text-neutral-500">STAGE {lockState.currentStage}/3</span>
				<div class="flex items-center gap-1.5">
					{#each [1, 2, 3] as s}
						{@const isPassed =
							s < lockState.currentStage ||
							(s === lockState.currentStage &&
								(lockState.status === "stage_complete" ||
									lockState.status === "won"))}
						{@const isFailed =
							s === lockState.currentStage && lockState.status === "failed"}
						{@const isActive =
							s === lockState.currentStage && !isPassed && !isFailed}
						<div
							class="w-7 h-1 transition-all {isPassed
								? 'bg-emerald-400'
								: isFailed
									? 'bg-red-500'
									: isActive
										? 'bg-white'
										: 'bg-neutral-800'}"
						></div>
					{/each}
				</div>
				<span class="text-neutral-400 text-[11px] font-mono">
					({lockState.currentStage === 1
						? "EASY"
						: lockState.currentStage === 2
							? "MEDIUM"
							: "HARD"})
				</span>
			</div>
		{:else if lockState.mode === "maxing"}
			<div
				class="flex items-center gap-4 text-xs font-bold italic uppercase tracking-wider"
			>
				<div class="flex items-center gap-1.5">
					<span class="text-neutral-500">LEVEL</span>
					<span class="font-mono text-white text-sm tabular-nums"
						>{lockState.currentLevel}</span
					>
				</div>
				<div class="w-1 h-1 rounded-full bg-neutral-800"></div>
				<div class="group relative flex items-center gap-1.5 cursor-pointer">
					<span class="text-neutral-500 flex items-center gap-1">
						<Flame class="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
						BEST STREAK
					</span>
					<span class="font-mono text-amber-400 text-sm tabular-nums"
						>{lockState.bestStreak}</span
					>

					<!-- Hover Tooltip Exposing Time Completed -->
					<div
						class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-[11px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-2xl flex items-center gap-1.5 text-neutral-300"
					>
						<Timer class="w-3 h-3 text-amber-400" />
						<span class="text-neutral-500">TIME:</span>
						<span class="font-bold text-white tabular-nums"
							>{lockState.bestStreakTime > 0
								? lockState.bestStreakTime.toFixed(1) + "s"
								: "—"}</span
						>
					</div>
				</div>
			</div>
		{:else if lockState.mode === "single"}
			<div
				class="flex items-center gap-1 border border-neutral-900 bg-neutral-950 p-0.5"
			>
				{#each ["easy", "medium", "hard"] as const as diff}
					<button
						onclick={() => setSingleDifficulty(diff)}
						class="px-3 py-1 font-bold italic text-[10px] uppercase border-0 outline-none transition-colors cursor-pointer {lockState.singleDifficulty ===
						diff
							? 'bg-neutral-200 text-black'
							: 'text-neutral-500 hover:text-neutral-300 bg-transparent'}"
					>
						{diff}
					</button>
				{/each}
			</div>
		{/if}
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

	<!-- Analytics Always Displayed at the Bottom of the Screen (Run-based) -->
	<div
		class="absolute bottom-6 left-1/2 -translate-x-1/2 grid grid-cols-3 gap-6 md:gap-10 text-center font-bold italic tracking-wider uppercase text-xs select-none pointer-events-none w-max"
	>
		<div class="flex items-center justify-center gap-1.5 min-w-[5.5rem]">
			<span class="text-neutral-500">TAPS</span>
			<span class="font-mono text-white text-sm tabular-nums"
				>{lockState.isRunActive
					? lockState.runTaps
					: lockState.lastRunTaps}</span
			>
		</div>
		<div class="flex items-center justify-center gap-1.5 min-w-[5.5rem]">
			<span class="text-neutral-500">TIME</span>
			<span class="font-mono text-white text-sm tabular-nums"
				>{(lockState.isRunActive
					? lockState.runElapsedTime
					: lockState.lastRunTime
				).toFixed(1)}s</span
			>
		</div>
		<div class="flex items-center justify-center gap-1.5 min-w-[5.5rem]">
			<span class="text-neutral-500">SPEED</span>
			<span class="font-mono text-white text-sm tabular-nums">
				{lockState.isRunActive
					? lockState.currentRunCps
					: lockState.lastRunCps}<span
					class="text-[10px] text-neutral-500 font-normal ml-0.5">CPS</span
				>
			</span>
		</div>
	</div>

	<!-- Bottom Right Controls Area (SETTINGS Only) -->
	<div
		class="absolute bottom-6 right-6 md:right-8 z-40 flex items-center gap-3"
	>
		{#if showSettings}
			<div
				class="absolute bottom-12 right-0 w-64 bg-black border border-neutral-900 p-4 z-50 text-xs shadow-2xl"
			>
				<div
					class="flex items-center justify-between mb-3 border-b border-neutral-900 pb-2"
				>
					<div class="flex items-center gap-2">
						<SlidersHorizontal class="w-3.5 h-3.5 text-neutral-400" />
						<span class="font-bold italic text-white tracking-wider uppercase"
							>Settings</span
						>
						{#if dev}
							<span
								class="text-[9px] font-mono px-1.5 py-0.5 bg-neutral-900 text-neutral-400 border border-neutral-800 uppercase"
								>DEV</span
							>
						{:else}
							<span
								class="text-[9px] font-mono px-1.5 py-0.5 bg-neutral-950 text-neutral-600 border border-neutral-900 uppercase"
								>LOCKED</span
							>
						{/if}
					</div>
					{#if dev}
						<button
							onclick={resetPhysicsPreset}
							class="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white underline italic border-0 outline-none bg-transparent cursor-pointer"
						>
							<RotateCcw class="w-3 h-3" />
							<span>Reset Preset</span>
						</button>
					{/if}
				</div>

				{#if !dev}
					<div
						class="p-2.5 bg-neutral-950 border border-neutral-900 text-[11px] text-neutral-500 italic mb-3"
					>
						Settings can only be edited in development mode.
					</div>
				{/if}

				<div
					class="space-y-3 {dev
						? ''
						: 'opacity-40 pointer-events-none select-none'}"
				>
					<div>
						<div class="flex justify-between text-neutral-400 mb-1">
							<span>Decay Rate</span>
							<span class="font-mono text-white font-bold"
								>{lockState.decayRate.toFixed(1)}% / s</span
							>
						</div>
						<input
							type="range"
							min="3"
							max="35"
							step="0.5"
							disabled={!dev}
							bind:value={lockState.decayRate}
							oninput={handleCustomPhysicsInput}
							class="w-full accent-white bg-neutral-800 cursor-pointer h-1 border-0 outline-none disabled:cursor-not-allowed"
						/>
					</div>

					<div>
						<div class="flex justify-between text-neutral-400 mb-1">
							<span>Progress per Tap</span>
							<span class="font-mono text-white font-bold"
								>+{lockState.progressPerTap.toFixed(1)}%</span
							>
						</div>
						<input
							type="range"
							min="2"
							max="15"
							step="0.5"
							disabled={!dev}
							bind:value={lockState.progressPerTap}
							oninput={handleCustomPhysicsInput}
							class="w-full accent-white bg-neutral-800 cursor-pointer h-1 border-0 outline-none disabled:cursor-not-allowed"
						/>
					</div>
				</div>
			</div>
		{/if}

		<button
			onclick={() => (showSettings = !showSettings)}
			class="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold italic text-xs uppercase border-0 outline-none transition-colors select-none cursor-pointer {showSettings
				? 'bg-white text-black'
				: 'bg-black text-white hover:bg-white hover:text-black'}"
		>
			<SlidersHorizontal class="w-3.5 h-3.5" />
			<span>SETTINGS</span>
		</button>
	</div>
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
