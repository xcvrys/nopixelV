import {
  clearMachineryDatabase,
  deleteMachineryWorkflow,
  getActiveMachineryWorkflow,
  getMachineryWorkflow,
  listMachineryWorkflows,
  setActiveMachineryWorkflow,
  setMachineryWorkflow,
  type MachineryWorkflowRecord,
} from "$lib/db/machinery";
import type { MachineryEdge, MachineryNode } from "$lib/engine/machinery";

export type WorkflowGraph = {
  nodes: MachineryNode[];
  edges: MachineryEdge[];
};

type WorkflowDraft = Pick<MachineryWorkflowRecord, "id" | "name" | "nodes" | "edges">;
type WorkflowCallbacks = {
  getGraph: () => WorkflowGraph;
  getRevision: () => number;
  applyWorkflow: (workflow: MachineryWorkflowRecord) => void;
};

const UNTITLED_WORKFLOW = "Untitled Workflow";

export class MachineryWorkflowStore {
  public savedWorkflows = $state.raw<MachineryWorkflowRecord[]>([]);
  public activeWorkflowId = $state<string | null>(null);
  public activeWorkflowName = $state(UNTITLED_WORKFLOW);
  public persistenceError = $state<string | null>(null);

  private initializationPromise: Promise<void> | null = null;
  private persistenceQueue = Promise.resolve();
  private persistTimer: ReturnType<typeof setTimeout> | undefined;

  public constructor(private readonly callbacks: WorkflowCallbacks) {}

  public async initialize(): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;

    const revisionAtStart = this.callbacks.getRevision();
    this.initializationPromise = (async () => {
      await this.refreshWorkflows();
      const active = await getActiveMachineryWorkflow();
      if (revisionAtStart !== this.callbacks.getRevision() || !active?.workflowId) return;

      const workflow = await getMachineryWorkflow(active.workflowId);
      if (!workflow || revisionAtStart !== this.callbacks.getRevision()) return;
      this.applyWorkflow(workflow);
    })();

    return this.initializationPromise;
  }

  public async newWorkflow(): Promise<void> {
    const graph = this.callbacks.getGraph();
    const currentIsEmpty = graph.nodes.length === 0 && graph.edges.length === 0;
    if (
      currentIsEmpty &&
      this.activeWorkflowName.trim().toLowerCase() === UNTITLED_WORKFLOW.toLowerCase()
    ) {
      return;
    }

    const existingEmpty = this.savedWorkflows.find(
      (workflow) =>
        workflow.nodes.length === 0 &&
        workflow.edges.length === 0 &&
        workflow.name.trim().toLowerCase() === UNTITLED_WORKFLOW.toLowerCase(),
    );
    if (existingEmpty) {
      await this.loadWorkflow(existingEmpty.id);
      return;
    }

    await this.flushPersistence();
    this.applyGraph({ id: null, name: UNTITLED_WORKFLOW, nodes: [], edges: [] });
    this.markChanged();
  }

  public renameWorkflow(name: string): void {
    const normalizedName = name.trim().slice(0, 40);
    if (!normalizedName) return;
    this.ensureWorkflowIdentity();
    this.activeWorkflowName = normalizedName;
    this.markChanged();
  }

  public async loadWorkflow(id: string): Promise<boolean> {
    await this.flushPersistence();
    const workflow = await getMachineryWorkflow(id);
    if (!workflow) return false;

    this.applyWorkflow(workflow);
    await setActiveMachineryWorkflow({ workflowId: id });
    await this.refreshWorkflows();
    return true;
  }

  public async refreshWorkflows(): Promise<MachineryWorkflowRecord[]> {
    const workflows = (await listMachineryWorkflows()).sort((a, b) => b.updatedAt - a.updatedAt);
    this.savedWorkflows = workflows;
    return workflows;
  }

  public async deleteWorkflow(id: string): Promise<void> {
    await this.flushPersistence();
    await deleteMachineryWorkflow(id);

    if (this.activeWorkflowId === id) {
      const remaining = (await listMachineryWorkflows()).sort((a, b) => b.updatedAt - a.updatedAt);
      if (remaining[0]) {
        await this.loadWorkflow(remaining[0].id);
      } else {
        this.applyGraph({ id: null, name: UNTITLED_WORKFLOW, nodes: [], edges: [] });
        this.markChanged();
        await this.flushPersistence();
      }
    }
    await this.refreshWorkflows();
  }

  public async clearSavedWorkflows(): Promise<void> {
    await this.flushPersistence();
    await clearMachineryDatabase();
    this.applyGraph({ id: null, name: UNTITLED_WORKFLOW, nodes: [], edges: [] });
    this.initializationPromise = null;
    this.persistenceQueue = Promise.resolve();
    this.savedWorkflows = [];
  }

  public async flushPersistence(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = undefined;
      this.queuePersistence(this.captureWorkflow());
    }
    await this.persistenceQueue;
  }

  public markChanged(): void {
    this.ensureWorkflowIdentity();
    this.schedulePersistence();
  }

  private applyWorkflow(workflow: MachineryWorkflowRecord): void {
    this.applyGraph({
      id: workflow.id,
      name: workflow.name.trim().slice(0, 40) || UNTITLED_WORKFLOW,
      nodes: structuredClone(workflow.nodes),
      edges: structuredClone(workflow.edges),
    });
  }

  private applyGraph(graph: WorkflowGraph & { id: string | null; name: string }): void {
    this.activeWorkflowId = graph.id;
    this.activeWorkflowName = graph.name;
    this.callbacks.applyWorkflow({
      id: graph.id ?? "",
      name: graph.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: graph.nodes,
      edges: graph.edges,
    });
  }

  private ensureWorkflowIdentity(): void {
    if (this.activeWorkflowId) return;
    this.activeWorkflowId = `wf-${crypto.randomUUID()}`;
    this.activeWorkflowName = UNTITLED_WORKFLOW;
  }

  private schedulePersistence(): void {
    clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = undefined;
      this.queuePersistence(this.captureWorkflow());
    }, 0);
  }

  private queuePersistence(record: WorkflowDraft): void {
    this.persistenceQueue = this.persistenceQueue.then(() => this.persistWorkflow(record));
  }

  private captureWorkflow(): WorkflowDraft {
    const graph = this.callbacks.getGraph();
    return {
      id: this.activeWorkflowId ?? "",
      name: this.activeWorkflowName,
      nodes: structuredClone(graph.nodes),
      edges: structuredClone(graph.edges),
    };
  }

  private async persistWorkflow(record: WorkflowDraft): Promise<void> {
    if (!record.id) return;

    const existing = await getMachineryWorkflow(record.id);
    const workflowSaved = await setMachineryWorkflow({
      ...record,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });
    const activeWorkflowSaved = await setActiveMachineryWorkflow({ workflowId: record.id });
    if (!workflowSaved || !activeWorkflowSaved) {
      this.persistenceError = "Workflow changes could not be saved permanently.";
      return;
    }

    this.persistenceError = null;
    await this.refreshWorkflows();
  }
}
