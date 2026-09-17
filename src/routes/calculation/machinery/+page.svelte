<script lang="ts">
  import StatsSummary from "$lib/components/machinery/StatsSummary.svelte";
  import MachineryCanvas from "$lib/components/machinery/MachineryCanvas.svelte";
</script>

<div class="flex-1 flex flex-col h-screen overflow-hidden">
  <StatsSummary />
  <MachineryCanvas />
</div>
