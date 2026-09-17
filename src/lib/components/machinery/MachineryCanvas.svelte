<script lang="ts">
  import {
    SvelteFlow,
    Controls,
    Background,
    BackgroundVariant,
    MiniMap,
    type Connection,
    type Edge,
  } from "@xyflow/svelte";
  import MachineNode from "./MachineNode.svelte";
  import { machineryStore } from "$lib/stores/machinery.svelte";

  const nodeTypes = {
    machine: MachineNode,
  };

  function handleConnect(connection: Connection) {
    if (
      connection.source &&
      connection.target &&
      connection.sourceHandle &&
      connection.targetHandle
    ) {
      machineryStore.connectEdge(
        connection.source,
        connection.sourceHandle,
        connection.target,
        connection.targetHandle,
      );
    }
  }

  function handleDelete(params: { nodes: { id: string }[]; edges: Edge[] }) {
    if (params.nodes) {
      for (const node of params.nodes) {
        machineryStore.removeNode(node.id);
      }
    }
    if (params.edges) {
      for (const edge of params.edges) {
        machineryStore.removeEdge(edge.id);
      }
    }
  }
</script>

<div class="flex-1 w-full h-[calc(100vh-4.5rem)] relative bg-black">
  <SvelteFlow
    bind:nodes={machineryStore.nodes}
    bind:edges={machineryStore.edges}
    {nodeTypes}
    proOptions={{ hideAttribution: true }}
    onconnect={handleConnect}
    ondelete={handleDelete}
    fitView
    minZoom={0.2}
    maxZoom={2}
    class="bg-black"
  >
    <Controls class="!bottom-4 !left-4 !rounded-none" />
    <Background
      variant={BackgroundVariant.Dots}
      gap={20}
      size={1}
      patternColor="var(--color-muted-dark)"
    />
    <MiniMap
      class="!rounded-none !bg-neutral-950/95 !border-neutral-800"
      nodeColor="var(--color-white)"
      maskColor="rgba(0, 0, 0, 0.8)"
    />
  </SvelteFlow>
</div>
