<script lang="ts">
  import { ControlButton, Controls } from "@xyflow/svelte";
  import { Image, ImageOff } from "lucide-svelte";
  import { machineryStore } from "$lib/stores/machinery.svelte";

  let allImagesVisible = $derived(machineryStore.imagesVisible);

  function toggleAllImages(): void {
    machineryStore.toggleImages();
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
        <Image class="!fill-none" strokeWidth={2.25} />
      {:else}
        <ImageOff class="!fill-none" strokeWidth={2.25} />
      {/if}
    </ControlButton>
  {/snippet}
</Controls>
