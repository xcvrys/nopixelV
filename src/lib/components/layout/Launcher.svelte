<script lang="ts">
  import ComingSoon from "$lib/components/ui/ComingSoon.svelte";
  import Footer from "./Footer.svelte";
</script>

<div
  class="relative w-full min-h-[100dvh] bg-black text-white flex flex-col justify-between items-center px-4 sm:px-6 py-6 overflow-hidden"
>
  <!-- Top Spacer for vertical balance -->
  <div class="h-4"></div>

  <!-- Main Centered Hub Content -->
  <div class="flex flex-col items-center justify-center text-center max-w-xl w-full my-auto">
    <!-- Title -->
    <h1
      class="text-6xl md:text-7xl lg:text-8xl font-bold italic text-white mb-1 inline-flex items-baseline justify-center gap-2 md:gap-3"
    >
      <span>NOPIXEL</span>
      <span
        class="text-accent text-[1.35em] font-black italic leading-none inline-block -translate-y-[3.5px]"
        >V</span
      >
    </h1>
    <p class="text-neutral-400 italic text-sm md:text-base font-normal mb-12 md:mb-16">
      Minigames & more....
    </p>

    <!-- Section 1: MINIGAMES -->
    <div class="mb-10 md:mb-12">
      <h2 class="text-xl md:text-2xl font-bold italic text-white uppercase mb-4">MINIGAMES</h2>
      <div class="flex flex-col items-center gap-1.5">
        <a
          href="/minigames/lockpick"
          class="inline-flex items-center justify-center px-5 h-8 leading-none pb-0.5 rounded-none font-semibold italic text-sm md:text-base uppercase bg-black text-white hover:bg-white hover:text-black border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          LOCKPICK
        </a>
        <ComingSoon label="STORE SAFE" class="h-8 px-5 text-sm md:text-base" />
      </div>
    </div>

    <!-- Section 2: RESOURCES -->
    <div>
      <h2 class="text-xl md:text-2xl font-bold italic text-white uppercase mb-4">RESOURCES</h2>
      <div class="flex flex-col items-center gap-1.5">
        <ComingSoon label="MACHINERY" class="h-8 px-5 text-sm md:text-base" />
      </div>
    </div>
  </div>

  <!-- Bottom Footer -->
  <Footer />
</div>
