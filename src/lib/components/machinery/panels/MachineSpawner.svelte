<script lang="ts">
  import { useSvelteFlow } from "@xyflow/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { STARTER_MACHINES } from "$lib/data/machines";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import { Plus } from "lucide-svelte";

  let showMenu = $state(false);
  const { screenToFlowPosition } = useSvelteFlow();

  function addMachine(type: string): void {
    const center = screenToFlowPosition(
      { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      { snapToGrid: false },
    );
    machineryStore.addMachine(type, {
      x: center.x - 144,
      y: center.y - 200,
    });
    showMenu = false;
  }
</script>

<div class="relative">
  <Button
    variant="quiet"
    onclick={() => (showMenu = !showMenu)}
    class="rounded-none border-0 bg-neutral-950 px-3.5 py-1 text-base font-bold italic uppercase text-white hover:bg-white hover:text-black"
  >
    <Plus class="h-4 w-4" />
    <span>Spawn Machine</span>
  </Button>

  {#if showMenu}
    <div class="absolute right-0 z-50 mt-2 w-52 border border-neutral-800 bg-black p-1 shadow-2xl">
      {#each STARTER_MACHINES as machine (machine.type)}
        <button
          type="button"
          onclick={() => addMachine(machine.type)}
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-neutral-300 hover:bg-neutral-900 hover:text-white"
        >
          <span class="h-1.5 w-1.5 bg-neutral-400"></span>
          <span>{machine.name}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
