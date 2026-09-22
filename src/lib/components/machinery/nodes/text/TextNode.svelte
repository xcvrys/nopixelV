<script lang="ts">
  import { tick } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { cn } from "$lib/utils/cn";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import type { TextNodeData } from "$lib/engine/machinery";

  let {
    id,
    data,
    selected = false,
  }: { id: string; data: TextNodeData; selected?: boolean } = $props();
  let editing = $state(false);
  let draft = $state("");
  let textarea = $state<HTMLTextAreaElement | undefined>();
  let nodeElement = $state<HTMLDivElement | undefined>();
  let textHeight = $derived(Math.max(96, (editing ? draft : data.text).split("\n").length * 20));

  async function startEditing(event?: Event): Promise<void> {
    event?.stopPropagation();
    draft = data.text;
    editing = true;
    await tick();
    textarea?.focus();
    textarea?.select();
  }

  function commitEditing(): void {
    const text = draft.trim();
    if (text !== data.text) machineryStore.updateTextNode(id, text);
    editing = false;
  }

  function cancelEditing(): void {
    editing = false;
    draft = data.text;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") cancelEditing();
    if (event.key === "Enter" && event.ctrlKey) commitEditing();
  }

  function handleOutsidePointerdown(event: PointerEvent): void {
    if (!editing || !nodeElement) return;
    if (event.target instanceof Node && !nodeElement.contains(event.target)) {
      commitEditing();
    }
  }
</script>

<svelte:window onpointerdown={handleOutsidePointerdown} />
<div
  bind:this={nodeElement}
  class={cn(
    "w-72 border-2 border-neutral-800 bg-neutral-950 p-2 transition-colors duration-150",
    selected ? "border-white" : "",
  )}
>
  {#if editing}
    <textarea
      bind:this={textarea}
      bind:value={draft}
      aria-label="Text node content"
      style={`min-height: ${textHeight}px`}
      onkeydown={handleKeydown}
      onpointerdown={(event) => event.stopPropagation()}
      class="nodrag nowheel min-h-24 w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-neutral-600"
      placeholder="Write a note..."></textarea>
  {:else}
    <div
      role="button"
      tabindex="0"
      style={`min-height: ${textHeight}px`}
      onkeydown={(event) => {
        if (event.key === "Enter" || event.key === " ") void startEditing(event);
      }}
      class="min-h-24 whitespace-pre-wrap break-words text-sm text-white outline-none"
    >
      {data.text || "Empty text"}
    </div>
  {/if}

  <div class="mt-1 flex justify-end pt-1">
    {#if editing}
      <Button
        variant="quiet"
        onclick={commitEditing}
        class="nodrag nowheel px-2 py-1 text-xs font-semibold uppercase"
      >
        Done
      </Button>
    {:else}
      <Button
        variant="quiet"
        onclick={startEditing}
        class="nodrag nowheel px-2 py-1 text-xs font-semibold uppercase"
      >
        Edit
      </Button>
    {/if}
  </div>
</div>
