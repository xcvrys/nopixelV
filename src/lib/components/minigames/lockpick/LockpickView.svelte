<script lang="ts">
	import { onMount } from "svelte";
	import { dev } from "$app/environment";
	import { Check, X } from "lucide-svelte";
	import { createLockpickStore } from "$lib/stores/lockpick.svelte";
	import LockpickModeSelector from "./LockpickModeSelector.svelte";
	import LockpickStageTracker from "./LockpickStageTracker.svelte";
	import LockpickStatsPanel from "./LockpickStats.svelte";
	import LockpickSettingsPanel from "./LockpickSettings.svelte";

	const lockpick = createLockpickStore();

	onMount(() => {
		void lockpick.start();
		return () => lockpick.stop();
	});

	const radius = 38;
	const circumference = 2 * Math.PI * radius;
	let dashOffset = $derived(
		circumference -
			(circumference * Math.min(100, Math.max(0, lockpick.snapshot.progress))) /
				100,
	);

	let countdownColor = $derived.by(() => {
		const ratio = Math.max(
			0,
			Math.min(1, lockpick.snapshot.stageTimeLeft / lockpick.stageTimeout),
		);
		const hue = Math.round(ratio * 32);
		return `hsl(${hue}, 95%, 55%)`;
	});
</script>

<div
	class="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-black select-none"
>
	<!-- Top Mode Switcher & Stage Tracker -->
	<div
		class="absolute top-16 left-1/2 z-40 flex -translate-x-1/2 select-none flex-col items-center gap-2.5 md:top-6"
	>
		<LockpickModeSelector
			mode={lockpick.snapshot.mode}
			onModeChange={(mode) => lockpick.setMode(mode)}
		/>
		<LockpickStageTracker
			snapshot={lockpick.snapshot}
			onDifficultyChange={(difficulty) =>
				lockpick.setSingleDifficulty(difficulty)}
		/>
	</div>
	<!-- Lockpick Circular Container (Non-clickable, keyboard E only) -->
	<div
		class="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center select-none pointer-events-none transition-transform duration-75 {lockpick.isFailedShaking
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
				stroke={lockpick.snapshot.status === "failed"
					? "rgba(239, 68, 68, 0.25)"
					: "rgba(255, 255, 255, 0.18)"}
				stroke-width="12"
			/>

			{#if lockpick.snapshot.status === "failed"}
				<circle
					cx="50"
					cy="50"
					r={radius}
					fill="transparent"
					stroke="#ef4444"
					stroke-width="12"
					stroke-linecap="butt"
				/>
			{:else if lockpick.snapshot.progress > 0}
				<circle
					cx="50"
					cy="50"
					r={radius}
					fill="transparent"
					stroke={lockpick.snapshot.status === "won" ? "#34d399" : "#ffffff"}
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
			class="relative z-10 w-11 h-11 md:w-12 md:h-12 rounded-[4px] flex items-center justify-center shadow-lg transition-transform duration-75 pointer-events-none select-none cursor-default {lockpick.isKeyPressed
				? 'scale-90'
				: 'scale-100'} {lockpick.snapshot.status === 'failed'
				? 'bg-red-500 text-black'
				: lockpick.snapshot.status === 'won'
					? 'bg-emerald-400 text-black'
					: 'bg-white text-black'}"
		>
			{#if lockpick.snapshot.status === "failed"}
				<X class="w-6 h-6 md:w-7 md:h-7 stroke-[3]" />
			{:else if lockpick.snapshot.status === "won"}
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
		{#if lockpick.snapshot.status === "waiting_start"}
			<span
				class="font-mono text-lg md:text-xl font-bold tracking-widest tabular-nums transition-colors duration-75"
				style="color: {countdownColor}"
			>
				{lockpick.snapshot.stageTimeLeft.toFixed(1)}s
			</span>
		{:else if lockpick.snapshot.status === "idle"}
			<span
				class="text-xs md:text-sm font-bold italic tracking-wider text-neutral-500 uppercase"
			>
				PRESS E TO START
			</span>
		{:else if lockpick.snapshot.status === "failed"}
			<span
				class="px-3.5 py-1 bg-red-500 text-black text-sm md:text-base font-semibold italic tracking-wider uppercase leading-none rounded-none shadow-lg"
			>
				{lockpick.snapshot.failReason === "timeout"
					? "TIME EXPIRED"
					: "LOCKPICK SNAPPED"}
			</span>
		{:else if lockpick.snapshot.status === "won"}
			<span
				class="px-3.5 py-1 bg-emerald-400 text-black text-sm md:text-base font-semibold italic tracking-wider uppercase leading-none rounded-none shadow-lg"
			>
				UNLOCKED
			</span>
		{/if}
	</div>

	<LockpickStatsPanel snapshot={lockpick.snapshot} />
	{#if dev}
		<LockpickSettingsPanel
			snapshot={lockpick.snapshot}
			onPhysicsChange={(field, value) => lockpick.setPhysics(field, value)}
			onResetPreset={() => lockpick.resetPhysicsPreset()}
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
