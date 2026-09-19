import { canConnect } from "./graph";
import type { ConnectionInput, MachineryEdge } from "./types";

export type HandleType = "source" | "target";

export type ActiveConnection = {
  nodeId: string;
  handleId: string;
  handleType: HandleType;
};

export type HandleRef = {
  nodeId: string;
  handleId: string;
  handleType: HandleType;
};

export type HandleConnectionState = {
  inProgress: boolean;
  isStart: boolean;
  isCompatible: boolean;
};

type ConnectionLike = {
  source?: string | null;
  sourceHandle?: string | null;
  target?: string | null;
  targetHandle?: string | null;
};

export function toConnectionInput(connection: ConnectionLike): ConnectionInput | null {
  if (
    !connection.source ||
    !connection.target ||
    !connection.sourceHandle ||
    !connection.targetHandle
  ) {
    return null;
  }

  return {
    source: connection.source,
    sourceHandle: connection.sourceHandle,
    target: connection.target,
    targetHandle: connection.targetHandle,
  };
}

export function isHandleOccupied(
  edges: MachineryEdge[],
  nodeId: string,
  handleType: HandleType,
  handleId: string,
): boolean {
  return edges.some((edge) =>
    handleType === "source"
      ? edge.source === nodeId && edge.sourceHandle === handleId
      : edge.target === nodeId && edge.targetHandle === handleId,
  );
}

export function getConnectionFromHandle(
  active: ActiveConnection,
  candidate: HandleRef,
): ConnectionInput | null {
  if (active.nodeId === candidate.nodeId) return null;
  if (active.handleType === candidate.handleType) return null;

  return active.handleType === "source"
    ? {
        source: active.nodeId,
        sourceHandle: active.handleId,
        target: candidate.nodeId,
        targetHandle: candidate.handleId,
      }
    : {
        source: candidate.nodeId,
        sourceHandle: candidate.handleId,
        target: active.nodeId,
        targetHandle: active.handleId,
      };
}

export function isCompatibleHandle(
  edges: MachineryEdge[],
  active: ActiveConnection,
  candidate: HandleRef,
): boolean {
  const connection = getConnectionFromHandle(active, candidate);
  return connection !== null && canConnect(edges, connection);
}

export function getHandleConnectionState(
  edges: MachineryEdge[],
  active: ActiveConnection | null,
  candidate: HandleRef,
): HandleConnectionState {
  if (!active) {
    return { inProgress: false, isStart: false, isCompatible: false };
  }

  return {
    inProgress: true,
    isStart:
      active.nodeId === candidate.nodeId &&
      active.handleId === candidate.handleId &&
      active.handleType === candidate.handleType,
    isCompatible: isCompatibleHandle(edges, active, candidate),
  };
}
