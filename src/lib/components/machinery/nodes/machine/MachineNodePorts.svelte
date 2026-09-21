<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";
  import { getItem } from "$lib/data/items";
  import type { RecipeDefinition } from "$lib/data/types";
  import {
    getHandleConnectionState,
    isHandleOccupied,
    type HandleType,
  } from "$lib/engine/machinery";
  import type { MachineStats } from "$lib/engine/calculator";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import { machineryUiStore } from "$lib/stores/machinery-ui.svelte";
  import { cn } from "$lib/utils/cn";

  let {
    id,
    recipe,
    stats,
    connectable,
  }: {
    id: string;
    recipe: RecipeDefinition | null;
    stats: MachineStats | undefined;
    connectable: boolean;
  } = $props();

  let edges = $derived(machineryStore.edges);
  let activeConnection = $derived(machineryUiStore.activeConnection);

  function getHandleState(type: HandleType, handleId: string): string {
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

  function isHandleAvailable(type: HandleType, handleId: string): boolean {
    return connectable && !isHandleOccupied(edges, id, type, handleId);
  }
</script>

<div class="relative grid grid-cols-2 gap-2 bg-neutral-950 px-3.5 py-3">
  <div class="space-y-3">
    {#if recipe && recipe.inputs.length > 0}
      <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white">Inputs</div>
      {#each recipe.inputs as input (input.itemId)}
        {@const item = getItem(input.itemId)}
        {@const inputStat = stats?.rates.inputs.find((entry) => entry.itemId === input.itemId)}
        <div class="relative flex items-center gap-1.5 py-0.5">
          <Handle
            type="target"
            position={Position.Left}
            id={input.itemId}
            isConnectable={isHandleAvailable("target", input.itemId)}
            isConnectableStart={isHandleAvailable("target", input.itemId)}
            isConnectableEnd={isHandleAvailable("target", input.itemId)}
            class={cn(
              "!-left-6 !box-border !h-2 !w-2 !rounded-none !border-0 !bg-white",
              getHandleState("target", input.itemId),
            )}
          />
          <div class="min-w-0">
            <div class="truncate text-[11px] font-semibold text-white">
              {item?.name || input.itemId}
            </div>
            <div class="font-mono text-[10px] text-white">
              {inputStat ? inputStat.amountPerMin.toFixed(1) : (input.amount * 20).toFixed(0)}/m
            </div>
          </div>
        </div>
      {/each}
    {:else}
      <div class="text-[10px] italic text-slate-600">No inputs required</div>
    {/if}
  </div>

  <div class="space-y-3 text-right">
    {#if recipe && recipe.outputs.length > 0}
      <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white">Outputs</div>
      {#each recipe.outputs as output (output.itemId)}
        {@const item = getItem(output.itemId)}
        {@const outputStat = stats?.actualOutputs.find((entry) => entry.itemId === output.itemId)}
        <div class="relative flex items-center justify-end gap-1.5 py-0.5">
          <div class="min-w-0">
            <div class="truncate text-[11px] font-semibold text-white">
              {item?.name || output.itemId}
            </div>
            <div class="font-mono text-[10px] text-white">
              {outputStat ? outputStat.amountPerMin.toFixed(1) : (output.amount * 20).toFixed(0)}/m
            </div>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id={output.itemId}
            isConnectable={isHandleAvailable("source", output.itemId)}
            isConnectableStart={isHandleAvailable("source", output.itemId)}
            isConnectableEnd={isHandleAvailable("source", output.itemId)}
            class={cn(
              "!-right-6 !box-border !h-2 !w-2 !rounded-none !border-0 !bg-white",
              getHandleState("source", output.itemId),
            )}
          />
        </div>
      {/each}
    {:else}
      <div class="text-[10px] italic text-slate-600">No outputs</div>
    {/if}
  </div>
</div>
