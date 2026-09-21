<script lang="ts">
  import { ControlButton, Controls } from "@xyflow/svelte";
  import { Image, ImageOff } from "lucide-svelte";
  import { machineryStore } from "$lib/stores/machinery.svelte";

  let allImagesVisible = $derived(
    machineryStore.nodes.some((node) => node.type === "machine" || node.type === "energy") &&
      machineryStore.nodes
        .filter((node) => node.type === "machine" || node.type === "energy")
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
        <Image />
      {:else}
        <ImageOff />
      {/if}
    </ControlButton>
  {/snippet}
</Controls>
