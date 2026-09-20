<script lang="ts">
  let {
    name,
    imageUrl,
  }: {
    name: string;
    imageUrl: string;
  } = $props();
</script>

<div class="flex justify-center border-b border-neutral-900 bg-neutral-900/40 p-3">
  <div
    class="flex aspect-square w-[100px] max-w-full items-center justify-center overflow-hidden border border-neutral-800 bg-black"
  >
    <img
      src={imageUrl}
      alt={`${name} image`}
      width="100"
      height="100"
      loading="lazy"
      decoding="async"
      class="h-full w-full object-cover"
    />
  </div>
</div>
