import type { ActiveConnection, Position } from "$lib/engine/machinery";

export class MachineryUiStore {
  public openActionsNodeId = $state<string | null>(null);
  public activeConnection = $state<ActiveConnection | null>(null);
  public imagesVisible = $state(true);
  public powerRequired = $state(true);
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
    this.powerRequired = !this.powerRequired;
  }

  public setPowerRequired(powerRequired: boolean): void {
    this.powerRequired = powerRequired;
  }

  public startConnection(connection: ActiveConnection): void {
    this.activeConnection = connection;
    this.pendingConnection = null;
  }

  public startPendingConnection(connection: ActiveConnection, position: Position): void {
    this.pendingConnection = { connection, position };
  }

  public endConnection(): void {
    this.activeConnection = null;
    this.pendingConnection = null;
  }

  public cancelConnection(): void {
    this.activeConnection = null;
    this.pendingConnection = null;
  }

  public closeActions(): void {
    this.openActionsNodeId = null;
  }

  public isActionsOpen(nodeId: string): boolean {
    return this.openActionsNodeId === nodeId;
  }
}

export const machineryUiStore = new MachineryUiStore();
