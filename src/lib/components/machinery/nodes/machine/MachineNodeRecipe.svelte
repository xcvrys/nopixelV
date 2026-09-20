<script lang="ts">
  import type { MachineNodeData } from "$lib/engine/machinery";
  import type { RecipeDefinition } from "$lib/data/recipes";

  let {
    id,
    data,
    recipes,
    interactive = true,
    onRecipeChange,
  }: {
    id: string;
    data: MachineNodeData;
    recipes: RecipeDefinition[];
    interactive?: boolean;
    onRecipeChange: (event: Event) => void;
  } = $props();
</script>

{#if recipes.length > 0}
  <div class="bg-neutral-950 px-3.5 pt-3">
    <label
      for="recipe-select-{id}"
      class="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white"
    >
      Active Recipe
    </label>
    <select
      id="recipe-select-{id}"
      value={data.recipeId || ""}
      disabled={!interactive}
      onchange={onRecipeChange}
      onpointerdown={(event) => event.stopPropagation()}
      class="nodrag nowheel w-full border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 focus:border-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
    >
      {#each recipes as recipe (recipe.id)}
        <option value={recipe.id}>{recipe.name} ({recipe.duration}s)</option>
      {/each}
    </select>
  </div>
{/if}
