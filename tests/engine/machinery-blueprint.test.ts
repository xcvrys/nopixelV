import { describe, expect, it } from "vitest";
import { importBlueprint } from "../../src/lib/engine/machinery";

describe("machinery blueprints", () => {
  it("rejects malformed JSON without partial data", () => {
    expect(importBlueprint('{"nodes":[{}],"edges":[]}')).toEqual({ ok: false });
    expect(importBlueprint("not-json")).toEqual({ ok: false });
  });
});
