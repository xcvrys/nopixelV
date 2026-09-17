<script lang="ts">
	import Button from "$lib/components/ui/Button.svelte";
	import type { GameMode } from "$lib/engine/lockpick";

	let {
		mode,
		onModeChange,
	}: { mode: GameMode; onModeChange: (mode: GameMode) => void } = $props();

	const modes: { id: GameMode; label: string }[] = [
		{ id: "progressive", label: "3-Progressive" },
		{ id: "maxing", label: "Maxing" },
		{ id: "single", label: "Single" },
	];
</script>

<div
	class="flex items-center border border-neutral-900 bg-black p-1 shadow-2xl"
>
	{#each modes as item}
		<Button
			variant={mode === item.id ? "primary" : "quiet"}
			onclick={() => onModeChange(item.id)}
			class="px-3.5 py-1.5"
		>
			{item.label}
		</Button>
	{/each}
</div>
