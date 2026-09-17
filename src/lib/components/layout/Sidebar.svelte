<script lang="ts">
	import { Volume2, Volume1, VolumeX } from "lucide-svelte";
	import { soundEngine } from "$lib/engine/audio";

	let { currentPath = "/" }: { currentPath: string } = $props();

	let isHovered = $state(false);

	const isLockpickActive = $derived(currentPath === "/minigames/lockpick");

	function handleToggleMute() {
		if (soundEngine.muted) {
			soundEngine.setMuted(false);
			if (soundEngine.volume === 0) {
				soundEngine.setVolume(0.5);
			}
			soundEngine.playRatchetClick();
		} else {
			soundEngine.setMuted(true);
		}
	}

	function handleVolumeInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		const val = parseFloat(target.value);
		if (soundEngine.muted && val > 0) {
			soundEngine.setMuted(false);
		}
		soundEngine.setVolume(val);
	}

	function handleVolumeChange() {
		if (!soundEngine.muted && soundEngine.volume > 0) {
			soundEngine.playRatchetClick();
		}
	}
</script>

<aside
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
	class="fixed left-8 md:left-12 lg:left-14 top-1/2 -translate-y-1/2 z-50 select-none transition-opacity duration-200 flex flex-col gap-10 md:gap-14 {isHovered
		? 'opacity-100'
		: 'opacity-20 hover:opacity-100'}"
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
				class="inline-flex items-center px-3 md:px-3.5 py-1 leading-none rounded-none font-bold italic text-base md:text-lg uppercase border-0 outline-none transition-colors {isLockpickActive
					? 'bg-white text-black'
					: 'bg-transparent text-white hover:bg-white hover:text-black'}"
			>
				LOCKPICK
			</a>
			<div
				class="inline-flex items-center gap-2 px-3 md:px-3.5 py-1 leading-none rounded-none font-bold italic text-base md:text-lg uppercase text-neutral-600 select-none cursor-not-allowed"
				title="Coming Soon"
			>
				<span>STORE SAFE</span>
				<span
					class="text-[9px] md:text-[10px] font-bold italic tracking-wider px-1.5 py-0.5 bg-neutral-900 text-neutral-400 uppercase leading-none"
				>
					SOON
				</span>
			</div>
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
			<div
				class="inline-flex items-center gap-2 px-3 md:px-3.5 py-1 leading-none rounded-none font-bold italic text-base md:text-lg uppercase text-neutral-600 select-none cursor-not-allowed"
				title="Coming Soon"
			>
				<span>FACTORY</span>
				<span
					class="text-[9px] md:text-[10px] font-bold italic tracking-wider px-1.5 py-0.5 bg-neutral-900 text-neutral-400 uppercase leading-none"
				>
					SOON
				</span>
			</div>
		</div>
	</div>
</aside>

<!-- Bottom Page Audio Control (Compact & separated from main menu) -->
<div
	class="fixed bottom-8 md:bottom-9 left-8 md:left-12 lg:left-14 z-40 select-none transition-opacity duration-200 flex flex-col gap-1 {isHovered
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
			class="font-mono text-[10px] md:text-[11px] font-bold tabular-nums {soundEngine.muted
				? 'text-neutral-600 line-through'
				: 'text-neutral-300'}"
		>
			{soundEngine.muted ? "MUTED" : `${Math.round(soundEngine.volume * 100)}%`}
		</span>
	</div>

	<div class="flex items-center gap-2">
		<button
			type="button"
			onclick={handleToggleMute}
			title={soundEngine.muted ? "Unmute audio" : "Mute audio"}
			aria-label={soundEngine.muted ? "Unmute audio" : "Mute audio"}
			class="inline-flex items-center justify-center w-5 h-5 rounded-none border border-neutral-800 outline-none transition-colors cursor-pointer {soundEngine.muted
				? 'bg-neutral-900 text-neutral-600 hover:bg-neutral-800 hover:text-white'
				: 'bg-white text-black hover:bg-neutral-200'}"
		>
			{#if soundEngine.muted || soundEngine.volume === 0}
				<VolumeX class="w-3 h-3" />
			{:else if soundEngine.volume < 0.5}
				<Volume1 class="w-3 h-3" />
			{:else}
				<Volume2 class="w-3 h-3" />
			{/if}
		</button>

		<input
			type="range"
			min="0"
			max="1"
			step="0.05"
			value={soundEngine.muted ? 0 : soundEngine.volume}
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
