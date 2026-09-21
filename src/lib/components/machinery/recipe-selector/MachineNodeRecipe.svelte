<script lang="ts">
  import { onMount } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { ChevronRight } from "lucide-svelte";
  import { getItem } from "$lib/data/items";
  import { getMachine } from "$lib/data/machines";
  import type { RecipeDefinition } from "$lib/data/types";
  import { createRecipeCatalog } from "./recipe-catalog.svelte";

  let {
    id,
    selectedRecipeId = null,
    recipes,
    interactive = true,
    standalone = false,
    openOnMount = false,
    onCancel,
    onRecipeChange,
  }: {
    id: string;
    selectedRecipeId?: string | null;
    recipes: RecipeDefinition[];
    interactive?: boolean;
    standalone?: boolean;
    openOnMount?: boolean;
    onCancel?: () => void;
    onRecipeChange: (recipeId: string | null) => void;
  } = $props();

  let searchInput = $state<HTMLInputElement>();
  let pickerElement = $state<HTMLDivElement>();
  let catalogElement = $state<HTMLDivElement>();

  const catalog = createRecipeCatalog(
    () => recipes,
    () => selectedRecipeId,
    () => interactive,
    (recipeId) => onRecipeChange(recipeId),
  );
  onMount(() => {
    if (openOnMount) openCatalog();
  });

  function portal(node: HTMLElement): { destroy: () => void } {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }

  function openCatalog(): void {
    catalog.open();
    requestAnimationFrame(() => searchInput?.focus());
  }
  function closeCatalog(): void {
    catalog.close();
    if (standalone) onCancel?.();
  }

  function handleKeydown(event: KeyboardEvent): void {
    catalog.handleKeydown(event);
    if (event.key === "Escape" && standalone) onCancel?.();
  }

  function handleWindowPointerDown(event: PointerEvent): void {
    const wasOpen = catalog.isOpen;
    catalog.handleWindowPointerDown(event, pickerElement, catalogElement);
    if (standalone && wasOpen && !catalog.isOpen) onCancel?.();
  }
</script>

<svelte:window onpointerdown={handleWindowPointerDown} />

{#if recipes.length > 0 || standalone}
  <div bind:this={pickerElement} class="relative bg-neutral-950 px-3.5 pt-3" role="presentation">
    {#if !standalone}
      <span class="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white">
        Active Recipe
      </span>
      <button
        type="button"
        disabled={!interactive}
        aria-expanded={catalog.isOpen}
        aria-controls={`recipe-catalog-${id}`}
        onclick={openCatalog}
        onpointerdown={(event) => event.stopPropagation()}
        class="nodrag flex w-full cursor-pointer items-center justify-between gap-2 border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-left text-xs text-neutral-200 hover:border-neutral-600 focus:border-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span class="min-w-0 truncate">{catalog.selectedRecipe?.name ?? "Select a recipe"}</span>
        <span class="shrink-0 text-neutral-500">{catalog.isOpen ? "×" : "+"}</span>
      </button>
    {/if}

    {#if catalog.isOpen}
      <div use:portal class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
        <button
          type="button"
          aria-label="Close recipe catalog"
          onclick={closeCatalog}
          class="absolute inset-0"
        ></button>

        <div
          id={`recipe-catalog-${id}`}
          bind:this={catalogElement}
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          aria-label="Recipe catalog"
          onkeydown={handleKeydown}
          class="relative flex h-[min(40rem,calc(100dvh-2rem))] w-[min(72rem,calc(100vw-2rem))] min-h-0 flex-col overflow-hidden border border-neutral-700 bg-black"
        >
          <header class="flex shrink-0 items-center justify-between gap-4 px-4 py-3">
            <h2 class="text-2xl font-semibold italic text-neutral-100">Choose a recipe</h2>
            <Button
              variant="icon"
              ariaLabel="Close recipe catalog"
              onclick={closeCatalog}
              class="border-0 font-bold italic uppercase text-white hover:bg-white hover:text-black"
            >
              <span>x</span>
            </Button>
          </header>

          <div class="shrink-0 px-3 pb-3">
            <div class="relative">
              <input
                bind:this={searchInput}
                bind:value={catalog.search}
                type="search"
                placeholder="Search recipes or input/output items..."
                aria-label="Search recipes or input/output items"
                onpointerdown={(event) => event.stopPropagation()}
                class="w-full border border-neutral-700 bg-neutral-950 px-3 py-2 pr-28 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-400"
              />
              <span
                class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] uppercase tracking-wider text-neutral-600"
              >
                {catalog.filteredRecipes.length} of {recipes.length} recipes
              </span>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {#if catalog.filteredRecipes.length > 0}
              <div class="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {#each catalog.filteredRecipes as recipe (recipe.id)}
                  <button
                    type="button"
                    aria-current={recipe.id === selectedRecipeId ? "true" : undefined}
                    onclick={() => catalog.select(recipe.id)}
                    onpointerdown={(event) => event.stopPropagation()}
                    class="group grid h-48 grid-rows-[8rem_1fr] cursor-pointer overflow-hidden border border-neutral-800 bg-neutral-950 text-left transition-colors hover:border-neutral-500 hover:bg-white focus:outline-none aria-[current=true]:border-white"
                  >
                    {#if recipe.machineType === "fabricator"}
                      <div class="flex h-full min-h-0 w-full items-center justify-center px-3 py-3">
                        <div class="flex flex-wrap items-center justify-center gap-2">
                          {#each recipe.inputs as item (item.itemId)}
                            {@const definition = getItem(item.itemId)}
                            <div
                              class="group/item relative h-12 w-12 shrink-0"
                              role="img"
                              aria-label={`${item.amount} ${definition?.name ?? item.itemId}`}
                              title={`${item.amount} ${definition?.name ?? item.itemId}`}
                            >
                              {#if definition?.imageUrl}
                                <img
                                  src={definition.imageUrl}
                                  alt={definition.name}
                                  class="h-full w-full object-contain"
                                  loading="lazy"
                                />
                              {:else}
                                <span
                                  class="flex h-full w-full items-center justify-center px-0.5 text-center text-[9px] font-semibold uppercase leading-[0.9] text-neutral-500 group-hover:text-black"
                                >
                                  {definition?.name ?? item.itemId}
                                </span>
                              {/if}
                              <span
                                class="pointer-events-none absolute inset-0 z-10 hidden items-center justify-center bg-black px-1 text-center text-[9px] font-semibold uppercase leading-tight text-white group-hover/item:flex group-focus/item:flex"
                              >
                                {definition?.name ?? item.itemId}
                              </span>
                              <span
                                class="absolute bottom-0 left-0 bg-transparent px-0.5 py-0 text-lg font-bold text-white group-hover:bg-black group-hover:text-white"
                              >
                                −{item.amount}
                              </span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {:else}
                      <div
                        class="grid h-auto min-h-0 w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 px-2 py-3"
                      >
                        <div class="min-w-0">
                          <span
                            class="block text-xs font-semibold uppercase tracking-wider text-neutral-300 group-hover:text-black"
                          >
                            Inputs
                          </span>
                          <div class="mt-1 flex flex-wrap gap-1">
                            {#each recipe.inputs as item (item.itemId)}
                              {@const definition = getItem(item.itemId)}
                              <div
                                class="group/item relative h-11 w-11 shrink-0"
                                role="img"
                                aria-label={`${item.amount} ${definition?.name ?? item.itemId}`}
                                title={`${item.amount} ${definition?.name ?? item.itemId}`}
                              >
                                {#if definition?.imageUrl}
                                  <img
                                    src={definition.imageUrl}
                                    alt={definition.name}
                                    class="h-full w-full object-contain"
                                    loading="lazy"
                                  />
                                {:else}
                                  <span
                                    class="flex h-full w-full items-center justify-center px-0.5 text-center text-[9px] font-semibold uppercase leading-[0.9] text-neutral-500 group-hover:text-black"
                                  >
                                    {definition?.name ?? item.itemId}
                                  </span>
                                {/if}
                                <span
                                  class="pointer-events-none absolute inset-0 z-10 hidden items-center justify-center bg-black px-1 text-center text-[9px] font-semibold uppercase leading-tight text-white group-hover/item:flex group-focus/item:flex"
                                >
                                  {definition?.name ?? item.itemId}
                                </span>
                                <span
                                  class="absolute bottom-0 left-0 bg-transparent px-0.5 py-0 text-lg font-bold text-white group-hover:bg-black group-hover:text-white"
                                >
                                  −{item.amount}
                                </span>
                              </div>
                            {/each}
                          </div>
                        </div>

                        <ChevronRight
                          class="h-7 w-7 self-center text-neutral-200 group-hover:text-black"
                        />

                        <div class="min-w-0 text-right">
                          <span
                            class="block text-xs font-semibold uppercase tracking-wider text-neutral-300 group-hover:text-black"
                          >
                            Outputs
                          </span>
                          <div class="mt-1 flex flex-wrap justify-end gap-1">
                            {#each recipe.outputs as item (item.itemId)}
                              {@const definition = getItem(item.itemId)}
                              <div
                                class="group/item relative h-11 w-11 shrink-0"
                                role="img"
                                aria-label={`${item.amount} ${definition?.name ?? item.itemId}`}
                                title={`${item.amount} ${definition?.name ?? item.itemId}`}
                              >
                                {#if definition?.imageUrl}
                                  <img
                                    src={definition.imageUrl}
                                    alt={definition.name}
                                    class="h-full w-full object-contain"
                                    loading="lazy"
                                  />
                                {:else}
                                  <span
                                    class="flex h-full w-full items-center justify-center px-0.5 text-center text-[9px] font-semibold uppercase leading-[0.9] text-neutral-500 group-hover:text-black"
                                  >
                                    {definition?.name ?? item.itemId}
                                  </span>
                                {/if}
                                <span
                                  class="pointer-events-none absolute inset-0 z-10 hidden items-center justify-center bg-black px-1 text-center text-[9px] font-semibold uppercase leading-tight text-white group-hover/item:flex group-focus/item:flex"
                                >
                                  {definition?.name ?? item.itemId}
                                </span>
                                <span
                                  class="absolute bottom-0 right-0 bg-transparent px-1 py-0 text-lg font-bold text-white group-hover:bg-black group-hover:text-white"
                                >
                                  +{item.amount}
                                </span>
                              </div>
                            {/each}
                          </div>
                        </div>
                      </div>
                    {/if}

                    <div class="flex h-full flex-col justify-end px-3 pb-3">
                      <div class="flex items-start justify-between gap-2">
                        <span
                          class="min-w-0 truncate text-lg font-semibold text-neutral-100 group-hover:text-black"
                        >
                          {recipe.name}
                        </span>
                      </div>
                      <div
                        class="flex min-w-0 items-center gap-2 text-[10px] text-neutral-300 group-hover:text-black"
                      >
                        <span class="min-w-0 truncate">
                          {getMachine(recipe.machineType)?.name ?? recipe.machineType}
                        </span>
                        <span class="shrink-0 font-mono">{recipe.duration}s</span>
                        {#if recipe.machineType !== "fabricator"}
                          <span class="shrink-0 font-mono">{recipe.powerCost} kW</span>
                        {/if}
                      </div>
                    </div>
                  </button>
                {/each}
              </div>
            {:else}
              <div class="px-4 py-12 text-center">
                <p class="text-sm text-neutral-300">No matching recipes</p>
                <p class="mt-1 text-xs text-neutral-600">
                  Try a recipe name or an input/output item.
                </p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
