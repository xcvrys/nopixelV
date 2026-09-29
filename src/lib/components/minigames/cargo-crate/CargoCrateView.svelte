<script lang="ts">
  import { onMount } from "svelte";
  import {
    CARGO_CRATE_CONFIG,
    CARGO_TRACKS,
    CARGO_TRACK_KEYS,
    type CargoTrack,
  } from "$lib/engine/cargo-crate";
  import { CargoCrateStore } from "$lib/stores/cargo-crate.svelte";

  const cargo = new CargoCrateStore();

  onMount(() => {
    void cargo.start();
    return () => cargo.stop();
  });

  const { targetProgress, maxMisses, hitWindowStart, hitWindowEnd } = CARGO_CRATE_CONFIG;
  const guidePositions = [hitWindowStart, (hitWindowStart + hitWindowEnd) / 2, hitWindowEnd];

  const trackTheme: Record<CargoTrack, { guide: string; crate: string; keycap: string }> = {
    A: {
      guide: "bg-cyan-300",
      crate: "border-cyan-300 bg-cyan-300/5",
      keycap: "border-cyan-300",
    },
    B: {
      guide: "bg-emerald-300",
      crate: "border-emerald-300 bg-emerald-300/5",
      keycap: "border-emerald-300",
    },
    C: {
      guide: "bg-violet-300",
      crate: "border-violet-300 bg-violet-300/5",
      keycap: "border-violet-300",
    },
  };

  const status = $derived(cargo.snapshot.status);
  const isIdle = $derived(status === "idle");
  const isFinished = $derived(status === "success" || status === "failed");
  const progressPercent = $derived((cargo.snapshot.progress / targetProgress) * 100);

  function cratesFor(track: CargoTrack) {
    return cargo.snapshot.crates.filter((crate) => crate.track === track);
  }

  function rowFeedbackClass(track: CargoTrack): string {
    const feedback = cargo.snapshot.feedback;
    if (feedback?.track !== track) return "";
    return feedback.kind === "hit"
      ? "ring-2 ring-inset ring-emerald-400"
      : "ring-2 ring-inset ring-rose-500";
  }

  function keyLabel(track: CargoTrack): string {
    return CARGO_TRACK_KEYS[track].toUpperCase();
  }
</script>

<div class="flex min-h-[100dvh] w-full items-center justify-center bg-black px-4 py-10 select-none">
  <div class="w-full max-w-5xl">
    <div class="relative overflow-hidden border border-neutral-800 {isIdle ? 'opacity-40' : ''}">
      {#each CARGO_TRACKS as track, trackIndex (track)}
        {@const theme = trackTheme[track]}
        <div
          class="relative h-28 border-neutral-800 {trackIndex < CARGO_TRACKS.length - 1
            ? 'border-b'
            : ''} {rowFeedbackClass(track)}"
        >
          <span
            class="absolute top-1/2 left-3 -translate-y-1/2 text-xs font-bold tracking-[0.2em] text-neutral-600 uppercase md:left-4 md:text-sm"
          >
            Track {track}
          </span>

          {#each guidePositions as position, guideIndex (position)}
            <div
              class="absolute inset-y-0 w-px {theme.guide} {guideIndex === 1
                ? 'opacity-90'
                : 'opacity-35'}"
              style="left: {position * 100}%"
            ></div>
          {/each}

          <div class="absolute inset-0" aria-hidden="true">
            {#each cratesFor(track) as crate (crate.id)}
              <div
                class="absolute top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 -rotate-45 border-2 md:size-12 {theme.crate}"
                style="left: {crate.x * 100}%"
              ></div>
            {/each}
          </div>

          <button
            type="button"
            class="absolute top-1/2 right-4 -translate-y-1/2 border-2 text-lg font-bold italic transition-colors duration-75 md:right-8 md:size-14 md:text-2xl {theme.keycap} {cargo.pressedTrack ===
            track
              ? 'bg-white text-black'
              : 'bg-black/40 text-neutral-400'}"
            onclick={() => cargo.press(track)}
            aria-label="Track {track}, press {keyLabel(track)}"
          >
            {keyLabel(track)}
          </button>
        </div>
      {/each}

      {#if isIdle}
        <button
          type="button"
          class="absolute inset-0 z-10 flex cursor-pointer flex-col items-center justify-center gap-5 bg-black/70"
          onclick={() => cargo.launch()}
        >
          <span class="text-2xl font-bold italic tracking-wide uppercase md:text-4xl">
            Press any key to begin
          </span>
          <span
            class="flex items-center gap-2 text-xs font-bold tracking-widest text-neutral-400 uppercase"
          >
            Tap
            {#each CARGO_TRACKS as track (track)}
              <span class="border border-neutral-600 bg-white px-1.5 text-base text-black">
                {keyLabel(track)}
              </span>
            {/each}
            on the beat
          </span>
        </button>
      {:else if isFinished}
        <div
          class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/85"
          role="status"
        >
          <span
            class="rounded-none px-3.5 py-1 text-sm font-semibold italic tracking-wider uppercase leading-none text-black shadow-lg md:text-base {status ===
            'success'
              ? 'bg-emerald-400'
              : 'bg-red-500'}"
          >
            {status === "success" ? "Crates secured" : "Shipment lost"}
          </span>
          <span class="text-3xl font-bold italic tracking-wide tabular-nums uppercase md:text-4xl">
            {cargo.snapshot.progress} / {targetProgress}
          </span>
          <button
            type="button"
            class="cursor-pointer rounded-none border-2 border-white px-4 py-1.5 text-sm font-bold italic tracking-widest uppercase hover:bg-white hover:text-black"
            onclick={() => cargo.launch()}
          >
            Play again
          </button>
        </div>
      {/if}
    </div>

    <div class="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
      <p class="text-sm font-bold italic tracking-widest text-neutral-500 uppercase">
        Progress <span class="text-white">{cargo.snapshot.progress}</span> / {targetProgress}
      </p>
      <p class="text-sm font-bold italic tracking-widest text-neutral-500 uppercase">
        Streak <span class="text-white">{cargo.snapshot.streak}</span>
      </p>
      <p class="text-sm font-bold italic tracking-widest text-neutral-500 uppercase">
        Misses <span class="text-white">{cargo.snapshot.misses}</span> / {maxMisses}
      </p>
      <div class="h-3 min-w-40 flex-1 border border-neutral-800">
        <div
          class="h-full bg-linear-to-r from-cyan-400 to-emerald-400"
          style="width: {progressPercent}%"
        ></div>
      </div>
    </div>

    <p class="mt-3 text-xs font-bold italic tracking-widest text-neutral-700 uppercase">
      Best streak {cargo.best.bestStreak} · Best progress {cargo.best.bestProgress} / {targetProgress}
    </p>
  </div>
</div>
