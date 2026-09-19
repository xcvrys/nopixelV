import type { ActiveConnection } from "$lib/engine/machinery";
export class MachineryUiStore {
  public openActionsNodeId = $state<string | null>(null);
  public activeConnection = $state<ActiveConnection | null>(null);

  public toggleActions(nodeId: string): void {
    this.openActionsNodeId = this.openActionsNodeId === nodeId ? null : nodeId;
  }
  public startConnection(connection: ActiveConnection): void {
    this.activeConnection = connection;
  }

  public endConnection(): void {
    this.activeConnection = null;
  }

  public closeActions(): void {
    this.openActionsNodeId = null;
  }

  public isActionsOpen(nodeId: string): boolean {
    return this.openActionsNodeId === nodeId;
  }
}

export const machineryUiStore = new MachineryUiStore();
