<script lang="ts">
  import { ArrowDownRight, ArrowUpRight, TriangleAlert, Zap } from "lucide-svelte";
  import { getItem } from "$lib/data/items";
  import type { NetworkCalculationResult } from "$lib/engine/calculator";

  let { result }: { result: NetworkCalculationResult } = $props();
  let summary = $derived(result.summary);
  let bottlenecks = $derived(result.bottlenecks);
</script>

<div class="flex flex-wrap items-center gap-3">
  {#if summary.rawInputsNeeded.length > 0}
    <div
      class="inline-flex h-8 items-center gap-1.5 whitespace-nowrap border border-neutral-800 bg-neutral-950 px-3.5 py-1 text-base font-bold italic uppercase leading-none"
    >
      <ArrowDownRight class="h-4 w-4 shrink-0 text-white" />
      <div class="flex items-center gap-2">
        {#each summary.rawInputsNeeded as input (input.itemId)}
          {@const item = getItem(input.itemId)}
          <span class="inline-flex items-center gap-1 font-mono font-bold text-white"
            >{input.ratePerMin}/m
            <span class="text-[10px] font-normal text-neutral-500"
              >{item?.name || input.itemId}</span
            ></span
          >
        {/each}
      </div>
    </div>
  {/if}
  {#if summary.netOutputsProduced.length > 0}
    <div
      class="inline-flex h-8 items-center gap-1.5 whitespace-nowrap border border-neutral-800 bg-neutral-950 px-3.5 py-1 text-base font-bold italic uppercase leading-none"
    >
      <ArrowUpRight class="h-4 w-4 shrink-0 text-white" />
      <div class="flex items-center gap-2">
        {#each summary.netOutputsProduced as output (output.itemId)}
          {@const item = getItem(output.itemId)}
          <span class="inline-flex items-center gap-1 font-mono font-bold text-white"
            >{output.ratePerMin}/m
            <span class="text-[10px] font-normal text-neutral-500"
              >{item?.name || output.itemId}</span
            ></span
          >
        {/each}
      </div>
    </div>
  {/if}
  {#if summary.totalPowerDraw > 0}
    <div
      class="inline-flex h-8 items-center gap-1.5 whitespace-nowrap border border-neutral-800 bg-neutral-950 px-3.5 py-1 text-base font-bold italic uppercase leading-none"
    >
      <Zap class="h-4 w-4 shrink-0 text-neutral-400" />
      <span class="font-mono font-bold text-white">{summary.totalPowerDraw} kW/m</span>
    </div>
  {/if}
  {#if bottlenecks.length > 0}
    <div
      class="inline-flex h-8 items-center gap-1.5 whitespace-nowrap bg-orange-400 px-3.5 py-1 text-base font-bold italic uppercase leading-none text-black"
    >
      <TriangleAlert class="h-4 w-4 shrink-0 text-black" />
      <span>{bottlenecks.length} Bottleneck{bottlenecks.length > 1 ? "s" : ""} Detected</span>
    </div>
  {/if}
</div>
