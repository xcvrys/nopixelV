<script lang="ts">
	let {
		label,
		badge = "COMING SOON",
		class: className = "",
	}: {
		label: string;
		badge?: "SOON" | "COMING SOON";
		class?: string;
	} = $props();
</script>

<div
	aria-disabled="true"
	title="Coming Soon"
	class={`inline-flex cursor-not-allowed select-none items-center justify-center gap-2 border-0 bg-black font-semibold italic uppercase leading-none text-neutral-600 ${className}`}
>
	<span>{label}</span>
	<span
		class="bg-neutral-900 px-2 py-0.5 text-[10px] font-bold tracking-wider text-neutral-400"
	>
		{badge}
	</span>
</div>
