<script lang="ts">
  import { onMount } from "svelte";
  import {
    BOARD_COLUMNS,
    BOARD_SIZE,
    edgeKey,
    type Direction,
    type DifficultyTier,
  } from "$lib/engine/traceroute";
  import { TracerouteStore } from "$lib/stores/traceroute.svelte";

  const game = new TracerouteStore();
  const promptClass =
    "cursor-pointer border-0 bg-transparent p-0 text-xs md:text-sm font-bold italic tracking-wider text-neutral-500 uppercase hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";
  const pointPositions = Array.from({ length: BOARD_SIZE }, (_, id) => ({
    x: 44 + (id % BOARD_COLUMNS) * 82,
    y: 39 + Math.floor(id / BOARD_COLUMNS) * 76,
  }));
  const directionByKey: Record<string, Direction> = {
    arrowup: "up",
    arrowdown: "down",
    arrowleft: "left",
    arrowright: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };
  const tierOptions = [
    { value: "easy", label: "EASY", range: "18–21" },
    { value: "medium", label: "MEDIUM", range: "22–26" },
    { value: "hard", label: "HARD", range: "27–30" },
  ] as const satisfies {
    value: DifficultyTier;
    label: string;
    range: string;
  }[];

  let snapshot = $derived(game.snapshot);
  let countdown = $state<number | null>(null);
  let countdownInterval: number | null = null;
  let filledEdges = $derived(new Set(snapshot?.filledEdges ?? []));
  let visitedNodes = $derived.by(() => {
    const visited = new Set<number>();
    if (!snapshot) return visited;
    for (const node of snapshot.board.nodes) {
      if (
        node.kind === "normal" &&
        snapshot.board.adjacency[node.id].some((neighborId) =>
          filledEdges.has(edgeKey(node.id, neighborId)),
        )
      ) {
        visited.add(node.id);
      }
    }
    return visited;
  });

  onMount(() => () => {
    game.stop();
    clearCountdown();
  });
  function clearCountdown(): void {
    if (countdownInterval !== null) {
      window.clearInterval(countdownInterval);
      countdownInterval = null;
    }
    countdown = null;
  }

  function startCountdown(): void {
    if (countdownInterval !== null) return;
    countdown = 3;
    countdownInterval = window.setInterval(() => {
      if (countdown === null) return;
      if (countdown > 1) {
        countdown -= 1;
        return;
      }
      clearCountdown();
      game.start();
    }, 1000);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.code === "Space") {
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      if (countdown !== null || snapshot?.status === "playing") return;
      startCountdown();
      return;
    }

    if (countdown !== null || snapshot?.status !== "playing") return;
    const direction = directionByKey[event.key.toLowerCase()];
    if (!direction) return;
    if (event.key.startsWith("Arrow")) event.preventDefault();
    game.move(direction);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-[100dvh] bg-black p-[3px] text-neutral-100">
  <section
    class="traceroute-stage relative isolate mx-auto w-full max-w-[1000px] overflow-hidden bg-black"
  >
    <div class="absolute inset-0 flex flex-col items-center justify-center px-1">
      <div class="traceroute-board-frame relative w-full max-w-[1000px]">
        {#if snapshot && countdown === null}
          <svg
            viewBox="0 0 1000 460"
            width="1000"
            height="460"
            class:dimmed={snapshot.status !== "playing"}
            class="traceroute-board"
            role="img"
            aria-labelledby="traceroute-board-title traceroute-board-description"
          >
            <title id="traceroute-board-title">Traceroute</title>
            <desc id="traceroute-board-description">
              A six-row, twelve-column network. Use WASD or the arrow keys to follow connected links
              from SRC to DST.
            </desc>

            <g aria-hidden="true">
              {#each snapshot.board.nodes as node (node.id)}
                {#each snapshot.board.adjacency[node.id] as neighborId (neighborId)}
                  {#if neighborId > node.id}
                    {@const start = pointPositions[node.id]}
                    {@const end = pointPositions[neighborId]}
                    <line
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      class:traversed={filledEdges.has(edgeKey(node.id, neighborId))}
                      class="connection"
                    />
                  {/if}
                {/each}
              {/each}

              {#each snapshot.board.nodes as node (node.id)}
                {@const point = pointPositions[node.id]}
                {@const halfSize = node.kind === "src" || node.kind === "dst" ? 18 : 15}
                {#if node.kind === "ids"}
                  {@const diamondHalfSize = halfSize * Math.SQRT2}
                  <polygon
                    points="
                      {point.x},{point.y - diamondHalfSize}
                      {point.x + diamondHalfSize},{point.y}
                      {point.x},{point.y + diamondHalfSize}
                      {point.x - diamondHalfSize},{point.y}
                    "
                    class="blocker-point"
                  />
                {:else}
                  <rect
                    x={point.x - halfSize}
                    y={point.y - halfSize}
                    width={halfSize * 2}
                    height={halfSize * 2}
                    class:source-point={node.kind === "src"}
                    class:destination-point={node.kind === "dst"}
                    class:visited-point={visitedNodes.has(node.id)}
                    class="normal-point"
                  />
                {/if}
                {#if node.id === snapshot.currentNodeId}
                  {#if node.kind === "ids"}
                    {@const markerHalfSize = 24}
                    <polygon
                      points="
                        {point.x},{point.y - markerHalfSize}
                        {point.x + markerHalfSize},{point.y}
                        {point.x},{point.y + markerHalfSize}
                        {point.x - markerHalfSize},{point.y}
                      "
                      class="current-marker"
                    />
                  {:else}
                    <rect
                      x={point.x - 24}
                      y={point.y - 24}
                      width="48"
                      height="48"
                      class="current-marker"
                    />
                  {/if}
                {/if}
                <text
                  x={point.x}
                  y={point.y + 4}
                  class:terminal-label={node.kind !== "normal"}
                  class="point-label"
                >
                  {node.label}
                </text>
              {/each}
            </g>
          </svg>
        {/if}
        {#if countdown !== null}
          <div
            class="absolute inset-0 flex flex-col items-center justify-center gap-3 font-mono uppercase tracking-widest"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span class="text-5xl font-bold text-white tabular-nums">{countdown}</span>
            <span class="text-xs font-medium text-neutral-500">TRACE STARTING</span>
          </div>
        {/if}
      </div>
      {#if countdown === null && (snapshot === null || snapshot.status !== "playing")}
        <div
          class="mt-3 flex items-center justify-center gap-1.5"
          role="group"
          aria-label="Difficulty"
        >
          {#each tierOptions as tier (tier.value)}
            <button
              type="button"
              class="traceroute-tier-button"
              class:selected={game.selectedTier === tier.value}
              aria-pressed={game.selectedTier === tier.value}
              onclick={() => game.setTier(tier.value)}
            >
              {tier.label} <span class="text-neutral-600">{tier.range}</span>
            </button>
          {/each}
        </div>
      {/if}

      <div
        class="mt-3.5 flex min-h-8 w-full items-center justify-center px-4"
        aria-live="polite"
        aria-atomic="true"
      >
        {#if countdown === null && snapshot?.status === "won"}
          <span
            class="px-3.5 py-1 bg-emerald-400 text-black text-sm md:text-base font-semibold italic uppercase leading-none rounded-none shadow-lg"
          >
            TRACE COMPLETE
          </span>
        {:else if countdown === null && snapshot?.status === "lost" && snapshot.lossReason === "time"}
          <span
            class="px-3.5 py-1 bg-red-500 text-black text-sm md:text-base font-semibold italic uppercase leading-none rounded-none shadow-lg"
          >
            TRACE FAILED — TIME EXPIRED
          </span>
        {:else if countdown === null && snapshot?.status === "lost" && snapshot.lossReason === "ids"}
          <span
            class="px-3.5 py-1 bg-red-500 text-black text-sm md:text-base font-semibold italic uppercase leading-none rounded-none shadow-lg"
          >
            TRACE FAILED — IDS DETECTED
          </span>
        {:else if countdown === null && snapshot?.status === "lost"}
          <span
            class="px-3.5 py-1 bg-red-500 text-black text-sm md:text-base font-semibold italic uppercase leading-none rounded-none shadow-lg"
          >
            TRACE FAILED — TTL EXHAUSTED
          </span>
        {:else if countdown === null && snapshot === null}
          <button type="button" class={promptClass} onclick={startCountdown}>
            PRESS SPACE TO START
          </button>
        {:else if countdown !== null}
          <span class="sr-only">TRACE STARTING</span>
        {:else}
          <span class="sr-only">TRACE IN PROGRESS</span>
        {/if}
      </div>
      <div class="mt-2 flex min-h-6 w-full items-center justify-center">
        {#if countdown === null && snapshot && snapshot.status !== "playing"}
          <button type="button" class={promptClass} onclick={startCountdown}>
            PRESS SPACE TO RESTART
          </button>
        {/if}
      </div>
    </div>

    <div
      class="absolute bottom-20 left-4 right-4 grid w-auto translate-x-0 grid-cols-2 gap-2 text-center text-[11px] font-bold italic uppercase tracking-wider text-white select-none pointer-events-none md:bottom-6 md:left-1/2 md:right-auto md:w-max md:-translate-x-1/2 md:gap-10"
      role="group"
      aria-label="Round counters"
    >
      <div class="flex min-w-0 items-center justify-center gap-1 md:min-w-[5.5rem] md:gap-1.5">
        <span class="text-neutral-500">TTL</span>
        <span class="text-sm font-mono tabular-nums">
          {#if countdown === null && snapshot}{snapshot.remainingTTL}{:else}--{/if}
        </span>
      </div>
      <div class="flex min-w-0 items-center justify-center gap-1 md:min-w-[5.5rem] md:gap-1.5">
        <span class="text-neutral-500">TIME</span>
        <span class="text-sm font-mono tabular-nums">
          {#if countdown === null && snapshot}{Math.ceil(
              snapshot.remainingMs / 1000,
            )}s{:else}--{/if}
        </span>
      </div>
    </div>
  </section>
</div>

<style>
  .traceroute-stage {
    min-height: calc(100dvh - 6px);
  }

  @media (min-width: 768px) {
    .traceroute-stage {
      width: min(100%, calc(100vw - 300px));
    }
  }

  .traceroute-tier-button {
    border: 1px solid #333;
    background: transparent;
    padding: 0.25rem 0.5rem;
    color: #737373;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    transition:
      color 120ms ease,
      border-color 120ms ease;
  }

  .traceroute-tier-button:hover,
  .traceroute-tier-button:focus-visible {
    border-color: #aaa;
    color: #fff;
  }

  .traceroute-tier-button:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  .traceroute-tier-button.selected {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  .traceroute-board-frame {
    aspect-ratio: 1000 / 460;
  }
  .traceroute-board {
    display: block;
    box-sizing: border-box;
    width: 100%;
    height: auto;
    background: #050505;
    transition: opacity 180ms ease;
  }

  .traceroute-board.dimmed {
    opacity: 0.8;
  }

  .connection {
    stroke: #383838;
    stroke-width: 2.5;
    transition:
      stroke 120ms ease,
      stroke-width 120ms ease;
  }

  .connection.traversed {
    stroke: var(--color-accent);
    stroke-width: 5;
    filter: drop-shadow(0 0 4px color-mix(in srgb, var(--color-accent) 45%, transparent));
  }

  .normal-point {
    fill: #080808;
    stroke: #414141;
    stroke-width: 2;
  }

  .normal-point.visited-point {
    fill: color-mix(in srgb, var(--color-accent) 20%, #050505);
    stroke: var(--color-accent);
    stroke-width: 3;
  }

  .source-point {
    fill: color-mix(in srgb, var(--color-accent) 20%, #050505);
    stroke: var(--color-accent);
    stroke-width: 3;
  }

  .destination-point {
    fill: #422006;
    stroke: #facc15;
    stroke-width: 3;
  }

  .blocker-point {
    fill: #450a0a;
    stroke: #ef4444;
    stroke-width: 2;
  }

  .current-marker {
    fill: none;
    stroke: #f8fafc;
    stroke-width: 2;
    stroke-dasharray: 3 4;
  }

  .point-label {
    fill: #a3a3a3;
    font-family: inherit;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-anchor: middle;
    pointer-events: none;
  }

  .point-label.terminal-label {
    fill: #f8fafc;
    font-size: 9px;
  }

  @media (max-width: 767px) {
    .point-label {
      font-size: 20px;
    }

    .point-label.terminal-label {
      font-size: 18px;
    }
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    .point-label {
      font-size: 14px;
    }

    .point-label.terminal-label {
      font-size: 12px;
    }
  }
</style>
