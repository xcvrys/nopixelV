import { describe, expect, it } from "vitest";
import {
  exportBlueprint,
  importBlueprint,
  type MachineryNode,
} from "../../src/lib/engine/machinery";

const nodes: MachineryNode[] = [
  {
    id: "machine-1",
    type: "machine",
    position: { x: 10, y: 20 },
    data: { machineType: "furnace", name: "Furnace", recipeId: "smelt_iron_scrap" },
  },
];

describe("machinery blueprints", () => {
  it("round-trips graph data and workflow name", () => {
    const result = importBlueprint(exportBlueprint("Iron Line", nodes, []));
    expect(result).toEqual({ ok: true, name: "Iron Line", nodes, edges: [] });
  });

  it("rejects malformed JSON without partial data", () => {
    expect(importBlueprint('{"nodes":[{}],"edges":[]}')).toEqual({ ok: false });
    expect(importBlueprint("not-json")).toEqual({ ok: false });
  });
});
