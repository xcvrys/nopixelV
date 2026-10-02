<script lang="ts">
  import { onMount } from "svelte";
  import {
    FIREWALL_RUN_CONFIG,
    BOARD_HEIGHT,
    BOARD_WIDTH,
    BLOCK_SIZE,
    ELEMENT_SIZE,
    LANE_COUNT,
    LANE_WIDTH,
    PLAYER_CENTER_Y,
  } from "$lib/engine/firewall-run";
  import { FirewallRunStore } from "$lib/stores/firewall-run.svelte";

  const game = new FirewallRunStore();

  const lanes = Array.from({ length: LANE_COUNT }, (_, lane) => lane);
  const laneCenters = lanes.map((lane) => LANE_WIDTH * lane + LANE_WIDTH / 2);

  const runSeconds = FIREWALL_RUN_CONFIG.runSeconds;
  const elapsed = $derived(game.snapshot.elapsedSeconds);
  const remaining = $derived(Math.max(0, runSeconds - elapsed));
  const uptimePercent = $derived(Math.min(100, (elapsed / runSeconds) * 100));
  const dividerOffsets = lanes.slice(1).map((lane) => LANE_WIDTH * lane);

  const promptClass =
    "cursor-pointer border-0 bg-transparent p-0 text-xs md:text-sm font-bold italic tracking-wider text-neutral-500 uppercase hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

  onMount(() => {
    game.start();
    return () => game.stop();
  });
</script>

<div class="flex min-h-[100dvh] w-full items-center justify-center bg-black px-4 py-10 select-none">
  <div class="flex w-full max-w-[970px] flex-col items-center">
    <div class="mb-3 flex w-full items-center gap-3 px-1">
      <span class="text-[11px] font-bold italic uppercase tracking-wider text-neutral-500">
        Uptime
      </span>
      <div
        class="h-2 flex-1 border border-neutral-900 bg-black"
        role="progressbar"
        aria-label="Breach progress"
        aria-valuemin="0"
        aria-valuemax={runSeconds}
        aria-valuenow={Math.round(elapsed)}
      >
        <div class="h-full bg-emerald-400" style="width: {uptimePercent}%"></div>
      </div>
      <span class="font-mono text-sm tabular-nums text-neutral-300">{remaining.toFixed(1)}s</span>
    </div>
    <div class="relative w-full">
      <svg
        viewBox="0 0 {BOARD_WIDTH} {BOARD_HEIGHT}"
        class="firewall-board"
        class:dimmed={game.snapshot.status !== "playing"}
        role="img"
        aria-labelledby="firewall-board-title firewall-board-description"
      >
        <title id="firewall-board-title">Firewall Run</title>
        <desc id="firewall-board-description">
          Six lanes with firewall walls descending toward the player. Use the left and right arrow
          keys, or A and D, to change lane and stay in the one open gap.
        </desc>

        <g aria-hidden="true">
          {#each dividerOffsets as x (x)}
            <line x1={x} y1="0" x2={x} y2={BOARD_HEIGHT} class="lane-divider" />
          {/each}
          <rect
            x="1"
            y="1"
            width={BOARD_WIDTH - 2}
            height={BOARD_HEIGHT - 2}
            class="board-border"
          />
        </g>

        <g aria-hidden="true">
          {#each game.snapshot.walls as wall (wall.id)}
            {#each lanes as lane (lane)}
              {#if lane !== wall.openLane}
                <rect
                  x={laneCenters[lane] - BLOCK_SIZE / 2}
                  y={wall.y - BLOCK_SIZE / 2}
                  width={BLOCK_SIZE}
                  height={BLOCK_SIZE}
                  class="wall-block"
                />
              {/if}
            {/each}
          {/each}

          <rect
            x={laneCenters[game.snapshot.lane] - ELEMENT_SIZE / 2}
            y={PLAYER_CENTER_Y - ELEMENT_SIZE / 2}
            width={ELEMENT_SIZE}
            height={ELEMENT_SIZE}
            class="player-chip"
          />

          {#if game.snapshot.crashLane !== null}
            <circle
              cx={laneCenters[game.snapshot.crashLane]}
              cy={PLAYER_CENTER_Y}
              r={ELEMENT_SIZE / 2 + 3}
              class="crash-dot"
            />
          {/if}
        </g>
      </svg>

      {#if game.snapshot.status === "idle"}
        <div class="pointer-events-none absolute inset-0 z-20 grid place-items-center">
          <button
            type="button"
            class="{promptClass} pointer-events-auto"
            onclick={() => game.launch()}
          >
            PRESS ANY KEY TO START
          </button>
        </div>
      {/if}
    </div>

    <div class="mt-3.5 flex min-h-8 w-full items-center justify-center" aria-live="polite">
      {#if game.snapshot.status === "success"}
        <span
          class="px-3.5 py-1 bg-emerald-400 text-black text-sm md:text-base font-semibold italic uppercase leading-none rounded-none shadow-lg"
        >
          BREACH COMPLETE
        </span>
      {:else if game.snapshot.status === "failed"}
        <span
          class="px-3.5 py-1 bg-red-500 text-black text-sm md:text-base font-semibold italic uppercase leading-none rounded-none shadow-lg"
        >
          CONNECTION DROPPED
        </span>
      {:else}
        <span class="sr-only">
          {game.snapshot.status === "playing" ? "BREACH IN PROGRESS" : "PRESS ANY KEY TO START"}
        </span>
      {/if}
    </div>

    <div class="mt-2 flex min-h-6 w-full items-center justify-center">
      {#if game.snapshot.status === "failed" || game.snapshot.status === "success"}
        <button type="button" class={promptClass} onclick={() => game.launch()}>
          PRESS ENTER TO RESTART
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .firewall-board {
    display: block;
    box-sizing: border-box;
    width: 100%;
    height: auto;
    aspect-ratio: 970 / 485;
    background: #050505;
    transition: opacity 180ms ease;
  }

  .firewall-board.dimmed {
    opacity: 0.8;
  }

  .board-border {
    fill: none;
    stroke: var(--color-accent);
    stroke-width: 2;
    opacity: 0.55;
  }

  .lane-divider {
    stroke: var(--color-accent);
    stroke-width: 1;
    opacity: 0.25;
  }

  .wall-block {
    fill: #ef4444;
  }

  .player-chip {
    fill: #22c55e;
  }

  .crash-dot {
    fill: none;
    stroke: #ef4444;
    stroke-width: 3;
  }
</style>
