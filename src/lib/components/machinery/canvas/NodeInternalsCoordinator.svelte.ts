export const NODE_INTERNALS_COORDINATOR_CONTEXT = Symbol("node-internals-coordinator");

export class NodeInternalsCoordinator {
  private pending = new Set<string>();
  private scheduled = false;

  constructor(private readonly updateFn: (nodeIds: string[]) => void) {}

  queue(nodeId: string): void {
    this.pending.add(nodeId);
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      const ids = [...this.pending];
      this.pending.clear();
      this.updateFn(ids);
    });
  }
}
