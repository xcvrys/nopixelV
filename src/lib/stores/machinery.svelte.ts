import type { MachineType } from "$lib/data/types";
import {
  calculateMachinery,
  canConnect,
  connectEdge,
  createEnergyNode,
  createMachineNode,
  createTextNode,
  exportBlueprint,
  importBlueprint,
  removeEdge,
  removeNode,
  sanitizeEdges,
  updateNodeData,
  type ConnectionInput,
  type MachineryNodeDataUpdate,
  type MachineryEdge,
  type MachineryNode,
  type Position,
} from "$lib/engine/machinery";
import { MachineryWorkflowStore } from "$lib/stores/machinery-workflows.svelte";
import { machineryUiStore } from "$lib/stores/machinery-ui.svelte";
import type { MachineryWorkflowRecord } from "$lib/db/machinery";

export type SavedWorkflow = MachineryWorkflowRecord;
export const MAX_WORKFLOW_NAME_LENGTH = 40;

export class MachineryStore {
  public nodes = $state.raw<MachineryNode[]>([]);
  public edges = $state.raw<MachineryEdge[]>([]);
  public calculationResult = $derived(calculateMachinery(this.nodes, this.edges));

  public get imagesVisible(): boolean {
    return machineryUiStore.imagesVisible;
  }

  public get powerRequired(): boolean {
    return machineryUiStore.powerRequired;
  }

  private mutationRevision = 0;
  private workflowStore = new MachineryWorkflowStore({
    getGraph: () => ({
      nodes: this.nodes,
      edges: this.edges,
      imagesVisible: machineryUiStore.imagesVisible,
      powerRequired: machineryUiStore.powerRequired,
    }),
    getRevision: () => this.mutationRevision,
    applyWorkflow: (workflow) => {
      machineryUiStore.setImagesVisible(workflow.imagesVisible !== false);
      machineryUiStore.setPowerRequired();
      this.replaceGraph(workflow.nodes, workflow.edges);
    },
  });

  public get savedWorkflows(): SavedWorkflow[] {
    return this.workflowStore.savedWorkflows;
  }

  public get activeWorkflowId(): string | null {
    return this.workflowStore.activeWorkflowId;
  }

  public get activeWorkflowName(): string {
    return this.workflowStore.activeWorkflowName;
  }

  public get persistenceError(): string | null {
    return this.workflowStore.persistenceError;
  }

  public initialize(): Promise<void> {
    return this.workflowStore.initialize();
  }

  public newWorkflow(): Promise<void> {
    return this.workflowStore.newWorkflow();
  }

  public addMachine(type: MachineType, position?: Position): string {
    const node =
      type === "fabricator"
        ? createEnergyNode(position, this.nodes.length)
        : createMachineNode(type, position, this.nodes.length);
    this.nodes = [...this.nodes, node];
    this.markChanged();
    return node.id;
  }

  public addTextNode(text = "Text", position?: Position): string {
    const node = createTextNode(text, position);
    this.nodes = [...this.nodes, node];
    this.markChanged();
    return node.id;
  }

  public updateTextNode(id: string, text: string): void {
    this.nodes = this.nodes.map((node) =>
      node.id === id && node.type === "text" ? { ...node, data: { text } } : node,
    );
    this.markChanged();
  }

  public removeNode(id: string): void {
    const graph = removeNode(this.nodes, this.edges, id);
    this.nodes = graph.nodes;
    this.edges = graph.edges;
    this.markChanged();
  }

  public updateNodeData(id: string, updates: MachineryNodeDataUpdate): void {
    this.nodes = updateNodeData(this.nodes, id, updates);
    this.edges = sanitizeEdges(this.nodes, this.edges);
    this.markChanged();
  }

  public canConnect(connection: ConnectionInput): boolean {
    return canConnect(this.edges, connection);
  }

  public connect(connection: ConnectionInput): void {
    const nextEdges = connectEdge(this.edges, connection);
    if (nextEdges === this.edges) return;
    this.edges = nextEdges;
    this.markChanged();
  }

  public removeEdge(id: string): void {
    this.edges = removeEdge(this.edges, id);
    this.markChanged();
  }

  public renameWorkflow(name: string): void {
    this.workflowStore.renameWorkflow(name.slice(0, MAX_WORKFLOW_NAME_LENGTH));
  }

  public exportBlueprint(): string {
    return exportBlueprint(this.activeWorkflowName, this.nodes, this.edges);
  }

  public toggleImages(): void {
    machineryUiStore.toggleImages();
    this.markChanged();
  }
  public togglePowerRequired(): void {
    machineryUiStore.togglePowerRequired();
    this.markChanged();
  }

  public commitNodePositions(): void {
    this.nodes = this.nodes.map((node) => ({
      ...node,
      position: { ...node.position },
    }));
    this.markChanged();
  }

  public importBlueprint(json: string): boolean {
    const result = importBlueprint(json);
    if (!result.ok) return false;

    this.replaceGraph(result.nodes, result.edges);
    this.workflowStore.activeWorkflowName =
      result.name.trim().slice(0, MAX_WORKFLOW_NAME_LENGTH) || "Untitled Workflow";
    this.markChanged();
    return true;
  }

  public loadWorkflow(id: string): Promise<boolean> {
    return this.workflowStore.loadWorkflow(id);
  }

  public refreshWorkflows(): Promise<SavedWorkflow[]> {
    return this.workflowStore.refreshWorkflows();
  }

  public deleteWorkflow(id: string): Promise<void> {
    return this.workflowStore.deleteWorkflow(id);
  }

  public clearSavedWorkflows(): Promise<void> {
    return this.workflowStore.clearSavedWorkflows();
  }

  public flushPersistence(): Promise<void> {
    return this.workflowStore.flushPersistence();
  }

  private replaceGraph(nodes: MachineryNode[], edges: MachineryEdge[]): void {
    this.nodes = nodes;
    this.edges = edges;
  }
  private markChanged(): void {
    this.mutationRevision += 1;
    this.workflowStore.markChanged();
  }
}

export const machineryStore = new MachineryStore();
