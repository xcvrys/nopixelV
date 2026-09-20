<script lang="ts">
  import type { Snippet } from "svelte";

  import { cn } from "$lib/utils/cn";

  type ButtonVariant = "primary" | "quiet" | "icon" | "danger";

  let {
    children,
    variant = "quiet",
    type = "button",
    disabled = false,
    title,
    ariaLabel,
    ariaExpanded,
    ariaPressed,
    ariaControls,
    role,
    draggable = false,
    class: className = "",
    onclick,
    ondragstart,
    ondragend,
  }: {
    children: Snippet;
    variant?: ButtonVariant;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    title?: string;
    ariaLabel?: string;
    ariaExpanded?: boolean;
    ariaPressed?: boolean;
    ariaControls?: string;
    role?: string;
    draggable?: boolean;
    class?: string;
    onclick?: (event: MouseEvent) => void;
    ondragstart?: (event: DragEvent) => void;
    ondragend?: (event: DragEvent) => void;
  } = $props();

  const variants: Record<ButtonVariant, string> = {
    primary: "bg-white text-black hover:bg-neutral-200",
    quiet: "bg-transparent text-neutral-300 hover:bg-neutral-900 hover:text-white",
    icon: "h-8 w-8 bg-neutral-950 text-neutral-300 hover:bg-neutral-800 hover:text-white",
    danger: "bg-red-500 text-black hover:bg-red-400",
  };
</script>

<button
  {role}
  {type}
  {disabled}
  {draggable}
  {ondragstart}
  {ondragend}
  {title}
  aria-label={ariaLabel}
  class={cn(
    "inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap border border-transparent px-3 py-2 text-xs font-semibold italic uppercase leading-none outline-none transition-[background-color,color,border-color] duration-150 focus-visible:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40",
    variants[variant],
    className,
  )}
  aria-expanded={ariaExpanded}
  aria-pressed={ariaPressed}
  aria-controls={ariaControls}
  {onclick}
>
  {@render children()}
</button>
