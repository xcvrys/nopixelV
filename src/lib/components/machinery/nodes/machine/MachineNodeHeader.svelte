<script lang="ts">
  import { tick } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import { machineryUiStore } from "$lib/stores/machinery-ui.svelte";
  import { EllipsisVertical, Eye, EyeOff, Pencil, Trash2 } from "lucide-svelte";
  import type { MachineNodeData } from "$lib/engine/machinery";

  let {
    id,
    data,
    interactive = true,
  }: { id: string; data: MachineNodeData; interactive?: boolean } = $props();
  let isEditingName = $state(false);
  let draftName = $state("");
  let nameInput = $state<HTMLInputElement | undefined>();
  let showImage = $derived(data.showImage !== false);

  async function startNameEditing(): Promise<void> {
    if (!interactive) return;
    draftName = data.name;
    isEditingName = true;
    machineryUiStore.closeActions();
    await tick();
    nameInput?.focus();
    nameInput?.select();
  }

  function commitName(): void {
    const name = draftName.trim();
    if (name && name !== data.name) machineryStore.updateNodeData(id, { name });
    isEditingName = false;
  }

  function toggleImage(): void {
    if (!interactive) return;
    machineryStore.updateNodeData(id, { showImage: !showImage });
    machineryUiStore.closeActions();
  }
</script>

<div class="flex items-center justify-between border-b border-neutral-900 px-3.5 py-2.5">
  <div class="flex min-w-0 flex-1 items-center">
    {#if isEditingName}
      <input
        bind:this={nameInput}
        value={draftName}
        oninput={(event) => (draftName = (event.currentTarget as HTMLInputElement).value)}
        onblur={commitName}
        onpointerdown={(event) => event.stopPropagation()}
        onkeydown={(event) => {
          if (event.key === "Enter") commitName();
          if (event.key === "Escape") isEditingName = false;
        }}
        aria-label="Element name"
        disabled={!interactive}
        class="nodrag nowheel min-w-0 flex-1 border-b border-neutral-500 bg-transparent text-sm font-bold text-white outline-none"
      />
    {:else}
      <span class="min-w-0 flex-1 truncate text-left text-sm font-bold text-white">{data.name}</span
      >
    {/if}
  </div>

  <div class="nodrag nowheel relative flex items-center gap-1">
    <Button
      variant="icon"
      onclick={(event) => {
        event.stopPropagation();
        machineryUiStore.toggleActions(id);
      }}
      disabled={!interactive}
      class="nodrag !h-7 !w-7 !bg-neutral-950 !p-1 hover:!bg-white hover:!text-black"
      title="Element actions"
      ariaLabel="Element actions"
      ariaExpanded={machineryUiStore.isActionsOpen(id)}
    >
      <EllipsisVertical class="h-3.5 w-3.5" />
    </Button>

    {#if machineryUiStore.isActionsOpen(id)}
      <div
        class="nodrag nowheel absolute right-0 top-full z-10 mt-1 min-w-32 border border-neutral-800 bg-black p-0"
      >
        <button
          type="button"
          disabled={!interactive}
          onclick={(event) => {
            event.stopPropagation();
            void startNameEditing();
          }}
          class="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs font-semibold italic uppercase tracking-wide text-neutral-300 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Pencil class="h-3 w-3" />
          Rename
        </button>
        <button
          type="button"
          disabled={!interactive}
          onclick={(event) => {
            event.stopPropagation();
            toggleImage();
          }}
          class="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs font-semibold italic uppercase tracking-wide text-neutral-300 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {#if showImage}<EyeOff class="h-3 w-3" />Hide image{:else}<Eye class="h-3 w-3" />Show
            image{/if}
        </button>
        <button
          type="button"
          disabled={!interactive}
          onclick={(event) => {
            event.stopPropagation();
            machineryStore.removeNode(id);
          }}
          class="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs font-semibold italic uppercase tracking-wide text-red-400 hover:bg-red-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 class="h-3 w-3" />
          Delete
        </button>
      </div>
    {/if}
  </div>
</div>
