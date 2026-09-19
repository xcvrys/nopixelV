<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";
  import { getItem } from "$lib/data/items";
  import type { RecipeDefinition } from "$lib/data/recipes";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import type { MachineStats } from "$lib/engine/calculator";

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

  function isHandleAvailable(type: "source" | "target", handleId: string): boolean {
    return (
      connectable &&
      !edges.some((edge) =>
        type === "source"
          ? edge.source === id && edge.sourceHandle === handleId
          : edge.target === id && edge.targetHandle === handleId,
      )
    );
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
            class="!box-border !-left-6 !h-2 !w-2 !rounded-none !border-0 !bg-white"
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
            class="!box-border !-right-6 !h-2 !w-2 !rounded-none !border-0 !bg-white"
          />
        </div>
      {/each}
    {:else}
      <div class="text-[10px] italic text-slate-600">No outputs</div>
    {/if}
  </div>
</div>
