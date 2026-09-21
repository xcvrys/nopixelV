import { getItem } from "$lib/data/items";
import type { RecipeDefinition } from "$lib/data/types";

export function createRecipeCatalog(
  recipes: () => RecipeDefinition[],
  recipeId: () => string | null,
  interactive: () => boolean,
  onRecipeChange: (recipeId: string | null) => void,
) {
  let isOpen = $state(false);
  let search = $state("");

  const selectedRecipe = $derived(recipes().find((recipe) => recipe.id === recipeId()));
  const filteredRecipes = $derived.by(() => {
    const allRecipes = recipes();
    const query = search.trim().toLowerCase();
    if (!query) return allRecipes;

    return allRecipes.filter((recipe) => {
      const itemText = [...recipe.inputs, ...recipe.outputs]
        .map((item) => `${item.itemId} ${getItem(item.itemId)?.name ?? ""}`)
        .join(" ");
      return `${recipe.name} ${recipe.id} ${itemText}`.toLowerCase().includes(query);
    });
  });

  function open(): void {
    if (!interactive()) return;
    isOpen = true;
  }

  function close(): void {
    isOpen = false;
    search = "";
  }

  function select(recipeId: string): void {
    onRecipeChange(recipeId);
    close();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") close();
  }

  function handleWindowPointerDown(
    event: PointerEvent,
    pickerElement: HTMLDivElement | undefined,
    catalogElement: HTMLDivElement | undefined,
  ): void {
    if (
      !isOpen ||
      !(event.target instanceof Node) ||
      pickerElement?.contains(event.target) ||
      catalogElement?.contains(event.target)
    ) {
      return;
    }
    close();
  }

  return {
    get isOpen() {
      return isOpen;
    },
    get search() {
      return search;
    },
    set search(value: string) {
      search = value;
    },
    get selectedRecipe() {
      return selectedRecipe;
    },
    get filteredRecipes() {
      return filteredRecipes;
    },
    open,
    close,
    select,
    handleKeydown,
    handleWindowPointerDown,
  };
}
