<script lang="ts">
  import { Handle, Position, useStore } from "@xyflow/svelte";
  import { getMachine } from "$lib/data/machines";
  import {
    getHandleConnectionState,
    isHandleOccupied,
    type EnergyNodeData,
    type HandleType,
  } from "$lib/engine/machinery";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import { machineryUiStore } from "$lib/stores/machinery-ui.svelte";
  import MachineNodeHeader from "../machine/MachineNodeHeader.svelte";
  import { cn } from "$lib/utils/cn";

  let {
    id,
    data,
    selected = false,
  }: { id: string; data: EnergyNodeData; selected?: boolean } = $props();

  const flowStore = useStore();
  const machine = $derived(getMachine("fabricator"));
  const connectable = $derived(flowStore.nodesConnectable);
  const interactive = $derived(
    flowStore.nodesDraggable || flowStore.nodesConnectable || flowStore.elementsSelectable,
  );
  let showImage = $derived(machineryUiStore.imagesVisible && data.showImage !== false);
  let edges = $derived(machineryStore.edges);
  let activeConnection = $derived(machineryUiStore.activeConnection);

  function handleState(type: HandleType, handleId: string): string {
    const state = getHandleConnectionState(edges, activeConnection, {
      nodeId: id,
      handleId,
      handleType: type,
    });
    return cn(
      state.inProgress && "connection-in-progress",
      state.isStart && "connection-start",
      state.isCompatible && "connection-compatible",
    );
  }

  const energyAvailable = $derived(connectable && !isHandleOccupied(edges, id, "source", "energy"));
</script>

<div
  class={cn(
    "w-72 border-2 border-neutral-800 bg-neutral-950 transition-colors duration-150",
    selected ? "border-white" : "",
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
  <div class="relative flex items-center justify-end px-3.5 py-3">
    <span class="text-[10px] font-semibold uppercase tracking-wider text-white">Energy Output</span>
    <Handle
      type="source"
      position={Position.Right}
      id="energy"
      isConnectable={energyAvailable}
      isConnectableStart={energyAvailable}
      isConnectableEnd={energyAvailable}
      class={cn(
        "!box-border !-right-3 !h-2 !w-2 !rounded-none !border-0 !bg-white",
        handleState("source", "energy"),
      )}
    />
  </div>
</div>
