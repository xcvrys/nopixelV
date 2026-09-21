<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";
  import { isHandleOccupied } from "$lib/engine/machinery";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import { cn } from "$lib/utils/cn";

  let {
    id,
    name,
    imageUrl,
    connectable,
    requiresPower,
    showImage,
  }: {
    id: string;
    name: string;
    imageUrl: string | null;
    connectable: boolean;
    requiresPower: boolean;
    showImage: boolean;
  } = $props();

  let edges = $derived(machineryStore.edges);
  let handleState = $derived.by(() => {
    const edge = edges.find(
      (candidate) => candidate.target === id && candidate.targetHandle === "energy",
    );
    return edge ? "connection-connected" : "connection-available";
  });
</script>

<div
  class={cn(
    "relative flex justify-center border-b border-neutral-900 p-1",
    !showImage && "min-h-8",
  )}
>
  {#if requiresPower}
    <Handle
      type="target"
      position={Position.Left}
      id="energy"
      isConnectable={connectable && !isHandleOccupied(edges, id, "target", "energy")}
      isConnectableStart={connectable && !isHandleOccupied(edges, id, "target", "energy")}
      isConnectableEnd={connectable && !isHandleOccupied(edges, id, "target", "energy")}
      class={cn(
        "!box-border !-left-3 !top-auto !bottom-1.5 !h-2 !w-2 !rounded-none !border-0 !bg-white",
        handleState,
      )}
    />
    <span
      class="pointer-events-none absolute bottom-2 left-4 text-[10px] font-semibold uppercase tracking-wider text-white"
    >
      Power
    </span>
  {/if}
  {#if showImage}
    <div
      class="flex aspect-square w-[100px] max-w-full items-center justify-center overflow-hidden"
    >
      {#if imageUrl}
        <img
          src={imageUrl}
          alt={`${name} image`}
          width="100"
          height="100"
          class="h-full w-full object-contain"
          decoding="async"
        />
      {:else}
        <span aria-hidden="true" class="text-5xl font-semibold text-neutral-500">?</span>
      {/if}
    </div>
  {/if}
</div>
