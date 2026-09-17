<script lang="ts">
	import type { LockpickSnapshot } from "$lib/engine/lockpick";

	let { snapshot }: { snapshot: LockpickSnapshot } = $props();
</script>

<div
	class="absolute bottom-6 left-1/2 grid w-max -translate-x-1/2 grid-cols-3 gap-6 text-center text-xs font-bold italic uppercase tracking-wider text-white select-none pointer-events-none md:gap-10"
>
	<div class="flex min-w-[5.5rem] items-center justify-center gap-1.5">
		<span class="text-neutral-500">TAPS</span>
		<span class="text-sm font-mono tabular-nums">
			{snapshot.isRunActive ? snapshot.runTaps : snapshot.lastRunTaps}
		</span>
	</div>
	<div class="flex min-w-[5.5rem] items-center justify-center gap-1.5">
		<span class="text-neutral-500">TIME</span>
		<span class="text-sm font-mono tabular-nums">
			{(snapshot.isRunActive ? snapshot.runElapsedTime : snapshot.lastRunTime).toFixed(
				1,
			)}s
		</span>
	</div>
	<div class="flex min-w-[5.5rem] items-center justify-center gap-1.5">
		<span class="text-neutral-500">SPEED</span>
		<span class="text-sm font-mono tabular-nums">
			{snapshot.isRunActive ? snapshot.currentRunCps : snapshot.lastRunCps}<span
				class="ml-0.5 text-[10px] font-normal text-neutral-500">CPS</span
			>
		</span>
	</div>
</div>
