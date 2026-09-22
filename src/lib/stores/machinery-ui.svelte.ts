import { getMachine } from "$lib/data/machines";
import { getRecipe } from "$lib/data/recipes";
import {
  isCompatibleHandle,
  type ActiveConnection,
  type HandleRef,
  type MachineryEdge,
  type MachineryNode,
  type Position,
} from "$lib/engine/machinery";

function getNodeHandleRefs(node: MachineryNode): HandleRef[] {
  if (node.type === "text") return [];
  const recipe = node.data.recipeId ? getRecipe(node.data.recipeId) : null;
  const handles: HandleRef[] = [
    ...(recipe?.inputs.map((input) => ({
      nodeId: node.id,
      handleId: input.itemId,
      handleType: "target" as const,
    })) ?? []),
    ...(recipe?.outputs.map((output) => ({
      nodeId: node.id,
      handleId: output.itemId,
      handleType: "source" as const,
    })) ?? []),
  ];
  if (node.type === "energy") {
    handles.push({ nodeId: node.id, handleId: "energy", handleType: "source" });
  } else {
    const machine = getMachine(node.data.machineType);
    if ((recipe?.powerCost ?? machine?.defaultPowerCost ?? 0) > 0) {
      handles.push({ nodeId: node.id, handleId: "energy", handleType: "target" });
    }
  }
  return handles;
}

export class MachineryUiStore {
  public openActionsNodeId = $state<string | null>(null);
  public recipePickerNodeId = $state<string | null>(null);
  public activeConnection = $state<ActiveConnection | null>(null);
  public compatibleHandleKeys = $state<Set<string>>(new Set());
  public imagesVisible = $state(true);
  public powerRequired = $state(false);
  public pendingConnection = $state<{
    connection: ActiveConnection;
    position: Position;
  } | null>(null);
  public toggleImages(): void {
    this.imagesVisible = !this.imagesVisible;
  }
  public setImagesVisible(imagesVisible: boolean): void {
    this.imagesVisible = imagesVisible;
  }
  public togglePowerRequired(): void {
    this.powerRequired = false;
  }

  public setPowerRequired(): void {
    this.powerRequired = false;
  }

  public startConnection(
    connection: ActiveConnection,
    nodes: MachineryNode[] = [],
    edges: MachineryEdge[] = [],
  ): void {
    this.activeConnection = connection;
    this.compatibleHandleKeys = new Set(
      nodes
        .flatMap(getNodeHandleRefs)
        .filter((candidate) => isCompatibleHandle(edges, connection, candidate))
        .map((candidate) => `${candidate.nodeId}:${candidate.handleId}`),
    );
    this.pendingConnection = null;
  }

  public isHandleCompatible(nodeId: string, handleId: string): boolean {
    return this.compatibleHandleKeys.has(`${nodeId}:${handleId}`);
  }
  public startPendingConnection(connection: ActiveConnection, position: Position): void {
    this.pendingConnection = { connection, position };
  }
  public endConnection(): void {
    this.activeConnection = null;
    this.compatibleHandleKeys = new Set();
    this.pendingConnection = null;
  }
  public cancelConnection(): void {
    this.activeConnection = null;
    this.compatibleHandleKeys = new Set();
    this.pendingConnection = null;
  }
  public closeActions(): void {
    this.openActionsNodeId = null;
  }
  public openRecipePicker(nodeId: string): void {
    this.recipePickerNodeId = nodeId;
  }
  public closeRecipePicker(): void {
    this.recipePickerNodeId = null;
  }
  public isActionsOpen(nodeId: string): boolean {
    return this.openActionsNodeId === nodeId;
  }
}

export const machineryUiStore = new MachineryUiStore();
