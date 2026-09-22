<script lang="ts">
  import { setContext } from "svelte";
  import type { Snippet } from "svelte";
  import { EllipsisVertical } from "lucide-svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import {
    DROPDOWN_MENU_CONTEXT,
    type DropdownMenuContext,
  } from "$lib/components/ui/dropdown-menu-context";

  let {
    children,
    trigger,
    label = "Open menu",
    disabled = false,
  }: {
    children: Snippet;
    trigger?: Snippet;
    label?: string;
    disabled?: boolean;
  } = $props();

  let open = $state(false);

  function close(): void {
    open = false;
  }

  function toggle(event?: MouseEvent): void {
    event?.stopPropagation();
    if (!disabled) open = !open;
  }

  function handleDocumentPointerDown(event: PointerEvent): void {
    const target = event.target;
    if (target instanceof Element && !target.closest("[data-dropdown-menu]")) close();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") close();
  }

  $effect(() => {
    if (!open) return;
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleKeydown);
    };
  });

  setContext<DropdownMenuContext>(DROPDOWN_MENU_CONTEXT, { close });
</script>

<div class="nodrag nowheel relative" data-dropdown-menu>
  <Button
    variant="icon"
    onclick={toggle}
    {disabled}
    title={label}
    ariaLabel={label}
    ariaExpanded={open}
    class="nodrag !h-7 !w-7 !bg-neutral-950 !p-1 hover:!bg-white hover:!text-black"
  >
    {#if trigger}
      {@render trigger()}
    {:else}
      <EllipsisVertical class="h-3.5 w-3.5" />
    {/if}
  </Button>

  {#if open}
    <div
      role="menu"
      class="absolute right-0 top-full z-10 mt-1 min-w-32 border border-neutral-800 bg-black p-0"
    >
      {@render children()}
    </div>
  {/if}
</div>
