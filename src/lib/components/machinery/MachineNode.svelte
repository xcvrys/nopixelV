<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";
  import { machineryStore, type MachineNodeData } from "$lib/stores/machinery.svelte";
  import { getRecipesForMachine, getRecipe } from "$lib/data/recipes";
  import { getItem } from "$lib/data/items";
  import {
    Flame,
    Cpu,
    GitFork,
    GitMerge,
    PackageCheck,
    Trash2,
    Zap,
    Gauge,
    TriangleAlert,
    CircleCheckBig,
    ChevronDown,
    ChevronUp,
  } from "lucide-svelte";

  let { id, data }: { id: string; data: MachineNodeData } = $props();

  let showTuning = $state(false);

  let availableRecipes = $derived(getRecipesForMachine(data.machineType));
  let currentRecipe = $derived(data.recipeId ? getRecipe(data.recipeId) : null);
  let stats = $derived(machineryStore.calculationResult.machineStats[id]);
  let efficiency = $derived(stats ? stats.efficiency : 1);
  let isBottlenecked = $derived(efficiency < 0.99 && (stats?.rates.inputs.length ?? 0) > 0);

  function handleRecipeChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    machineryStore.updateNodeData(id, { recipeId: select.value || null });
  }

  function handleClockSpeedChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const val = Number(input.value);
    machineryStore.updateNodeData(id, { clockSpeed: val });
  }

  function handleDurationChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const val = input.value === "" ? undefined : Number(input.value);
    machineryStore.updateNodeData(id, { customDurationOverride: val });
  }

  function handlePowerChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const val = input.value === "" ? undefined : Number(input.value);
    machineryStore.updateNodeData(id, { powerCostOverride: val });
  }

  function handleDelete() {
    machineryStore.removeNode(id);
  }

  const iconMap: Record<string, typeof Flame> = {
    furnace: Flame,
    processor: Cpu,
    splitter: GitFork,
    merger: GitMerge,
    storage: PackageCheck,
  };

  let MachineIcon = $derived(iconMap[data.machineType] || Cpu);
</script>

<div
  class="w-72 bg-neutral-950 border rounded-xl transition-colors duration-150 {isBottlenecked
    ? 'border-neutral-500'
    : 'border-neutral-800 hover:border-neutral-700'}"
>
  <!-- Machine Header -->
  <div
    class="flex items-center justify-between px-3.5 py-2.5 border-b border-neutral-900 bg-black rounded-t-xl"
  >
    <div class="flex items-center gap-2 min-w-0">
      <div
        class="w-6 h-6 rounded flex items-center justify-center bg-neutral-900 border border-neutral-800 text-white shrink-0"
      >
        <MachineIcon class="w-3.5 h-3.5" />
      </div>
      <span class="font-bold text-xs text-white truncate">{data.name}</span>
    </div>

    <div class="flex items-center gap-1">
      <button
        onclick={() => (showTuning = !showTuning)}
        class="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
        title="Toggle tuning sliders"
      >
        {#if showTuning}
          <ChevronUp class="w-3.5 h-3.5" />
        {:else}
          <ChevronDown class="w-3.5 h-3.5" />
        {/if}
      </button>
      <button
        onclick={handleDelete}
        class="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
        title="Delete machine"
      >
        <Trash2 class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>

  <!-- Recipe Selector -->
  {#if availableRecipes.length > 0}
    <div class="px-3.5 pt-3">
      <label
        for="recipe-select-{id}"
        class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1"
      >
        Active Recipe
      </label>
      <select
        id="recipe-select-{id}"
        value={data.recipeId || ""}
        onchange={handleRecipeChange}
        class="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-500"
      >
        {#each availableRecipes as r}
          <option value={r.id}>{r.name} ({r.duration}s)</option>
        {/each}
      </select>
    </div>
  {/if}

  <!-- In/Out Sockets Container -->
  <div class="grid grid-cols-2 gap-2 px-3.5 py-3 relative">
    <!-- Left: Input Sockets -->
    <div class="space-y-3">
      {#if currentRecipe && currentRecipe.inputs.length > 0}
        <div class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Inputs
        </div>
        {#each currentRecipe.inputs as input}
          {@const item = getItem(input.itemId)}
          {@const inputStat = stats?.rates.inputs.find((i) => i.itemId === input.itemId)}
          <div class="relative flex items-center gap-1.5 py-0.5">
            <Handle
              type="target"
              position={Position.Left}
              id={input.itemId}
              class="!w-3 !h-3 !-left-5 !bg-cyan-500 !border-2 !border-slate-950 hover:!scale-125 transition-transform"
            />
            <span
              class="w-2 h-2 rounded-full shrink-0"
              style="background-color: {item?.color || '#38bdf8'}"
            ></span>
            <div class="min-w-0">
              <div class="text-[11px] font-semibold text-neutral-300 truncate">
                {item?.name || input.itemId}
              </div>
              <div class="text-[10px] font-mono text-neutral-400">
                {inputStat ? inputStat.amountPerMin.toFixed(1) : (input.amount * 20).toFixed(0)}/m
              </div>
            </div>
          </div>
        {/each}
      {:else}
        <div class="text-[10px] text-slate-600 italic">No inputs required</div>
      {/if}
    </div>

    <!-- Right: Output Sockets -->
    <div class="space-y-3 text-right">
      {#if currentRecipe && currentRecipe.outputs.length > 0}
        <div class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Outputs
        </div>
        {#each currentRecipe.outputs as output}
          {@const item = getItem(output.itemId)}
          {@const outputStat = stats?.actualOutputs.find((o) => o.itemId === output.itemId)}
          <div class="relative flex items-center justify-end gap-1.5 py-0.5">
            <div class="min-w-0">
              <div class="text-[11px] font-semibold text-neutral-300 truncate">
                {item?.name || output.itemId}
              </div>
              <div class="text-[10px] font-mono text-neutral-200">
                {outputStat
                  ? outputStat.amountPerMin.toFixed(1)
                  : (output.amount * 20).toFixed(0)}/m
              </div>
            </div>
            <span
              class="w-2 h-2 rounded-full shrink-0"
              style="background-color: {item?.color || '#10b981'}"
            ></span>
            <Handle
              type="source"
              position={Position.Right}
              id={output.itemId}
              class="!w-3 !h-3 !-right-5 !bg-emerald-500 !border-2 !border-slate-950 hover:!scale-125 transition-transform"
            />
          </div>
        {/each}
      {:else}
        <div class="text-[10px] text-slate-600 italic">No outputs</div>
      {/if}
    </div>
  </div>

  <!-- Status & Performance Footer -->
  <div
    class="flex items-center justify-between px-3.5 py-2 border-t border-neutral-900 bg-black rounded-b-xl text-[11px]"
  >
    <!-- Efficiency Badge -->
    <div class="flex items-center gap-1.5">
      {#if isBottlenecked}
        <TriangleAlert class="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <span class="text-neutral-300 font-bold font-mono"
          >{(efficiency * 100).toFixed(0)}% Bottleneck</span
        >
      {:else}
        <CircleCheckBig class="w-3.5 h-3.5 text-white shrink-0" />
        <span class="text-white font-bold font-mono">100% Flow</span>
      {/if}
    </div>

    <!-- Power draw -->
    <div class="flex items-center gap-1 font-mono text-neutral-400">
      <Zap class="w-3 h-3 text-neutral-400" />
      <span>{(stats?.rates.powerPerMinute ?? 0 * efficiency).toFixed(0)} kW</span>
    </div>
  </div>

  <!-- Expandable Tuning Sliders (Duration, Boost, Power) -->
  {#if showTuning}
    <div
      class="px-3.5 py-3 border-t border-neutral-900 bg-neutral-950 rounded-b-xl space-y-3 text-xs"
    >
      <!-- Clock Speed Slider -->
      <div>
        <div class="flex justify-between text-neutral-400 mb-1 text-[11px]">
          <span class="flex items-center gap-1"><Gauge class="w-3 h-3" /> Clock Speed</span>
          <span class="font-mono text-white font-bold">{data.clockSpeed}%</span>
        </div>
        <input
          type="range"
          min="25"
          max="250"
          step="5"
          value={data.clockSpeed}
          oninput={handleClockSpeedChange}
          class="w-full accent-white bg-neutral-800 rounded-lg cursor-pointer h-1.5"
        />
      </div>

      <!-- Duration & Power Overrides -->
      <div class="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <label for="duration-input-{id}" class="text-neutral-400 block mb-0.5"
            >Craft Time (s)</label
          >
          <input
            id="duration-input-{id}"
            type="number"
            placeholder={currentRecipe?.duration.toString() || "3"}
            value={data.customDurationOverride ?? ""}
            oninput={handleDurationChange}
            class="w-full bg-black border border-neutral-800 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-neutral-500"
          />
        </div>
        <div>
          <label for="power-input-{id}" class="text-neutral-400 block mb-0.5">Power (kW)</label>
          <input
            id="power-input-{id}"
            type="number"
            placeholder={currentRecipe?.powerCost.toString() || "2"}
            value={data.powerCostOverride ?? ""}
            oninput={handlePowerChange}
            class="w-full bg-black border border-neutral-800 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-neutral-500"
          />
        </div>
      </div>
    </div>
  {/if}
</div>
