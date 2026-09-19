<script lang="ts">
  import { CircleCheckBig, TriangleAlert, Zap } from "lucide-svelte";
  import type { MachineStats } from "$lib/engine/calculator";

  let { stats }: { stats: MachineStats | undefined } = $props();
  let efficiency = $derived(stats?.efficiency ?? 1);
  let hasRecipe = $derived((stats?.rates.effectiveDuration ?? 0) > 0);
  let isBottlenecked = $derived(
    hasRecipe && efficiency < 0.99 && (stats?.rates.inputs.length ?? 0) > 0,
  );
</script>

<div
  class="flex items-center justify-between border-t border-neutral-800 bg-black px-3.5 py-2.5 text-xs"
>
  <div class="flex items-center gap-1.5">
    {#if !hasRecipe}
      <div class="flex items-center gap-1.5 font-mono font-bold text-neutral-500">
        <span class="h-2 w-2 bg-neutral-600"></span>
        <span>IDLE</span>
      </div>
    {:else if isBottlenecked}
      <div class="flex items-center gap-1.5">
        <TriangleAlert class="h-4 w-4 shrink-0 text-amber-400" />
        <span class="font-mono font-bold text-amber-300">
          {(efficiency * 100).toFixed(0)}% Bottleneck
        </span>
      </div>
    {:else}
      <div class="flex items-center gap-1.5">
        <CircleCheckBig class="h-4 w-4 shrink-0 text-white" />
        <span class="font-mono font-bold text-white">100% Flow</span>
      </div>
    {/if}
  </div>
  <div class="flex items-center gap-1.5 font-mono text-neutral-400">
    <Zap class="h-3.5 w-3.5 text-neutral-300" />
    <span>{(stats?.rates.powerPerMinute ?? 0).toFixed(0)} kW</span>
  </div>
</div>
