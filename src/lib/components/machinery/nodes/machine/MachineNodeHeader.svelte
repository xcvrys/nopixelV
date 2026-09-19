<script lang="ts">
  import { tick } from "svelte";
  import DropdownMenu from "$lib/components/ui/DropdownMenu.svelte";
  import DropdownMenuItem from "$lib/components/ui/DropdownMenuItem.svelte";
  import { machineryStore } from "$lib/stores/machinery.svelte";
  import { machineryUiStore } from "$lib/stores/machinery-ui.svelte";
  import { Eye, EyeOff, Pencil, Trash2 } from "lucide-svelte";
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
    <DropdownMenu label="Element actions" disabled={!interactive}>
      <DropdownMenuItem disabled={!interactive} onclick={startNameEditing}>
        <Pencil class="h-3 w-3" />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem disabled={!interactive} onclick={toggleImage}>
        {#if showImage}
          <EyeOff class="h-3 w-3" />Hide image
        {:else}
          <Eye class="h-3 w-3" />Show image
        {/if}
      </DropdownMenuItem>
      <DropdownMenuItem
        tone="danger"
        disabled={!interactive}
        onclick={() => machineryStore.removeNode(id)}
      >
        <Trash2 class="h-3 w-3" />
        Delete
      </DropdownMenuItem>
    </DropdownMenu>
  </div>
</div>
