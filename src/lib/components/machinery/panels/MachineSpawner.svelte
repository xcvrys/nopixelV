<script lang="ts">
  import { useSvelteFlow } from "@xyflow/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { MACHINE_CATEGORIES, MACHINE_CATEGORY_ORDER, STARTER_MACHINES } from "$lib/data/machines";
  import { machineryStore } from "$lib/stores/machinery.svelte";
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

  function addTextNode(): void {
    const center = screenToFlowPosition(
      { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      { snapToGrid: false },
    );
    machineryStore.addTextNode("Text", {
      x: center.x - 128,
      y: center.y - 48,
    });
    showMenu = false;
  }

  function closeOnOutsidePointerdown(event: PointerEvent): void {
    const target = event.target;
    if (target instanceof Element && !target.closest("[data-machine-spawner]")) {
      showMenu = false;
    }
  }

  function startMachineDrag(type: string, event: DragEvent): void {
    event.dataTransfer?.setData("application/x-machinery-type", type);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
  }

  function finishMachineDrag(): void {
    showMenu = false;
  }
</script>

<svelte:window onpointerdown={closeOnOutsidePointerdown} />

<div class="relative" data-machine-spawner>
  <Button
    variant="quiet"
    onclick={() => (showMenu = !showMenu)}
    class="rounded-none border-0 bg-neutral-950 px-3.5 py-1 text-base font-bold italic uppercase text-white hover:bg-white hover:text-black"
  >
    <span class="text-lg leading-none">+</span>
    <span>Spawn Machine</span>
  </Button>
  <Button
    variant="quiet"
    onclick={addTextNode}
    class="rounded-none border-0 bg-neutral-950 px-3.5 py-1 text-base font-bold italic uppercase text-white hover:bg-white hover:text-black"
  >
    <span>+ Text</span>
  </Button>

  {#if showMenu}
    <div
      class="absolute right-0 z-50 mt-2 w-[26rem] max-w-[calc(100vw-2rem)] border border-neutral-800 bg-black p-1 shadow-2xl"
    >
      <div class="max-h-[min(28rem,calc(100vh-6rem))] space-y-3 overflow-y-auto">
        {#each MACHINE_CATEGORY_ORDER as category}
          <section>
            <h3 class="mb-2 px-2 pb-1 text-xl font-semibold italic text-white">
              {MACHINE_CATEGORIES[category]}
            </h3>
            <div class="grid grid-cols-2 gap-1">
              {#each STARTER_MACHINES.filter((machine) => machine.category === category) as machine (machine.type)}
                <div
                  role="group"
                  class="min-w-0"
                  draggable="true"
                  ondragstart={(event) => startMachineDrag(machine.type, event)}
                  ondragend={finishMachineDrag}
                >
                  <Button
                    onclick={() => addMachine(machine.type)}
                    title={machine.name}
                    class="group h-28 w-full min-w-0 flex-col items-stretch justify-start gap-1 border-0 bg-neutral-950 p-2 text-left normal-case hover:bg-white hover:text-black"
                  >
                    {#if machine.imageUrl}
                      <img
                        alt=""
                        src={machine.imageUrl}
                        class="h-[4.5rem] w-[4.5rem] self-center object-contain"
                        width="72"
                        height="72"
                        loading="lazy"
                        decoding="async"
                      />
                    {:else}
                      <span
                        aria-hidden="true"
                        class="flex h-[4.5rem] w-[4.5rem] self-center items-center justify-center bg-transparent text-4xl font-semibold text-neutral-500"
                      >
                        ?
                      </span>
                    {/if}
                    <span class="flex min-w-0 justify-center text-center">
                      <span
                        class="h-10 overflow-hidden text-base font-bold uppercase leading-tight"
                      >
                        {machine.name}
                      </span>
                    </span>
                  </Button>
                </div>
              {/each}
            </div>
          </section>
        {/each}
      </div>
    </div>
  {/if}
</div>
