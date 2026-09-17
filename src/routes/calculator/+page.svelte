<script lang="ts">
	import StatsSummary from '$lib/components/factory/StatsSummary.svelte';
	import FactoryCanvas from '$lib/components/factory/FactoryCanvas.svelte';
</script>

<div class="flex-1 flex flex-col h-screen overflow-hidden">
	<StatsSummary />
	<FactoryCanvas />
</div>
