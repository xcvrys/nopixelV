<script lang="ts">
  import { ControlButton, Controls } from "@xyflow/svelte";
  import { Eye, EyeOff } from "lucide-svelte";
  import { machineryStore } from "$lib/stores/machinery.svelte";

  let allImagesVisible = $derived(
    machineryStore.nodes.some((node) => node.type === "machine") &&
      machineryStore.nodes
        .filter((node) => node.type === "machine")
        .every((node) => node.data.showImage !== false),
  );

  function toggleAllImages() {
    machineryStore.setAllImagesVisible(!allImagesVisible);
  }
</script>

<Controls class="!bottom-4 !left-4 !rounded-none">
  {#snippet after()}
    <ControlButton
      onclick={toggleAllImages}
      title={allImagesVisible ? "Hide all images" : "Show all images"}
      aria-label={allImagesVisible ? "Hide all images" : "Show all images"}
    >
      {#if allImagesVisible}
        <EyeOff />
      {:else}
        <Eye />
      {/if}
    </ControlButton>
  {/snippet}
</Controls>
