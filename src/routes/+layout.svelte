<script lang="ts">
	import "./layout.css";
	import { page } from "$app/state";
	import Sidebar from "$lib/components/layout/Sidebar.svelte";

	let { children } = $props();

	let isHome = $derived(page.url.pathname === "/");
</script>

<svelte:head>
	<title>NoPixel V | Minigames & Tools</title>
	<meta
		name="description"
		content="NoPixel V minigame trainers and heist practice tools."
	/>
	<meta property="og:title" content="NoPixel V | Minigames & Tools" />
	<meta
		property="og:description"
		content="NoPixel V minigame trainers and heist practice tools."
	/>
</svelte:head>

<div
	data-vaul-drawer-wrapper
	class="relative min-h-[100dvh] overflow-hidden bg-black text-neutral-100 antialiased"
>
	{#if !isHome}
		<Sidebar currentPath={page.url.pathname} />
		<div
			class="fixed bottom-3 left-6 md:left-8 z-30 pointer-events-none select-none text-[9px] md:text-[10px] font-mono text-neutral-600 uppercase tracking-tight"
		>
			Not affiliated with Rockstar Games, Take-Two Interactive, or NoPixel
		</div>
	{/if}
	<main class="w-full min-h-[100dvh] overflow-hidden">
		{@render children()}
	</main>
</div>
