<script lang="ts">
  import { getContext } from "svelte";
  import { useStore } from "@xyflow/svelte";
  import { getRecipe } from "$lib/data/recipes";
  import { getMachine } from "$lib/data/machines";
  import { ChevronDown } from "lucide-svelte";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import { machineryUiStore } from "$lib/stores/machinery-ui.svelte";
  import type { MachineNodeData } from "$lib/engine/machinery";
  import { cn } from "$lib/utils/cn";
  import MachineNodeHeader from "./MachineNodeHeader.svelte";
  import MachineNodeImage from "./MachineNodeImage.svelte";
  import MachineNodePorts from "./MachineNodePorts.svelte";
  import MachineNodeStatus from "./MachineNodeStatus.svelte";
  import {
    NodeInternalsCoordinator,
    NODE_INTERNALS_COORDINATOR_CONTEXT,
  } from "../../canvas/NodeInternalsCoordinator.svelte";

  let {
    id,
    data,
    selected = false,
  }: { id: string; data: MachineNodeData; selected?: boolean } = $props();

  const flowStore = useStore();
  const nodeInternalsCoordinator = getContext<NodeInternalsCoordinator>(
    NODE_INTERNALS_COORDINATOR_CONTEXT,
  );
  let showImage = $derived(machineryUiStore.imagesVisible && data.showImage !== false);
  let interactive = $derived(
    flowStore.nodesDraggable || flowStore.nodesConnectable || flowStore.elementsSelectable,
  );
  let connectable = $derived(flowStore.nodesConnectable);
  let recipe = $derived(data.recipeId ? (getRecipe(data.recipeId) ?? null) : null);
  let machine = $derived(getMachine(data.machineType));
  let requiresPower = $derived((recipe?.powerCost ?? machine?.defaultPowerCost ?? 0) > 0);
  let stats = $derived(machineryStore.calculationResult.machineStats[id]);

  $effect(() => {
    void showImage;
    void recipe;
    void requiresPower;
    nodeInternalsCoordinator.queue(id);
  });
</script>

<div
  class={cn(
    "w-72 border-2 border-neutral-800 bg-neutral-950 transition-colors duration-150",
    selected ? "border-white" : "",
  )}
>
  <MachineNodeHeader {id} {data} {interactive} />
  <MachineNodeImage
    {id}
    name={data.name}
    imageUrl={machine?.imageUrl ?? null}
    {connectable}
    {requiresPower}
    {showImage}
  />
  <button
    type="button"
    disabled={!interactive}
    onclick={() => machineryUiStore.openRecipePicker(id)}
    class="flex w-full items-center justify-between border-b border-neutral-900 bg-neutral-950 px-3.5 py-2 text-left text-xs font-semibold text-white hover:bg-neutral-900"
  >
    <span class="truncate">{recipe?.name ?? "Select Recipe"}</span>
    <ChevronDown class="h-3.5 w-3.5 shrink-0 text-neutral-400" />
  </button>
  <MachineNodePorts {id} {recipe} {stats} {connectable} />
  <MachineNodeStatus {stats} {requiresPower} />
</div>
