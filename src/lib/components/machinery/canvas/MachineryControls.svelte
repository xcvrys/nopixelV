<script lang="ts">
  import { ControlButton, Controls } from "@xyflow/svelte";
  import { Image, ImageOff, Zap, ZapOff } from "lucide-svelte";
  import { machineryStore } from "$lib/stores/machinery.svelte";

  let allImagesVisible = $derived(machineryStore.imagesVisible);
  let powerRequired = $derived(machineryStore.powerRequired);

  function toggleAllImages(): void {
    machineryStore.toggleImages();
  }

  function togglePowerRequired(): void {
    machineryStore.togglePowerRequired();
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
    <ControlButton
      onclick={togglePowerRequired}
      title={powerRequired
        ? "Power required (click to disable)"
        : "Power not required (click to enable)"}
      aria-label={powerRequired
        ? "Power required (click to disable)"
        : "Power not required (click to enable)"}
    >
      {#if powerRequired}
        <Zap class="!fill-none" strokeWidth={2.25} />
      {:else}
        <ZapOff class="!fill-none" strokeWidth={2.25} />
      {/if}
    </ControlButton>
  {/snippet}
</Controls>
