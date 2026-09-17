import { afterEach, describe, expect, it, vi } from "vitest";
import { detectInputMode } from "../../src/lib/input/device";

afterEach(() => vi.unstubAllGlobals());

describe("detectInputMode", () => {
  it("selects touch for a coarse primary pointer", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn<() => { matches: boolean }>(() => ({ matches: true })),
    });
    expect(detectInputMode()).toBe("touch");
  });

  it("selects keyboard for a fine primary pointer", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn<() => { matches: boolean }>(() => ({ matches: false })),
    });
    expect(detectInputMode()).toBe("keyboard");
  });

  it("selects keyboard when window is unavailable", () => {
    vi.stubGlobal("window", undefined);
    expect(detectInputMode()).toBe("keyboard");
  });
});
