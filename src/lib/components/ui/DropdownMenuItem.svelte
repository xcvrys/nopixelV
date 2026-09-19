<script lang="ts">
  import { getContext } from "svelte";
  import type { Snippet } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { cn } from "$lib/utils/cn";
  import {
    DROPDOWN_MENU_CONTEXT,
    type DropdownMenuContext,
  } from "$lib/components/ui/dropdown-menu-context";

  let {
    children,
    onclick,
    disabled = false,
    tone = "default",
  }: {
    children: Snippet;
    onclick?: () => void | Promise<void>;
    disabled?: boolean;
    tone?: "default" | "danger";
  } = $props();

  const menu = getContext<DropdownMenuContext>(DROPDOWN_MENU_CONTEXT);

  async function activate(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    await onclick?.();
    menu?.close();
  }
</script>

<Button
  variant="quiet"
  {disabled}
  class={cn(
    "w-full justify-start px-2.5 py-2 text-left text-xs font-semibold not-italic tracking-wide",
    tone === "danger"
      ? "text-red-400 hover:bg-red-500 hover:text-black"
      : "text-neutral-300 hover:bg-white hover:text-black",
  )}
>
  {@render children()}
</Button>
