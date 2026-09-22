import { describe, expect, it } from "vitest";
import {
  getConnectionFromHandle,
  getHandleConnectionState,
  isHandleOccupied,
  toConnectionInput,
  type ActiveConnection,
  type MachineryEdge,
} from "../../src/lib/engine/machinery";

const edges: MachineryEdge[] = [
  {
    id: "edge-1",
    source: "source",
    sourceHandle: "iron_ingot",
    target: "target",
    targetHandle: "iron_ingot",
  },
];

const sourceStart: ActiveConnection = {
  nodeId: "source",
  handleId: "iron_ingot",
  handleType: "source",
};

describe("machinery connection utilities", () => {
  it("normalizes complete flow connections and rejects incomplete ones", () => {
    expect(
      toConnectionInput({
        source: "source",
        sourceHandle: "iron_ingot",
        target: "target",
        targetHandle: "iron_ingot",
      }),
    ).toEqual({
      source: "source",
      sourceHandle: "iron_ingot",
      target: "target",
      targetHandle: "iron_ingot",
    });
    expect(toConnectionInput({ source: "source" })).toBeNull();
  });

  it("checks source and target handle occupancy", () => {
    expect(isHandleOccupied(edges, "source", "source", "iron_ingot")).toBe(true);
    expect(isHandleOccupied(edges, "target", "target", "iron_ingot")).toBe(true);
    expect(isHandleOccupied(edges, "target", "source", "iron_ingot")).toBe(false);
  });

  it("normalizes a target-started connection into source-to-target order", () => {
    expect(
      getConnectionFromHandle(
        { nodeId: "target", handleId: "iron_ingot", handleType: "target" },
        { nodeId: "source", handleId: "iron_ingot", handleType: "source" },
      ),
    ).toEqual({
      source: "source",
      sourceHandle: "iron_ingot",
      target: "target",
      targetHandle: "iron_ingot",
    });
  });

  it("marks only compatible handles during a connection", () => {
    expect(
      getHandleConnectionState([], sourceStart, {
        nodeId: "source",
        handleId: "iron_ingot",
        handleType: "source",
      }),
    ).toMatchObject({ inProgress: true, isStart: true, isCompatible: false });
    expect(
      getHandleConnectionState([], sourceStart, {
        nodeId: "target",
        handleId: "iron_ingot",
        handleType: "target",
      }).isCompatible,
    ).toBe(true);
    expect(
      getHandleConnectionState([], sourceStart, {
        nodeId: "source",
        handleId: "iron_ingot",
        handleType: "target",
      }).isCompatible,
    ).toBe(false);
  });
  it("accepts a candidate that closes a feedback loop", () => {
    const cycleEdges: MachineryEdge[] = [
      {
        id: "a-b",
        source: "a",
        sourceHandle: "iron_ingot",
        target: "b",
        targetHandle: "iron_ingot",
      },
      {
        id: "b-c",
        source: "b",
        sourceHandle: "iron_ingot",
        target: "c",
        targetHandle: "iron_ingot",
      },
    ];
    expect(
      getHandleConnectionState(
        cycleEdges,
        { nodeId: "c", handleId: "iron_ingot", handleType: "source" },
        { nodeId: "a", handleId: "iron_ingot", handleType: "target" },
      ),
    ).toMatchObject({ inProgress: true, isCompatible: true });
  });
});
