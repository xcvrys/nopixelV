<script lang="ts">
  import { getContext } from "svelte";
  import { Handle, Position, useStore } from "@xyflow/svelte";
  import { getItem } from "$lib/data/items";
  import { getMachine } from "$lib/data/machines";
  import { getRecipe } from "$lib/data/recipes";
  import { ChevronDown } from "lucide-svelte";
  import {
    getHandleUiClass,
    isHandleAvailable,
    type EnergyNodeData,
    type HandleType,
  } from "$lib/engine/machinery";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import { machineryUiStore } from "$lib/stores/machinery-ui.svelte";
  import MachineNodeHeader from "../machine/MachineNodeHeader.svelte";
  import { cn } from "$lib/utils/cn";
  import {
    NodeInternalsCoordinator,
    NODE_INTERNALS_COORDINATOR_CONTEXT,
  } from "../../canvas/NodeInternalsCoordinator.svelte";

  let {
    id,
    data,
    selected = false,
  }: { id: string; data: EnergyNodeData; selected?: boolean } = $props();

  const flowStore = useStore();
  const nodeInternalsCoordinator = getContext<NodeInternalsCoordinator>(
    NODE_INTERNALS_COORDINATOR_CONTEXT,
  );
  const machine = $derived(getMachine("fabricator"));

  let recipe = $derived(data.recipeId ? (getRecipe(data.recipeId) ?? null) : null);

  const isDimmed = $derived(!machineryUiStore.powerRequired);
  const connectable = $derived(flowStore.nodesConnectable);
  const interactive = $derived(
    flowStore.nodesDraggable || flowStore.nodesConnectable || flowStore.elementsSelectable,
  );

  let showImage = $derived(machineryUiStore.imagesVisible && data.showImage !== false);
  let edges = $derived(machineryStore.edges);
  let activeConnection = $derived(machineryUiStore.activeConnection);

  function handleState(type: HandleType, handleId: string): string {
    return getHandleUiClass(
      type,
      handleId,
      id,
      activeConnection,
      machineryUiStore.isHandleCompatible(id, handleId),
    );
  }

  function isAvailable(type: HandleType, handleId: string): boolean {
    return isHandleAvailable(edges, id, type, handleId, connectable);
  }
  $effect(() => {
    void showImage;
    void recipe;
    nodeInternalsCoordinator.queue(id);
  });
</script>

<div
  class={cn(
    "w-72 border-2 border-neutral-800 bg-neutral-950 transition-all duration-200",
    selected ? "border-white" : "",
    isDimmed && "opacity-35 grayscale",
  )}
>
  <MachineNodeHeader {id} {data} {interactive} />
  {#if showImage}
    {#if machine?.imageUrl}
      <img src={machine.imageUrl} alt={machine.name} class="h-28 w-full object-contain" />
    {:else}
      <div class="flex h-28 items-center justify-center text-5xl text-neutral-500">?</div>
    {/if}
  {/if}
  <button
    type="button"
    disabled={!interactive}
    onclick={() => machineryUiStore.openRecipePicker(id)}
    class="flex w-full items-center justify-between border-b border-neutral-900 bg-neutral-950 px-3.5 py-2 text-left text-xs font-semibold text-white hover:bg-neutral-900"
  >
    <span class="truncate">{recipe?.name ?? "Select Recipe"}</span>
    <ChevronDown class="h-3.5 w-3.5 shrink-0 text-neutral-400" />
  </button>
  <div class="relative grid grid-cols-2 gap-2 bg-neutral-950 px-3.5 py-3">
    <div class="space-y-3">
      {#if recipe && recipe.inputs.length > 0}
        <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white">
          Fuel / Inputs
        </div>
        {#each recipe.inputs as input (input.itemId)}
          {@const item = getItem(input.itemId)}
          <div class="relative flex items-center gap-1.5 py-0.5">
            <Handle
              type="target"
              position={Position.Left}
              id={input.itemId}
              isConnectable={isAvailable("target", input.itemId)}
              isConnectableStart={isAvailable("target", input.itemId)}
              isConnectableEnd={isAvailable("target", input.itemId)}
              class={cn(
                "!-left-6 !box-border !h-2 !w-2 !rounded-none !border-0 !bg-white",
                handleState("target", input.itemId),
              )}
            />
            <div class="min-w-0">
              <div class="truncate text-[11px] font-semibold text-white">
                {item?.name ?? input.itemId}
              </div>
              <div class="text-[10px] tabular-nums text-neutral-400">
                {input.amount}x
              </div>
            </div>
          </div>
        {/each}
      {:else}
        <div class="text-[10px] italic text-neutral-600">No fuel required</div>
      {/if}
    </div>
    <div class="relative flex flex-col items-end justify-center">
      <span class="text-[10px] font-semibold uppercase tracking-wider text-white"
        >Energy Output</span
      >
      <Handle
        type="source"
        position={Position.Right}
        id="energy"
        isConnectable={isAvailable("source", "energy")}
        isConnectableStart={isAvailable("source", "energy")}
        isConnectableEnd={isAvailable("source", "energy")}
        class={cn(
          "!box-border !-right-6 !h-2 !w-2 !rounded-none !border-0 !bg-white",
          handleState("source", "energy"),
        )}
      />
    </div>
  </div>
</div>
