import { createStore, del, get, keys, set } from "idb-keyval";
import type { MachineryEdge, MachineryNode } from "$lib/engine/machinery";

export const MACHINERY_DB_NAME = "nopixelv_machinery_v1";
export const MACHINERY_WORKFLOW_STORE = "workflows";
export const MACHINERY_ACTIVE_WORKFLOW_KEY = "active_workflow";

export interface MachineryWorkflowRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodes: MachineryNode[];
  edges: MachineryEdge[];
}

export interface ActiveWorkflowRecord {
  workflowId: string | null;
}

const workflowStore = createStore(MACHINERY_DB_NAME, MACHINERY_WORKFLOW_STORE);
const memoryStore = new Map<string, MachineryWorkflowRecord | ActiveWorkflowRecord>();

function hasIndexedDB(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

export async function getMachineryWorkflow(
  id: string,
): Promise<MachineryWorkflowRecord | undefined> {
  if (!hasIndexedDB()) return memoryStore.get(id) as MachineryWorkflowRecord | undefined;

  try {
    return await get<MachineryWorkflowRecord>(id, workflowStore);
  } catch {
    return memoryStore.get(id) as MachineryWorkflowRecord | undefined;
  }
}

export async function setMachineryWorkflow(record: MachineryWorkflowRecord): Promise<boolean> {
  memoryStore.set(record.id, record);
  if (!hasIndexedDB()) return true;

  try {
    await set(record.id, record, workflowStore);
    return true;
  } catch {
    return false;
  }
}

export async function listMachineryWorkflows(): Promise<MachineryWorkflowRecord[]> {
  if (!hasIndexedDB()) {
    return [...memoryStore.values()].filter(isWorkflowRecord);
  }

  try {
    const workflowKeys = (await keys<string>(workflowStore)).filter(
      (key) => key !== MACHINERY_ACTIVE_WORKFLOW_KEY,
    );
    const records = await Promise.all(workflowKeys.map((key) => getMachineryWorkflow(key)));
    return records.filter((record): record is MachineryWorkflowRecord => record !== undefined);
  } catch {
    return [...memoryStore.values()].filter(isWorkflowRecord);
  }
}

export async function deleteMachineryWorkflow(id: string): Promise<void> {
  memoryStore.delete(id);
  if (!hasIndexedDB()) return;

  try {
    await del(id, workflowStore);
  } catch {
    // The in-memory copy is already removed.
  }
}

export async function getActiveMachineryWorkflow(): Promise<ActiveWorkflowRecord | undefined> {
  if (!hasIndexedDB())
    return memoryStore.get(MACHINERY_ACTIVE_WORKFLOW_KEY) as ActiveWorkflowRecord;

  try {
    return await get<ActiveWorkflowRecord>(MACHINERY_ACTIVE_WORKFLOW_KEY, workflowStore);
  } catch {
    return memoryStore.get(MACHINERY_ACTIVE_WORKFLOW_KEY) as ActiveWorkflowRecord | undefined;
  }
}

export async function setActiveMachineryWorkflow(record: ActiveWorkflowRecord): Promise<boolean> {
  memoryStore.set(MACHINERY_ACTIVE_WORKFLOW_KEY, record);
  if (!hasIndexedDB()) return true;

  try {
    await set(MACHINERY_ACTIVE_WORKFLOW_KEY, record, workflowStore);
    return true;
  } catch {
    return false;
  }
}

export async function clearMachineryDatabase(): Promise<void> {
  memoryStore.clear();
  if (!hasIndexedDB()) return;

  const records = await listMachineryWorkflows();
  await Promise.all(records.map((record) => deleteMachineryWorkflow(record.id)));
  await setActiveMachineryWorkflow({ workflowId: null });
}

function isWorkflowRecord(
  value: MachineryWorkflowRecord | ActiveWorkflowRecord,
): value is MachineryWorkflowRecord {
  return "id" in value && value.id !== MACHINERY_ACTIVE_WORKFLOW_KEY;
}
