<script lang="ts">
  import { setContext } from "svelte";
  import {
    ConnectionLineType,
    MiniMap,
    SvelteFlow,
    type Connection,
    type Edge,
    useSvelteFlow,
    useUpdateNodeInternals,
  } from "@xyflow/svelte";
  import type { OnConnectEnd, OnConnectStart } from "@xyflow/system";
  import { isMachineType } from "$lib/data/machines";
  import { getRecipesForMachine, REPOSITORY_RECIPES } from "$lib/data/recipes";
  import type { RecipeDefinition } from "$lib/data/types";
  import { toConnectionInput } from "$lib/engine/machinery";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import { machineryUiStore } from "$lib/stores/machinery-ui.svelte";
  import MachineNodeRecipe from "../recipe-selector/MachineNodeRecipe.svelte";
  import MachineryBackground from "./MachineryBackground.svelte";
  import MachineryControls from "./MachineryControls.svelte";
  import {
    NodeInternalsCoordinator,
    NODE_INTERNALS_COORDINATOR_CONTEXT,
  } from "./NodeInternalsCoordinator.svelte";
  import { cn } from "$lib/utils/cn";
  import { machineryNodeTypes } from "../nodes/registry";
  const { screenToFlowPosition } = useSvelteFlow();
  const nodeInternalsCoordinator = new NodeInternalsCoordinator(useUpdateNodeInternals());
  setContext(NODE_INTERNALS_COORDINATOR_CONTEXT, nodeInternalsCoordinator);
  const MACHINE_DRAG_TYPE = "application/x-machinery-type";
  let compatibleRecipes = $derived.by(() => {
    const pending = machineryUiStore.pendingConnection;
    if (!pending) return [] as RecipeDefinition[];
    if (pending.connection.handleId === "energy") {
      return pending.connection.handleType === "target"
        ? REPOSITORY_RECIPES.filter((recipe) => recipe.machineType === "fabricator")
        : [];
    }
    const itemId = pending.connection.handleId;
    return REPOSITORY_RECIPES.filter((recipe) =>
      pending.connection.handleType === "source"
        ? recipe.inputs.some((item) => item.itemId === itemId)
        : recipe.outputs.some((item) => item.itemId === itemId),
    );
  });
  function selectRecipe(recipeId: string | null): void {
    const nodeId = machineryUiStore.recipePickerNodeId;
    if (!nodeId) return;
    machineryStore.updateNodeData(nodeId, { recipeId });
    machineryUiStore.closeRecipePicker();
  }

  function selectPendingRecipe(recipeId: string | null): void {
    if (!recipeId) return;
    const pending = machineryUiStore.pendingConnection;
    const recipe = compatibleRecipes.find((candidate) => candidate.id === recipeId);
    if (!pending || !recipe) return;

    const nodeId = machineryStore.addMachine(recipe.machineType, pending.position);
    machineryStore.updateNodeData(nodeId, { recipeId: recipe.id });
    machineryStore.connect(
      pending.connection.handleType === "source"
        ? {
            source: pending.connection.nodeId,
            sourceHandle: pending.connection.handleId,
            target: nodeId,
            targetHandle: pending.connection.handleId,
          }
        : {
            source: nodeId,
            sourceHandle: pending.connection.handleId,
            target: pending.connection.nodeId,
            targetHandle: pending.connection.handleId,
          },
    );
    machineryUiStore.endConnection();
  }

  function handleDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes(MACHINE_DRAG_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDrop(event: DragEvent): void {
    const machineType = event.dataTransfer?.getData(MACHINE_DRAG_TYPE);
    if (!machineType || !isMachineType(machineType)) return;

    event.preventDefault();
    const position = screenToFlowPosition(
      { x: event.clientX, y: event.clientY },
      { snapToGrid: false },
    );
    machineryStore.addMachine(machineType, position);
  }

  function isValidConnection(connection: Connection | Edge): boolean {
    const input = toConnectionInput(connection);
    return input !== null && machineryStore.canConnect(input);
  }

  function handleConnect(connection: Connection): void {
    const input = toConnectionInput(connection);
    if (input) machineryStore.connect(input);
  }

  function handleConnectStart(
    _event: Parameters<OnConnectStart>[0],
    params: Parameters<OnConnectStart>[1],
  ): void {
    if (!params.handleType || !params.nodeId || !params.handleId) return;
    machineryUiStore.startConnection(
      {
        nodeId: params.nodeId,
        handleId: params.handleId,
        handleType: params.handleType,
      },
      machineryStore.nodes,
      machineryStore.edges,
    );
  }

  function handleConnectEnd(
    event: Parameters<OnConnectEnd>[0],
    state: Parameters<OnConnectEnd>[1],
  ): void {
    const active = machineryUiStore.activeConnection;
    if (active && !state.toNode && "clientX" in event) {
      machineryUiStore.startPendingConnection(
        active,
        screenToFlowPosition({ x: event.clientX, y: event.clientY }, { snapToGrid: false }),
      );
      return;
    }
    machineryUiStore.endConnection();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    machineryUiStore.cancelConnection();
  }

  function handleDelete(params: { nodes: { id: string }[]; edges: Edge[] }): void {
    for (const node of params.nodes) machineryStore.removeNode(node.id);
    for (const edge of params.edges) machineryStore.removeEdge(edge.id);
  }
</script>

<svelte:window onclick={() => machineryUiStore.closeActions()} onkeydown={handleKeydown} />

<div
  role="application"
  class="relative h-full w-full bg-black"
  ondragover={handleDragOver}
  ondrop={handleDrop}
>
  <SvelteFlow
    bind:nodes={machineryStore.nodes}
    edges={machineryStore.edges}
    nodeTypes={machineryNodeTypes}
    proOptions={{ hideAttribution: true }}
    onlyRenderVisibleElements
    defaultEdgeOptions={{ type: "step" }}
    connectionLineType={ConnectionLineType.Step}
    {isValidConnection}
    onconnect={handleConnect}
    onconnectstart={handleConnectStart}
    onconnectend={handleConnectEnd}
    ondelete={handleDelete}
    deleteKey={["Backspace", "Delete"]}
    onnodedragstop={() => machineryStore.commitNodePositions()}
    fitView
    maxZoom={2}
    class={cn("bg-black", !machineryUiStore.powerRequired && "power-dimmed")}
  >
    <MachineryControls />
    <MachineryBackground />
    <MiniMap nodeColor="var(--color-white)" maskColor="rgba(0, 0, 0, 0.8)" class=" !rounded-none" />
  </SvelteFlow>
  {#if machineryUiStore.recipePickerNodeId}
    {@const recipeNode = machineryStore.nodes.find(
      (node) => node.id === machineryUiStore.recipePickerNodeId,
    )}
    {#if recipeNode && recipeNode.type !== "text"}
      <MachineNodeRecipe
        id={recipeNode.id}
        selectedRecipeId={recipeNode.data.recipeId ?? null}
        recipes={getRecipesForMachine(
          recipeNode.type === "energy" ? "fabricator" : recipeNode.data.machineType,
        )}
        interactive
        standalone
        openOnMount
        onRecipeChange={selectRecipe}
        onCancel={() => machineryUiStore.closeRecipePicker()}
      />
    {/if}
  {/if}
  {#if machineryUiStore.pendingConnection}
    <MachineNodeRecipe
      id="pending-recipe"
      selectedRecipeId={null}
      recipes={compatibleRecipes}
      interactive
      standalone
      openOnMount
      onRecipeChange={selectPendingRecipe}
      onCancel={() => machineryUiStore.cancelConnection()}
    />
  {/if}
</div>
