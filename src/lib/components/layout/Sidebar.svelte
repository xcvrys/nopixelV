<script lang="ts">
  import { onMount } from "svelte";
  import { Volume2, Volume1, VolumeX } from "lucide-svelte";
  import { Drawer } from "vaul-svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import ComingSoon from "$lib/components/ui/ComingSoon.svelte";
  import { audioStore } from "$lib/stores/audio.svelte";
  import { cn } from "$lib/utils/cn";

  type NavigationItem = {
    label: string;
    href: string;
    available: boolean;
  };

  const navigationSections: { label: string; items: NavigationItem[] }[] = [
    {
      label: "MINIGAMES",
      items: [
        { label: "LOCKPICK", href: "/minigames/lockpick", available: true },
        {
          label: "STORE SAFE",
          href: "/minigames/store-safe",
          available: false,
        },
      ],
    },
    {
      label: "RESOURCES",
      items: [{ label: "MACHINERY", href: "/calculator", available: false }],
    },
  ];

  let { currentPath = "/" }: { currentPath: string } = $props();

  let isHovered = $state(false);
  let hasMouse = $state(false);

  onMount(() => {
    const pointerQuery = window.matchMedia("(pointer: fine)");
    hasMouse = pointerQuery.matches;
    const handlePointerChange = (event: MediaQueryListEvent) => {
      hasMouse = event.matches;
    };
    pointerQuery.addEventListener("change", handlePointerChange);
    return () => pointerQuery.removeEventListener("change", handlePointerChange);
  });

  let isMobileMenuOpen = $state(false);

  function closeMobileMenu() {
    isMobileMenuOpen = false;
  }

  function handleToggleMute() {
    if (audioStore.muted) {
      audioStore.setMuted(false);
      if (audioStore.volume === 0) {
        audioStore.setVolume(0.5);
      }
      audioStore.playRatchetClick();
    } else {
      audioStore.setMuted(true);
    }
  }

  function handleVolumeInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const val = parseFloat(target.value);
    if (audioStore.muted && val > 0) {
      audioStore.setMuted(false);
    }
    audioStore.setVolume(val);
  }

  function handleVolumeChange() {
    if (!audioStore.muted && audioStore.volume > 0) {
      audioStore.playRatchetClick();
    }
  }
</script>

<div class="fixed right-3 top-4 z-50 md:hidden">
  <Drawer.Root bind:open={isMobileMenuOpen} shouldScaleBackground>
    <Drawer.Trigger
      aria-label="Toggle navigation menu"
      aria-controls="mobile-navigation"
      class={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap border border-transparent px-3 py-2 text-xs font-semibold italic uppercase leading-none outline-none transition-[background-color,color,border-color,transform] duration-150 active:translate-y-px focus-visible:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        isMobileMenuOpen
          ? "bg-white text-black hover:bg-neutral-200"
          : "bg-transparent text-neutral-300 hover:bg-neutral-900 hover:text-white",
      )}
    >
      Menu
    </Drawer.Trigger>
    <Drawer.Portal>
      <Drawer.Overlay class="fixed inset-0 z-40 bg-black/70 transition-opacity duration-300" />
      <Drawer.Content
        id="mobile-navigation"
        aria-label="Mobile navigation"
        class="fixed inset-x-0 bottom-0 z-50 flex min-h-[50dvh] max-h-[85dvh] flex-col border-t border-neutral-800 bg-black p-6 shadow-2xl outline-none transition-transform duration-300 ease-out"
      >
        <nav class="flex flex-col gap-10 pt-6">
          {#each navigationSections as section (section.label)}
            <div>
              <h2 class="mb-4 text-2xl font-black italic uppercase tracking-wide text-white">
                {section.label}
              </h2>
              <div class="flex flex-col items-start gap-1.5">
                {#each section.items as item (item.href)}
                  {#if item.available}
                    <a
                      href={item.href}
                      aria-current={currentPath === item.href ? "page" : undefined}
                      onclick={closeMobileMenu}
                      class={cn(
                        "inline-flex items-center px-3.5 py-1 leading-none font-bold italic text-lg uppercase outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                        currentPath === item.href
                          ? "bg-white text-black"
                          : "text-white hover:bg-white hover:text-black",
                      )}
                    >
                      {item.label}
                    </a>
                  {:else}
                    <ComingSoon label={item.label} badge="SOON" class="px-3.5 py-1 text-lg" />
                  {/if}
                {/each}
              </div>
            </div>
          {/each}
        </nav>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
</div>

<!-- Desktop sidebar -->
<aside
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
  class={cn(
    "fixed left-3 top-4 z-50 hidden select-none flex-col gap-6 transition-opacity duration-200 sm:left-8 sm:top-1/2 sm:-translate-y-1/2 sm:gap-10 md:flex md:gap-14",
    !hasMouse || isHovered
      ? "opacity-100"
      : "opacity-20 hover:opacity-100 focus-within:opacity-100",
  )}
>
  {#each navigationSections as section (section.label)}
    <div>
      <h2
        class="text-2xl md:text-3xl font-black italic text-white uppercase tracking-wide mb-3 md:mb-4"
      >
        {section.label}
      </h2>
      <div class="flex flex-col items-start gap-1.5">
        {#each section.items as item (item.href)}
          {#if item.available}
            <a
              href={item.href}
              aria-current={currentPath === item.href ? "page" : undefined}
              class={cn(
                "inline-flex items-center px-3 md:px-3.5 py-1 leading-none rounded-none font-bold italic text-base md:text-lg uppercase border-0 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                currentPath === item.href
                  ? "bg-white text-black"
                  : "bg-transparent text-white hover:bg-white hover:text-black",
              )}
            >
              {item.label}
            </a>
          {:else}
            <ComingSoon
              label={item.label}
              badge="SOON"
              class="px-3 md:px-3.5 py-1 text-base md:text-lg"
            />
          {/if}
        {/each}
      </div>
    </div>
  {/each}
</aside>
<!-- Bottom Page Audio Control (Compact & separated from main menu) -->
<div
  class="fixed bottom-5 left-3 z-40 hidden select-none flex-col gap-1 transition-opacity duration-200 sm:bottom-8 sm:left-8 md:flex md:bottom-9 {isHovered
    ? 'opacity-100'
    : 'opacity-30 hover:opacity-100'}"
>
  <div class="flex items-center gap-2">
    <span
      class="text-[9px] md:text-[10px] font-mono font-bold tracking-wider text-neutral-500 uppercase"
    >
      VOL
    </span>
    <span
      class="font-mono text-[10px] md:text-[11px] font-bold tabular-nums {audioStore.muted
        ? 'text-neutral-600 line-through'
        : 'text-neutral-300'}"
    >
      {audioStore.muted ? "MUTED" : `${Math.round(audioStore.volume * 100)}%`}
    </span>
  </div>

  <div class="flex items-center gap-2">
    <Button
      variant="icon"
      type="button"
      onclick={handleToggleMute}
      title={audioStore.muted ? "Unmute audio" : "Mute audio"}
      ariaLabel={audioStore.muted ? "Unmute audio" : "Mute audio"}
      class="h-5 w-5 px-0"
    >
      {#if audioStore.muted || audioStore.volume === 0}
        <VolumeX class="w-3 h-3" />
      {:else if audioStore.volume < 0.5}
        <Volume1 class="w-3 h-3" />
      {:else}
        <Volume2 class="w-3 h-3" />
      {/if}
    </Button>

    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={audioStore.muted ? 0 : audioStore.volume}
      oninput={handleVolumeInput}
      onchange={handleVolumeChange}
      aria-label="Master volume"
      class="sharp-range w-24 md:w-28 h-1 outline-none cursor-pointer"
    />
  </div>
</div>

<style>
  .sharp-range {
    -webkit-appearance: none;
    appearance: none;
    background: #141414;
    border: 1px solid #262626;
  }
  .sharp-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 6px;
    height: 12px;
    background: #ffffff;
    cursor: pointer;
    border-radius: 0;
  }

  .sharp-range::-moz-range-thumb {
    width: 6px;
    height: 12px;
    background: #ffffff;
    cursor: pointer;
    border-radius: 0;
    border: none;
  }
  @keyframes mobile-drawer-enter {
    from {
      transform: translate3d(0, 100%, 0);
    }
    to {
      transform: translate3d(0, 0, 0);
    }
  }

  :global([data-vaul-drawer][data-vaul-drawer-visible="true"]) {
    animation: mobile-drawer-enter 500ms cubic-bezier(0.32, 0.72, 0, 1);
  }
</style>
