<script lang="ts">
	import { Flame, Timer } from "lucide-svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import type { LockpickSnapshot } from "$lib/engine/lockpick";

	let {
		snapshot,
		onDifficultyChange,
	}: {
		snapshot: LockpickSnapshot;
		onDifficultyChange: (difficulty: "easy" | "medium" | "hard") => void;
	} = $props();

	const difficulties = ["easy", "medium", "hard"] as const;
</script>

{#if snapshot.mode === "progressive"}
	<div
		class="flex items-center gap-3 text-xs font-bold italic uppercase tracking-wider"
	>
		<span class="text-neutral-500">STAGE {snapshot.currentStage}/3</span>
		<div class="flex items-center gap-1.5">
			{#each [1, 2, 3] as stage}
				{@const isPassed =
					stage < snapshot.currentStage ||
					(stage === snapshot.currentStage &&
						(snapshot.status === "stage_complete" || snapshot.status === "won"))}
				{@const isFailed =
					stage === snapshot.currentStage && snapshot.status === "failed"}
				{@const isActive =
					stage === snapshot.currentStage && !isPassed && !isFailed}
				<div
					class="h-1 w-7 transition-all {isPassed
						? 'bg-emerald-400'
						: isFailed
							? 'bg-red-500'
							: isActive
								? 'bg-white'
								: 'bg-neutral-800'}"
				></div>
			{/each}
		</div>
		<span class="text-[11px] font-mono text-neutral-400">
			({snapshot.currentStage === 1
				? "EASY"
				: snapshot.currentStage === 2
					? "MEDIUM"
					: "HARD"})
		</span>
	</div>
{:else if snapshot.mode === "maxing"}
	<div
		class="flex items-center gap-4 text-xs font-bold italic uppercase tracking-wider"
	>
		<div class="flex items-center gap-1.5">
			<span class="text-neutral-500">LEVEL</span>
			<span class="text-sm font-mono tabular-nums text-white"
				>{snapshot.currentLevel}</span
			>
		</div>
		<div class="h-1 w-1 rounded-full bg-neutral-800"></div>
		<div class="group relative flex cursor-pointer items-center gap-1.5">
			<span class="flex items-center gap-1 text-neutral-500">
				<Flame class="h-3.5 w-3.5 fill-amber-400/20 text-amber-400" />
				BEST STREAK
			</span>
			<span class="text-sm font-mono tabular-nums text-amber-400"
				>{snapshot.bestStreak}</span
			>
			<div
				class="pointer-events-none absolute left-1/2 top-full z-50 mt-2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-[11px] font-mono text-neutral-300 opacity-0 shadow-2xl transition-opacity duration-150 group-hover:opacity-100"
			>
				<Timer class="h-3 w-3 text-amber-400" />
				<span class="text-neutral-500">TIME:</span>
				<span class="font-bold tabular-nums text-white">
					{snapshot.bestStreakTime > 0
						? `${snapshot.bestStreakTime.toFixed(1)}s`
						: "—"}
				</span>
			</div>
		</div>
	</div>
{:else if snapshot.mode === "single"}
	<div
		class="flex items-center gap-1 border border-neutral-900 bg-neutral-950 p-0.5"
	>
		{#each difficulties as difficulty}
			<Button
				variant={snapshot.singleDifficulty === difficulty ? "primary" : "quiet"}
				onclick={() => onDifficultyChange(difficulty)}
				class="px-3 py-1 text-[10px]"
			>
				{difficulty}
			</Button>
		{/each}
	</div>
{/if}
