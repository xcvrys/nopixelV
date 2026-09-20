<script lang="ts">
  let {
    name,
    imageUrl,
  }: {
    name: string;
    imageUrl: string | null;
  } = $props();
</script>

<div class="flex justify-center border-b border-neutral-900 bg-neutral-950 p-1">
  <div class="flex aspect-square w-[100px] max-w-full items-center justify-center overflow-hidden">
    {#if imageUrl}
      <img
        src={imageUrl}
        alt={`${name} image`}
        width="100"
        height="100"
        class="h-full w-full object-contain"
        decoding="async"
      />
    {:else}
      <span aria-hidden="true" class="text-5xl font-semibold text-neutral-500"> ? </span>
    {/if}
  </div>
</div>
