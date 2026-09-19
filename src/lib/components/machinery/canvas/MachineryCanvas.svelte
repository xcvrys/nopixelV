<script lang="ts">
  import {
    ConnectionLineType,
    MiniMap,
    SvelteFlow,
    type Connection,
    type Edge,
  } from "@xyflow/svelte";
  import type { OnConnectStart } from "@xyflow/system";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import { machineryUiStore } from "$lib/stores/machinery-ui.svelte";
  import MachineryBackground from "./MachineryBackground.svelte";
  import MachineryControls from "./MachineryControls.svelte";
  import { machineryNodeTypes } from "../nodes/registry";

  function isValidConnection(connection: Connection | Edge): boolean {
    if (
      !connection.source ||
      !connection.target ||
      !connection.sourceHandle ||
      !connection.targetHandle
    ) {
      return false;
    }
    return machineryStore.canConnect({
      source: connection.source,
      sourceHandle: connection.sourceHandle,
      target: connection.target,
      targetHandle: connection.targetHandle,
    });
  }

  function handleConnect(connection: Connection): void {
    if (
      !connection.source ||
      !connection.target ||
      !connection.sourceHandle ||
      !connection.targetHandle
    ) {
      return;
    }
    machineryStore.connect({
      source: connection.source,
      sourceHandle: connection.sourceHandle,
      target: connection.target,
      targetHandle: connection.targetHandle,
    });
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

<div class="relative h-full w-full bg-black">
  <SvelteFlow
    bind:nodes={machineryStore.nodes}
    bind:edges={machineryStore.edges}
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
