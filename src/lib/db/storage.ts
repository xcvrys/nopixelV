/**
 * Shared client-side persistence utilities.
 * Uses IndexedDB via idb-keyval with an in-memory fallback for SSR/test runners.
 */

import { del, get, set } from 'idb-keyval';

const memoryStore = new Map<string, unknown>();

function hasIndexedDB(): boolean {
 return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

export async function getValue<T>(key: string): Promise<T | undefined> {
 if (!hasIndexedDB()) return memoryStore.get(key) as T | undefined;

 try {
  return await get<T>(key);
 } catch (error) {
  console.warn('[Storage] IndexedDB read failed, falling back to memory:', error);
  return memoryStore.get(key) as T | undefined;
 }
}

export async function setValue<T>(key: string, value: T): Promise<void> {
 if (!hasIndexedDB()) {
  memoryStore.set(key, value);
  return;
 }

 try {
  await set(key, value);
  return;
 } catch (error) {
  console.warn('[Storage] IndexedDB write failed, falling back to memory:', error);
 }
 memoryStore.set(key, value);
}

export async function deleteValue(key: string): Promise<void> {
 if (!hasIndexedDB()) {
  memoryStore.delete(key);
  return;
 }

 try {
  await del(key);
 } catch (error) {
  console.warn('[Storage] IndexedDB delete failed, falling back to memory:', error);
 }
 memoryStore.delete(key);
}
