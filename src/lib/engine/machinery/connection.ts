import { canConnect } from "./graph";
import type { ConnectionInput, MachineryEdge } from "./types";
import type { ResourceType } from "./schema/port";

export type HandleType = "source" | "target";

export type ActiveConnection = {
  nodeId: string;
  handleId: string;
  handleType: HandleType;
  resourceType?: ResourceType;
};

export type HandleRef = {
  nodeId: string;
  handleId: string;
  handleType: HandleType;
  resourceType?: ResourceType;
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
  resourceType?: ResourceType;
  flowRate?: number;
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
    ...(connection.resourceType ? { resourceType: connection.resourceType } : {}),
    ...(connection.flowRate !== undefined ? { flowRate: connection.flowRate } : {}),
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

export function isHandleAvailable(
  edges: MachineryEdge[],
  nodeId: string,
  handleType: HandleType,
  handleId: string,
  connectable = true,
): boolean {
  return connectable && !isHandleOccupied(edges, nodeId, handleType, handleId);
}

export function getHandleUiClass(
  handleType: HandleType,
  handleId: string,
  nodeId: string,
  activeConnection: ActiveConnection | null,
  isCompatible: boolean,
  isConnected?: boolean,
): string {
  const classes: string[] = [];
  if (isConnected !== undefined) {
    classes.push(isConnected ? "connection-connected" : "connection-available");
  }
  if (activeConnection) {
    classes.push("connection-in-progress");
    if (
      activeConnection.nodeId === nodeId &&
      activeConnection.handleId === handleId &&
      activeConnection.handleType === handleType
    ) {
      classes.push("connection-start");
    }
    if (isCompatible) {
      classes.push("connection-compatible");
    }
  }
  return classes.join(" ");
}

export function getConnectionFromHandle(
  active: ActiveConnection,
  candidate: HandleRef,
): ConnectionInput | null {
  if (active.nodeId === candidate.nodeId) return null;
  if (active.handleType === candidate.handleType) return null;
  if (
    active.resourceType &&
    candidate.resourceType &&
    active.resourceType !== candidate.resourceType
  ) {
    return null;
  }

  const resourceType = active.resourceType ?? candidate.resourceType;
  const connection =
    active.handleType === "source"
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
  return resourceType ? { ...connection, resourceType } : connection;
}

export function isCompatibleHandle(
  edges: MachineryEdge[],
  active: ActiveConnection,
  candidate: HandleRef,
): boolean {
  if (
    active.resourceType &&
    candidate.resourceType &&
    active.resourceType !== candidate.resourceType
  ) {
    return false;
  }
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
