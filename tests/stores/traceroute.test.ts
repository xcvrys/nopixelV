import { afterEach, describe, expect, it, vi } from "vitest";
import type { DifficultyTier } from "../../src/lib/engine/traceroute/types";
import { TracerouteStore } from "../../src/lib/stores/traceroute.svelte";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TracerouteStore difficulty selection", () => {
  it("defaults to Mid", () => {
    expect(new TracerouteStore().selectedTier).toBe("mid");
  });

  it.each([
    { tier: "short", minimum: 18, maximum: 21 },
    { tier: "mid", minimum: 22, maximum: 26 },
    { tier: "long", minimum: 27, maximum: 30 },
  ] satisfies { tier: DifficultyTier; minimum: number; maximum: number }[])(
    "starts a $tier round within its route-length window",
    ({ tier, minimum, maximum }) => {
      vi.stubGlobal("crypto", {
        getRandomValues: (values: Uint32Array) => {
          values[0] = 0;
          return values;
        },
      });
      vi.stubGlobal("window", {
        setInterval: () => 1,
        clearInterval: () => undefined,
      });

      const store = new TracerouteStore();
      store.setTier(tier);
      store.start();

      expect(store.snapshot?.status).toBe("playing");
      expect(store.snapshot?.board.initialTTL).toBeGreaterThanOrEqual(minimum);
      expect(store.snapshot?.board.initialTTL).toBeLessThanOrEqual(maximum);
      store.stop();
    },
  );
});
