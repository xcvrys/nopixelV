export class MachineryUiStore {
  public openActionsNodeId = $state<string | null>(null);

  public toggleActions(nodeId: string): void {
    this.openActionsNodeId = this.openActionsNodeId === nodeId ? null : nodeId;
  }

  public closeActions(): void {
    this.openActionsNodeId = null;
  }

  public isActionsOpen(nodeId: string): boolean {
    return this.openActionsNodeId === nodeId;
  }
}

export const machineryUiStore = new MachineryUiStore();
