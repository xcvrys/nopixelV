<script lang="ts">
	import type { Snippet } from "svelte";

	type ButtonVariant = "primary" | "quiet" | "icon" | "danger";

	let {
		children,
		variant = "quiet",
		type = "button",
		disabled = false,
		title,
		ariaLabel,
		class: className = "",
		onclick,
	}: {
		children: Snippet;
		variant?: ButtonVariant;
		type?: "button" | "submit" | "reset";
		disabled?: boolean;
		title?: string;
		ariaLabel?: string;
		class?: string;
		onclick?: (event: MouseEvent) => void;
	} = $props();

	const variants: Record<ButtonVariant, string> = {
		primary: "bg-white text-black hover:bg-neutral-200",
		quiet:
			"bg-transparent text-neutral-300 hover:bg-neutral-900 hover:text-white",
		icon: "h-8 w-8 bg-neutral-950 text-neutral-300 hover:bg-neutral-800 hover:text-white",
		danger: "bg-red-500 text-black hover:bg-red-400",
	};
</script>

<button
	{type}
	{disabled}
	{title}
	aria-label={ariaLabel}
	class={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap border border-transparent px-3 py-2 text-xs font-semibold italic uppercase leading-none outline-none transition-[background-color,color,border-color,transform] duration-150 active:translate-y-px focus-visible:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
	{onclick}
>
	{@render children()}
</button>
