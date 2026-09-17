<script lang="ts">
	import { Volume2, Volume1, VolumeX } from "lucide-svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import ComingSoon from "$lib/components/ui/ComingSoon.svelte";
	import { audioStore } from "$lib/stores/audio.svelte";

	let { currentPath = "/" }: { currentPath: string } = $props();

	let isHovered = $state(false);

	const isLockpickActive = $derived(currentPath === "/minigames/lockpick");
	let isMobileMenuOpen = $state(false);

	function closeMobileMenu() {
		isMobileMenuOpen = false;
	}

	function handleToggleMute() {
		if (audioStore.muted) {
			audioStore.setMuted(false);
			if (audioStore.volume === 0) {
				audioStore.setVolume(0.5);
			}
			audioStore.playRatchetClick();
		} else {
			audioStore.setMuted(true);
		}
	}

	function handleVolumeInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		const val = parseFloat(target.value);
		if (audioStore.muted && val > 0) {
			audioStore.setMuted(false);
		}
		audioStore.setVolume(val);
	}

	function handleVolumeChange() {
		if (!audioStore.muted && audioStore.volume > 0) {
			audioStore.playRatchetClick();
		}
	}
</script>

<div class="fixed right-3 top-4 z-50 md:hidden">
	<Button
		variant={isMobileMenuOpen ? "primary" : "quiet"}
		ariaLabel="Toggle navigation menu"
		ariaExpanded={isMobileMenuOpen}
		ariaControls="mobile-navigation"
		onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
		class="px-3.5 py-2"
	>
		Menu
	</Button>

	{#if isMobileMenuOpen}
		<nav
			id="mobile-navigation"
			aria-label="Mobile navigation"
			class="absolute right-0 top-11 w-52 border border-neutral-900 bg-black p-4 shadow-2xl"
		>
			<div
				class="mb-3 border-b border-neutral-900 pb-2 text-xs font-black italic uppercase tracking-wider text-neutral-500"
			>
				Minigames
			</div>
			<div class="flex flex-col items-start gap-1.5">
				<a
					href="/minigames/lockpick"
					aria-current={isLockpickActive ? "page" : undefined}
					onclick={closeMobileMenu}
					class="inline-flex items-center px-3.5 py-1 leading-none font-bold italic text-lg uppercase outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white {isLockpickActive
						? 'bg-white text-black'
						: 'text-white hover:bg-white hover:text-black'}"
				>
					LOCKPICK
				</a>
				<ComingSoon
					label="STORE SAFE"
					badge="SOON"
					class="px-3.5 py-1 text-lg"
				/>
			</div>

			<div
				class="mb-3 mt-6 border-b border-neutral-900 pb-2 text-xs font-black italic uppercase tracking-wider text-neutral-500"
			>
				Resources
			</div>
			<ComingSoon label="FACTORY" badge="SOON" class="px-3.5 py-1 text-lg" />
		</nav>
	{/if}
</div>

<!-- Desktop sidebar -->
<aside
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
	class="fixed left-3 top-4 z-50 hidden select-none flex-col gap-6 transition-opacity duration-200 sm:left-8 sm:top-1/2 sm:-translate-y-1/2 sm:gap-10 md:flex md:gap-14 {isHovered
		? 'opacity-100'
		: 'opacity-20 hover:opacity-100 focus-within:opacity-100'}"
>
	<!-- Section 1: MINIGAMES -->
	<div>
		<h2
			class="text-2xl md:text-3xl font-black italic text-white uppercase tracking-wide mb-3 md:mb-4"
		>
			MINIGAMES
		</h2>
		<div class="flex flex-col items-start gap-1.5">
			<a
				href="/minigames/lockpick"
				aria-current={isLockpickActive ? "page" : undefined}
				class="inline-flex items-center px-3 md:px-3.5 py-1 leading-none rounded-none font-bold italic text-base md:text-lg uppercase border-0 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white {isLockpickActive
					? 'bg-white text-black'
					: 'bg-transparent text-white hover:bg-white hover:text-black'}"
			>
				LOCKPICK
			</a>
			<ComingSoon
				label="STORE SAFE"
				badge="SOON"
				class="px-3 md:px-3.5 py-1 text-base md:text-lg"
			/>
		</div>
	</div>

	<!-- Section 2: RESOURCES -->
	<div>
		<h2
			class="text-2xl md:text-3xl font-black italic text-white uppercase tracking-wide mb-3 md:mb-4"
		>
			RESOURCES
		</h2>
		<div class="flex flex-col items-start gap-1.5">
			<ComingSoon
				label="FACTORY"
				badge="SOON"
				class="px-3 md:px-3.5 py-1 text-base md:text-lg"
			/>
		</div>
	</div>
</aside>
<!-- Bottom Page Audio Control (Compact & separated from main menu) -->
<div
	class="fixed bottom-5 left-3 z-40 hidden select-none flex-col gap-1 transition-opacity duration-200 sm:bottom-8 sm:left-8 md:flex md:bottom-9 {isHovered
		? 'opacity-100'
		: 'opacity-30 hover:opacity-100'}"
>
	<div class="flex items-center gap-2">
		<span
			class="text-[9px] md:text-[10px] font-mono font-bold tracking-wider text-neutral-500 uppercase"
		>
			VOL
		</span>
		<span
			class="font-mono text-[10px] md:text-[11px] font-bold tabular-nums {audioStore.muted
				? 'text-neutral-600 line-through'
				: 'text-neutral-300'}"
		>
			{audioStore.muted ? "MUTED" : `${Math.round(audioStore.volume * 100)}%`}
		</span>
	</div>

	<div class="flex items-center gap-2">
		<Button
			variant="icon"
			type="button"
			onclick={handleToggleMute}
			title={audioStore.muted ? "Unmute audio" : "Mute audio"}
			ariaLabel={audioStore.muted ? "Unmute audio" : "Mute audio"}
			class="h-5 w-5 px-0"
		>
			{#if audioStore.muted || audioStore.volume === 0}
				<VolumeX class="w-3 h-3" />
			{:else if audioStore.volume < 0.5}
				<Volume1 class="w-3 h-3" />
			{:else}
				<Volume2 class="w-3 h-3" />
			{/if}
		</Button>

		<input
			type="range"
			min="0"
			max="1"
			step="0.05"
			value={audioStore.muted ? 0 : audioStore.volume}
			oninput={handleVolumeInput}
			onchange={handleVolumeChange}
			aria-label="Master volume"
			class="sharp-range w-24 md:w-28 h-1 outline-none cursor-pointer"
		/>
	</div>
</div>

<style>
	.sharp-range {
		-webkit-appearance: none;
		appearance: none;
		background: #141414;
		border: 1px solid #262626;
	}
	.sharp-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 6px;
		height: 12px;
		background: #ffffff;
		cursor: pointer;
		border-radius: 0;
	}

	.sharp-range::-moz-range-thumb {
		width: 6px;
		height: 12px;
		background: #ffffff;
		cursor: pointer;
		border-radius: 0;
		border: none;
	}
</style>
