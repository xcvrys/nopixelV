<script lang="ts">
  import {
    ConnectionLineType,
    MiniMap,
    SvelteFlow,
    type Connection,
    type Edge,
    useSvelteFlow,
  } from "@xyflow/svelte";
  import type { OnConnectStart } from "@xyflow/system";
  import { toConnectionInput } from "$lib/engine/machinery";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import { machineryUiStore } from "$lib/stores/machinery-ui.svelte";
  import MachineryBackground from "./MachineryBackground.svelte";
  import MachineryControls from "./MachineryControls.svelte";
  import { machineryNodeTypes } from "../nodes/registry";
  const { screenToFlowPosition } = useSvelteFlow();
  const MACHINE_DRAG_TYPE = "application/x-machinery-type";

  function handleDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes(MACHINE_DRAG_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDrop(event: DragEvent): void {
    const machineType = event.dataTransfer?.getData(MACHINE_DRAG_TYPE);
    if (!machineType) return;

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
    machineryUiStore.startConnection({
      nodeId: params.nodeId,
      handleId: params.handleId,
      handleType: params.handleType,
    });
  }

  function handleConnectEnd(): void {
    machineryUiStore.endConnection();
  }

  function handleDelete(params: { nodes: { id: string }[]; edges: Edge[] }): void {
    for (const node of params.nodes) machineryStore.removeNode(node.id);
    for (const edge of params.edges) machineryStore.removeEdge(edge.id);
  }
</script>

<svelte:window onclick={() => machineryUiStore.closeActions()} />

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
    class="bg-black"
  >
    <MachineryControls />
    <MachineryBackground />
    <MiniMap
      class="!rounded-none !bg-neutral-950/95 !border-neutral-800"
      nodeColor="var(--color-white)"
      maskColor="rgba(0, 0, 0, 0.8)"
    />
  </SvelteFlow>
</div>
