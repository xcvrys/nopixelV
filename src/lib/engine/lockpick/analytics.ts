/**
 * Cadence analytics for a lockpick run.
 *
 * A run is stored as tap counts in fixed time buckets rather than as
 * individual tap timestamps. Bounding the trace by time instead of by tap
 * count means a one-minute run and a one-hour run cost the same to keep and
 * the same to draw, and the sliding window becomes a prefix-sum lookup
 * instead of a scan over a list that never stops growing.
 */

/** Width of one bucket. Cadence resolves to 1 cps steps. */
export const BUCKET_SECONDS = 0.25;

/**
 * Ceiling on trace length: 2400 buckets is 10 minutes of run.
 * ponytail: past this the chart stops extending. Coarsen BUCKET_SECONDS
 * instead of growing this if runs ever need to cover more.
 */
export const MAX_BUCKETS = 2400;

/** Width of the sliding window the cadence is measured over. */
export const CPS_WINDOW_SECONDS = 1;

export type CpsPoint = { t: number; cps: number };

export type CpsTrace = {
  /** Tap count per bucket, oldest first. */
  buckets: number[];
  /** Seconds covered by the run. */
  duration: number;
  /** True when the run outgrew `MAX_BUCKETS` and later taps were dropped. */
  truncated: boolean;
};

/**
 * Buckets a tap, padding any gap. Returns false once the ceiling is reached,
 * which is what stops a long run from growing without bound.
 */
export function bucketTap(
  buckets: number[],
  t: number,
  bucketSeconds: number = BUCKET_SECONDS,
  ceiling: number = MAX_BUCKETS,
): boolean {
  const index = Math.floor(t / bucketSeconds);
  if (index < 0 || index >= ceiling) return false;
  while (buckets.length <= index) buckets.push(0);
  buckets[index] += 1;
  return true;
}

/** Average cadence of a run, and the measure a best trace is ranked by. */
export function traceCps(trace: CpsTrace): number {
  if (trace.duration <= 0) return 0;
  let taps = 0;
  for (const count of trace.buckets) taps += count;
  return taps / trace.duration;
}

/**
 * Columns to draw for a run of `durationSeconds`: one per bucket, capped at
 * the plot width. Sampling finer than the recording invents detail that is
 * not there, and repeating each bucket several times draws a staircase of
 * vertical lines instead of a line.
 *
 * Deriving this from elapsed time rather than from the bucket count is what
 * keeps the trace still: every column lands on the same absolute instant no
 * matter how far the run has progressed, so a new bucket extends the line
 * instead of rescaling the points already drawn.
 */
export function chartColumns(durationSeconds: number, maxWidth: number): number {
  if (durationSeconds <= 0) return 0;
  return Math.min(maxWidth, Math.ceil(durationSeconds / BUCKET_SECONDS));
}

/** Points averaged either side of each sample when drawing. */
export const SMOOTH_WINDOW = 3;

/**
 * Light moving average across the drawn points. A one-second window at a
 * typical cadence can only report a whole number of taps, so the raw series
 * steps; averaging three points softens that without moving any point in
 * time or flattening a real burst. Display only — the buckets stay exact.
 */
export function smoothSeries(
  points: readonly CpsPoint[],
  windowSize: number = SMOOTH_WINDOW,
): CpsPoint[] {
  if (windowSize < 2 || points.length === 0) return [...points];
  const half = Math.floor(windowSize / 2);
  return points.map((point, index) => {
    const from = Math.max(0, index - half);
    const to = Math.min(points.length, index + half + 1);
    let sum = 0;
    for (let i = from; i < to; i++) sum += points[i].cps;
    return { t: point.t, cps: sum / (to - from) };
  });
}

/**
 * Instantaneous clicks per second over a sliding window, sampled at the
 * column edges plus the run's final instant. Prefix sums make every sample
 * O(1), so the cost is O(buckets + columns) however long the run was.
 *
 * The window is always the full width, so a run younger than the window
 * under-reports its rate rather than spiking at the origin.
 */
export function cpsSeries(
  trace: CpsTrace,
  columns: number,
  windowSeconds: number = CPS_WINDOW_SECONDS,
): CpsPoint[] {
  const { buckets, duration } = trace;
  if (buckets.length === 0 || duration <= 0 || columns < 1) return [];

  const prefix: number[] = [0];
  for (const count of buckets) prefix.push((prefix[prefix.length - 1] ?? 0) + count);

  const windowBuckets = Math.max(1, Math.round(windowSeconds / BUCKET_SECONDS));
  const points: CpsPoint[] = [];
  // Left edges plus a closing instant, so the trace starts at t=0 and still
  // reaches the end of the run. Sampling right edges instead would leave the
  // first point a whole column in from the axis origin.
  for (let column = 0; column <= columns; column += 1) {
    const t = (column / columns) * duration;
    const endBucket = Math.ceil(t / BUCKET_SECONDS);
    const startBucket = Math.max(0, endBucket - windowBuckets);
    // Read past the end of the recording as zero, so a run that keeps going
    // after the last tap decays instead of re-reading the trailing buckets.
    const end = prefix[Math.min(buckets.length, endBucket)] ?? 0;
    const taps = end - (prefix[Math.min(buckets.length, startBucket)] ?? 0);
    points.push({ t, cps: taps / windowSeconds });
  }
  return points;
}
