<script lang="ts">
  import {
    chartColumns,
    cpsSeries,
    smoothSeries,
    traceCps,
    type CpsTrace,
  } from "$lib/engine/lockpick";

  interface Props {
    buckets: number[];
    duration: number;
    best: CpsTrace | null;
    truncated: boolean;
  }

  const { buckets, duration, best, truncated }: Props = $props();

  const WIDTH = 600;
  const HEIGHT = 104;
  const PAD_X = 4;
  const PAD_Y = 8;

  const current: CpsTrace = $derived({ buckets, duration, truncated });
  const currentSeries = $derived(smoothSeries(cpsSeries(current, chartColumns(duration, WIDTH))));
  const reference = $derived(
    best ? smoothSeries(cpsSeries(best, chartColumns(best.duration, WIDTH))) : [],
  );
  /** Shared seconds axis. Constant while a run stays under the best, so the
   * trace holds still and only grows to the right. */
  const axis = $derived(Math.max(duration, best?.duration ?? 0));
  const peak = $derived(
    Math.max(
      4,
      Math.ceil(Math.max(0, ...currentSeries.map((p) => p.cps), ...reference.map((p) => p.cps))),
    ),
  );
  const bestCps = $derived(best ? traceCps(best) : 0);

  // Both traces share one seconds axis, so a growing run extends to the right
  // instead of rescaling the points already drawn.
  function toPath(points: { t: number; cps: number }[], totalSeconds: number): string {
    if (points.length === 0 || totalSeconds <= 0) return "";
    return points
      .map((point, index) => {
        const x = PAD_X + (point.t / totalSeconds) * (WIDTH - PAD_X * 2);
        const y = HEIGHT - PAD_Y - (point.cps / peak) * (HEIGHT - PAD_Y * 2);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const currentPath = $derived(toPath(currentSeries, axis));
  const referencePath = $derived(toPath(reference, axis));
  const baseline = HEIGHT - PAD_Y;
</script>

<div class="w-full max-w-lg select-none">
  <div
    class="flex items-baseline justify-between text-[10px] font-bold italic tracking-widest text-neutral-500 uppercase"
  >
    <span>Tap cadence</span>
    <span>
      {currentSeries.length > 0 ? `${peak} cps peak` : "tap to plot"}
      {#if truncated}
        <span class="text-neutral-600">· capped</span>
      {/if}
    </span>
  </div>

  <svg viewBox="0 0 {WIDTH} {HEIGHT}" preserveAspectRatio="none" class="mt-1.5 h-24 w-full">
    <rect
      x={PAD_X}
      y={PAD_Y}
      width={WIDTH - PAD_X * 2}
      height={HEIGHT - PAD_Y * 2}
      fill="#050505"
    />
    <line
      x1={PAD_X}
      y1={baseline - (HEIGHT - PAD_Y * 2) / 2}
      x2={WIDTH - PAD_X}
      y2={baseline - (HEIGHT - PAD_Y * 2) / 2}
      stroke="#1a1a1a"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <line
      x1={PAD_X}
      y1={baseline}
      x2={WIDTH - PAD_X}
      y2={baseline}
      stroke="#262626"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />

    {#if referencePath}
      <path
        d={referencePath}
        fill="none"
        stroke="#525252"
        stroke-width="1"
        stroke-dasharray="4 3"
        vector-effect="non-scaling-stroke"
      />
    {/if}
    {#if currentPath}
      <path
        d={currentPath}
        fill="none"
        stroke="#34d399"
        stroke-width="1.5"
        vector-effect="non-scaling-stroke"
      />
    {/if}
  </svg>

  <div
    class="mt-1 flex items-baseline justify-between text-[10px] font-bold italic tracking-widest text-neutral-600 uppercase"
  >
    <span>0s</span>
    <span>{axis > 0 ? `${axis.toFixed(1)}s` : ""}</span>
    <span>{best ? `best ${bestCps.toFixed(1)} cps · ${best.duration.toFixed(1)}s` : ""}</span>
  </div>
</div>
