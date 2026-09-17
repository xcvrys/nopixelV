/**
 * Client-Side Local Database Storage for Workflows & Blueprints.
 * Uses IndexedDB via idb-keyval with seamless in-memory fallback for test/SSR runners.
 */

import { get, set, del } from 'idb-keyval';

export interface SavedWorkflow {
 id: string;
 name: string;
 description?: string;
 createdAt: number;
 updatedAt: number;
 nodes: unknown[];
 edges: unknown[];
}

const STORAGE_KEY_WORKFLOWS = 'nopixelv_workflows_v1';
const STORAGE_KEY_ACTIVE = 'nopixelv_active_workflow_v1';

const memoryStore = new Map<string, unknown>();

function hasIndexedDB(): boolean {
 return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

async function getStoredValue<T>(key: string): Promise<T | undefined> {
 if (hasIndexedDB()) {
  try {
   return await get<T>(key);
  } catch (e) {
   console.warn('[Storage] IndexedDB read failed, falling back to memory:', e);
  }
 }
 return memoryStore.get(key) as T | undefined;
}

async function setStoredValue<T>(key: string, value: T): Promise<void> {
 if (hasIndexedDB()) {
  try {
   await set(key, value);
   return;
  } catch (e) {
   console.warn('[Storage] IndexedDB write failed, falling back to memory:', e);
  }
 }
 memoryStore.set(key, value);
}

export async function saveWorkflow(workflow: SavedWorkflow): Promise<void> {
 const all = (await getStoredValue<Record<string, SavedWorkflow>>(STORAGE_KEY_WORKFLOWS)) || {};
 all[workflow.id] = {
  ...workflow,
  updatedAt: Date.now()
 };
 await setStoredValue(STORAGE_KEY_WORKFLOWS, all);
}

export async function getWorkflow(id: string): Promise<SavedWorkflow | undefined> {
 const all = (await getStoredValue<Record<string, SavedWorkflow>>(STORAGE_KEY_WORKFLOWS)) || {};
 return all[id];
}

export async function listWorkflows(): Promise<SavedWorkflow[]> {
 const all = (await getStoredValue<Record<string, SavedWorkflow>>(STORAGE_KEY_WORKFLOWS)) || {};
 return Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteWorkflow(id: string): Promise<void> {
 const all = (await getStoredValue<Record<string, SavedWorkflow>>(STORAGE_KEY_WORKFLOWS)) || {};
 delete all[id];
 await setStoredValue(STORAGE_KEY_WORKFLOWS, all);
}

export async function clearAllWorkflows(): Promise<void> {
 if (hasIndexedDB()) {
  try {
   await del(STORAGE_KEY_WORKFLOWS);
   await del(STORAGE_KEY_ACTIVE);
  } catch {
   // ignore
  }
 }
 memoryStore.clear();
}

export async function getActiveWorkflowId(): Promise<string | undefined> {
 return getStoredValue<string>(STORAGE_KEY_ACTIVE);
}

export async function setActiveWorkflowId(id: string): Promise<void> {
 await setStoredValue(STORAGE_KEY_ACTIVE, id);
}

