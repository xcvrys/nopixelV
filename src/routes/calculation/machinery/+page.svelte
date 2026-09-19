<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import ProductionSummary from "$lib/components/machinery/panels/ProductionSummary.svelte";
  import MachineSpawner from "$lib/components/machinery/panels/MachineSpawner.svelte";
  import WorkflowDrawer from "$lib/components/machinery/panels/WorkflowDrawer.svelte";
  import MachineryCanvas from "$lib/components/machinery/canvas/MachineryCanvas.svelte";
  import { machineryStore } from "$lib/stores/machinery.svelte";

  onMount(() => {
    void machineryStore.initialize();
  });
</script>

<div class="relative h-screen overflow-hidden">
  <SvelteFlowProvider>
    <header
      class="absolute inset-x-0 top-0 z-20 flex w-full flex-wrap items-center justify-between gap-4 px-4 py-3"
    >
      <ProductionSummary result={machineryStore.calculationResult} />
      <div class="ml-auto flex items-center gap-2">
        <MachineSpawner />
        <WorkflowDrawer />
      </div>
    </header>
    {#if machineryStore.persistenceError}
      <div
        role="alert"
        class="absolute left-4 top-20 z-30 border border-red-500 bg-red-950/90 px-3 py-2 text-xs font-semibold text-red-100"
      >
        {machineryStore.persistenceError}
      </div>
    {/if}
    <MachineryCanvas />
  </SvelteFlowProvider>
</div>
