<script lang="ts">
  let { name }: { name: string } = $props();
</script>

<div class="flex justify-center border-b border-neutral-900 bg-neutral-900/40 p-3">
  <div
    role="img"
    aria-label={`${name} image`}
    class="flex aspect-square w-[100px] max-w-full items-center justify-center border border-neutral-800 bg-black"
  >
    <span class="font-mono text-4xl font-bold text-neutral-800"
      >{name.slice(0, 1).toUpperCase()}</span
    >
  </div>
</div>
