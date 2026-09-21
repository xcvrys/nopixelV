import type { MachineType } from "$lib/data/types";
import {
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
import { MachineryEngineStore, MachineryLayoutStore } from "$lib/stores/machinery";
import type { MachineryWorkflowRecord } from "$lib/db/machinery";

export type SavedWorkflow = MachineryWorkflowRecord;
export const MAX_WORKFLOW_NAME_LENGTH = 40;

function sameNodeTopology(previous: MachineryNode[], next: MachineryNode[]): boolean {
  return (
    previous.length === next.length &&
    previous.every((node, index) => {
      const candidate = next[index];
      return (
        candidate !== undefined &&
        node.id === candidate.id &&
        node.type === candidate.type &&
        node.data === candidate.data
      );
    })
  );
}

export class MachineryStore {
  private readonly engineStore = new MachineryEngineStore();
  private readonly layoutStore = new MachineryLayoutStore();

  public get nodes(): MachineryNode[] {
    return this.engineStore.nodes.map((node) => ({
      ...node,
      position: this.layoutStore.getPosition(node.id) ?? node.position,
    }));
  }

  public set nodes(nodes: MachineryNode[]) {
    this.setNodes(nodes);
  }

  public get edges(): MachineryEdge[] {
    return this.engineStore.edges;
  }

  public set edges(edges: MachineryEdge[]) {
    this.engineStore.edges = edges;
  }

  public get calculationResult() {
    return this.engineStore.calculationResult;
  }

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
      machineryUiStore.setPowerRequired(workflow.powerRequired !== false);
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
        ? createEnergyNode(position, this.engineStore.nodes.length)
        : createMachineNode(type, position, this.engineStore.nodes.length);
    this.engineStore.nodes = [...this.engineStore.nodes, node];
    this.layoutStore.setPosition(node.id, node.position);
    this.markChanged();
    return node.id;
  }

  public addTextNode(text = "Text", position?: Position): string {
    const node = createTextNode(text, position);
    this.engineStore.nodes = [...this.engineStore.nodes, node];
    this.layoutStore.setPosition(node.id, node.position);
    this.markChanged();
    return node.id;
  }

  public updateTextNode(id: string, text: string): void {
    this.engineStore.nodes = this.engineStore.nodes.map((node) =>
      node.id === id && node.type === "text" ? { ...node, data: { text } } : node,
    );
    this.markChanged();
  }

  public removeNode(id: string): void {
    const graph = removeNode(this.engineStore.nodes, this.engineStore.edges, id);
    this.engineStore.nodes = graph.nodes;
    this.engineStore.edges = graph.edges;
    this.layoutStore.removePosition(id);
    this.markChanged();
  }

  public updateNodeData(id: string, updates: MachineryNodeDataUpdate): void {
    this.engineStore.nodes = updateNodeData(this.engineStore.nodes, id, updates);
    this.engineStore.edges = sanitizeEdges(this.engineStore.nodes, this.engineStore.edges);
    this.markChanged();
  }

  public canConnect(connection: ConnectionInput): boolean {
    return canConnect(this.engineStore.edges, connection);
  }

  public connect(connection: ConnectionInput): void {
    const nextEdges = connectEdge(this.engineStore.edges, connection);
    if (nextEdges === this.engineStore.edges) return;
    this.engineStore.edges = nextEdges;
    this.markChanged();
  }

  public removeEdge(id: string): void {
    this.engineStore.edges = removeEdge(this.engineStore.edges, id);
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
    this.layoutStore.setPositions(this.nodes.map((node) => [node.id, node.position] as const));
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

  private setNodes(nodes: MachineryNode[]): void {
    this.layoutStore.setPositions(nodes.map((node) => [node.id, node.position] as const));
    if (!sameNodeTopology(this.engineStore.nodes, nodes)) this.engineStore.nodes = nodes;
  }

  private replaceGraph(nodes: MachineryNode[], edges: MachineryEdge[]): void {
    this.engineStore.nodes = nodes;
    this.engineStore.edges = edges;
    this.layoutStore.setPositions(nodes.map((node) => [node.id, node.position] as const));
  }

  private markChanged(): void {
    this.mutationRevision += 1;
    this.workflowStore.markChanged();
  }
}

export const machineryStore = new MachineryStore();
