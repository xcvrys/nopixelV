<script lang="ts">
  import { tick } from "svelte";
  import { useStore, useUpdateNodeInternals } from "@xyflow/svelte";
  import { getRecipesForMachine, getRecipe } from "$lib/data/recipes";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import type { MachineNodeData } from "$lib/engine/machinery";
  import { cn } from "$lib/utils/cn";
  import MachineNodeHeader from "./MachineNodeHeader.svelte";
  import MachineNodeImage from "./MachineNodeImage.svelte";
  import MachineNodePorts from "./MachineNodePorts.svelte";
  import MachineNodeRecipe from "./MachineNodeRecipe.svelte";
  import MachineNodeStatus from "./MachineNodeStatus.svelte";

  let {
    id,
    data,
    selected = false,
  }: { id: string; data: MachineNodeData; selected?: boolean } = $props();

  const flowStore = useStore();
  const updateNodeInternals = useUpdateNodeInternals();
  let showImage = $derived(data.showImage !== false);
  let interactive = $derived(
    flowStore.nodesDraggable || flowStore.nodesConnectable || flowStore.elementsSelectable,
  );
  let connectable = $derived(flowStore.nodesConnectable);
  let recipes = $derived(getRecipesForMachine(data.machineType));
  let recipe = $derived(data.recipeId ? (getRecipe(data.recipeId) ?? null) : null);
  let stats = $derived(machineryStore.calculationResult.machineStats[id]);

  $effect(() => {
    const nodeId = id;
    void showImage;
    void recipe;
    void tick().then(() => updateNodeInternals([nodeId]));
  });

  function handleRecipeChange(event: Event): void {
    const select = event.currentTarget as HTMLSelectElement;
    machineryStore.updateNodeData(id, { recipeId: select.value || null });
  }
</script>

<div
  class={cn(
    "w-72 border-2 border-[#262626] bg-neutral-950 transition-colors duration-150",
    selected ? "border-white" : "",
  )}
>
  <MachineNodeHeader {id} {data} {interactive} />
  {#if showImage}<MachineNodeImage name={data.name} />{/if}
  <MachineNodeRecipe {id} {data} {recipes} {interactive} onRecipeChange={handleRecipeChange} />
  <MachineNodePorts {id} {recipe} {stats} {connectable} />
  <MachineNodeStatus {stats} />
</div>
