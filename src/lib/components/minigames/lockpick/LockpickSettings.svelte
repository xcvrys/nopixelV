<script lang="ts">
  import { RotateCcw, SlidersHorizontal } from "lucide-svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import type { LockpickSnapshot } from "$lib/stores/lockpick.svelte";

  let {
    snapshot,
    onPhysicsChange,
    onResetPreset,
  }: {
    snapshot: LockpickSnapshot;
    onPhysicsChange: (field: "decayRate" | "progressPerTap", value: number) => void;
    onResetPreset: () => void;
  } = $props();

  let showSettings = $state(false);

  function handlePhysicsInput(field: "decayRate" | "progressPerTap", event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    onPhysicsChange(field, Number(input.value));
  }
</script>

<div class="absolute bottom-5 right-4 z-40 flex items-center gap-3 md:bottom-6 md:right-8">
  {#if showSettings}
    <div
      class="absolute bottom-24 right-0 z-50 w-[min(16rem,calc(100vw-2rem))] border border-neutral-900 bg-black p-4 text-xs shadow-2xl md:bottom-12"
    >
      <div class="mb-3 flex items-center justify-between border-b border-neutral-900 pb-2">
        <div class="flex items-center gap-2">
          <SlidersHorizontal class="h-3.5 w-3.5 text-neutral-400" />
          <span class="font-bold italic uppercase tracking-wider text-white">Settings</span>
          <span
            class="border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-[9px] font-mono uppercase text-neutral-400"
            >DEV</span
          >
        </div>
        <Button variant="quiet" onclick={onResetPreset} class="px-0 py-0 text-[11px] underline">
          <RotateCcw class="h-3 w-3" />
          <span>Reset Preset</span>
        </Button>
      </div>

      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 flex justify-between text-neutral-400">
            <span>Decay Rate</span>
            <span class="font-bold font-mono text-white">{snapshot.decayRate.toFixed(1)}% / s</span>
          </span>
          <input
            type="range"
            min="3"
            max="35"
            step="0.5"
            value={snapshot.decayRate}
            oninput={(event) => handlePhysicsInput("decayRate", event)}
            aria-label="Decay rate"
            class="h-1 w-full cursor-pointer border-0 bg-neutral-800 accent-white outline-none"
          />
        </label>

        <label class="block">
          <span class="mb-1 flex justify-between text-neutral-400">
            <span>Progress per Tap</span>
            <span class="font-bold font-mono text-white"
              >+{snapshot.progressPerTap.toFixed(1)}%</span
            >
          </span>
          <input
            type="range"
            min="2"
            max="15"
            step="0.5"
            value={snapshot.progressPerTap}
            oninput={(event) => handlePhysicsInput("progressPerTap", event)}
            aria-label="Progress per tap"
            class="h-1 w-full cursor-pointer border-0 bg-neutral-800 accent-white outline-none"
          />
        </label>
      </div>
    </div>
  {/if}

  <Button
    variant={showSettings ? "primary" : "quiet"}
    onclick={() => (showSettings = !showSettings)}
    ariaLabel="Toggle Lockpick settings"
    class="px-3.5 py-2"
  >
    <SlidersHorizontal class="h-3.5 w-3.5" />
    <span>Settings</span>
  </Button>
</div>
