import type { RecipeDefinition } from "./types";
import { REPOSITORY_RECIPES } from "./recipes";

export { REPOSITORY_RECIPES } from "./recipes";
export type { Recipe, RecipeDefinition, RecipeItem, RecipePortRequirement } from "./types";

const RECIPES_BY_ID: Record<string, RecipeDefinition> = Object.fromEntries(
  REPOSITORY_RECIPES.map((recipe) => [recipe.id, recipe]),
);

export function getRecipe(id: string): RecipeDefinition | undefined {
  return RECIPES_BY_ID[id];
}

export function getRecipesForMachine(machineTypeOrClass: string): RecipeDefinition[] {
  return REPOSITORY_RECIPES.filter(
    (recipe) =>
      recipe.allowedMachineClasses.includes(machineTypeOrClass) ||
      recipe.machineType === machineTypeOrClass,
  );
}

export function getRecipesForMachineClass(machineClass: string): RecipeDefinition[] {
  return REPOSITORY_RECIPES.filter((recipe) => recipe.allowedMachineClasses.includes(machineClass));
}
