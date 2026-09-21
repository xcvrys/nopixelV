<script lang="ts">
  import { tick } from "svelte";
  import { useStore, useUpdateNodeInternals } from "@xyflow/svelte";
  import { getRecipesForMachine, getRecipe } from "$lib/data/recipes";
  import { getMachine } from "$lib/data/machines";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import { machineryUiStore } from "$lib/stores/machinery-ui.svelte";
  import type { MachineNodeData } from "$lib/engine/machinery";
  import { cn } from "$lib/utils/cn";
  import MachineNodeHeader from "./MachineNodeHeader.svelte";
  import MachineNodeImage from "./MachineNodeImage.svelte";
  import MachineNodePorts from "./MachineNodePorts.svelte";
  import MachineNodeRecipe from "../../recipe-selector/MachineNodeRecipe.svelte";
  import MachineNodeStatus from "./MachineNodeStatus.svelte";

  let {
    id,
    data,
    selected = false,
  }: { id: string; data: MachineNodeData; selected?: boolean } = $props();

  const flowStore = useStore();
  const updateNodeInternals = useUpdateNodeInternals();
  let nodeElement: HTMLDivElement | undefined = $state();
  let showImage = $derived(machineryUiStore.imagesVisible && data.showImage !== false);
  let interactive = $derived(
    flowStore.nodesDraggable || flowStore.nodesConnectable || flowStore.elementsSelectable,
  );
  let connectable = $derived(flowStore.nodesConnectable);
  let recipes = $derived(getRecipesForMachine(data.machineType));
  let recipe = $derived(data.recipeId ? (getRecipe(data.recipeId) ?? null) : null);
  let machine = $derived(getMachine(data.machineType));
  let requiresPower = $derived((recipe?.powerCost ?? machine?.defaultPowerCost ?? 0) > 0);
  let stats = $derived(machineryStore.calculationResult.machineStats[id]);

  $effect(() => {
    const nodeId = id;
    void showImage;
    void recipe;
    void requiresPower;
    void tick().then(() => updateNodeInternals([nodeId]));
  });

  $effect(() => {
    if (!nodeElement) return;
    const observer = new ResizeObserver(() => updateNodeInternals([id]));
    observer.observe(nodeElement);
    return () => observer.disconnect();
  });

  function handleRecipeChange(recipeId: string | null): void {
    machineryStore.updateNodeData(id, { recipeId });
  }
</script>

<div
  bind:this={nodeElement}
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
  <MachineNodeRecipe
    {id}
    selectedRecipeId={data.recipeId}
    {recipes}
    {interactive}
    onRecipeChange={handleRecipeChange}
  />
  <MachineNodePorts {id} {recipe} {stats} {connectable} />
  <MachineNodeStatus {stats} {requiresPower} />
</div>
