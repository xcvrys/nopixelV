/**
 * Reactive Machinery State Store using Svelte 5 Runes ($state, $derived).
 * Manages draggable machine nodes, conveyor edges, live throughput calculations,
 * and persistence to IndexedDB workflows.
 */

import {
	evaluateProductionNetwork,
	type MachineryNode,
	type MachineryEdge,
	type NetworkCalculationResult
} from '../engine/calculator';
import { getRecipe } from '../data/recipes';
import { getMachine } from '../data/machines';
import { deleteValue, getValue, setValue } from '../db/storage';

export interface SavedWorkflow {
	id: string;
	name: string;
	description?: string;
	createdAt: number;
	updatedAt: number;
	nodes: unknown[];
	edges: unknown[];
}

const WORKFLOW_STORAGE_KEY = 'nopixelv_workflows_v1';

export interface MachineNodeData {
	machineType: string;
	name: string;
	recipeId: string | null;
	clockSpeed: number; // Percentage, e.g. 100
	customDurationOverride?: number;
	powerCostOverride?: number;
	[key: string]: unknown;
}

export interface SvelteFlowNode {
	id: string;
	type: string;
	position: { x: number; y: number };
	data: MachineNodeData;
}

export interface SvelteFlowEdge {
	id: string;
	source: string;
	sourceHandle?: string | null;
	target: string;
	targetHandle?: string | null;
	animated?: boolean;
	style?: string;
}

function createDefaultDemoNodes(): SvelteFlowNode[] {
	return [
		{
			id: 'machine-1',
			type: 'machine',
			position: { x: 100, y: 140 },
			data: {
				machineType: 'furnace',
				name: 'Smelting Furnace A',
				recipeId: 'smelt_iron_scrap',
				clockSpeed: 100
			}
		},
		{
			id: 'machine-2',
			type: 'machine',
			position: { x: 480, y: 140 },
			data: {
				machineType: 'processor',
				name: 'Plate Press B',
				recipeId: 'craft_iron_plate',
				clockSpeed: 100
			}
		}
	];
}

function createDefaultDemoEdges(): SvelteFlowEdge[] {
	return [
		{
			id: 'conveyor-1-2',
			source: 'machine-1',
			sourceHandle: 'iron_ingot',
			target: 'machine-2',
			targetHandle: 'iron_ingot',
			animated: true
		}
	];
}

export class MachineryStore {
	public nodes = $state<SvelteFlowNode[]>(createDefaultDemoNodes());
	public edges = $state<SvelteFlowEdge[]>(createDefaultDemoEdges());
	public activeWorkflowId = $state<string | null>(null);
	public activeWorkflowName = $state<string>('Default Machinery');
	private nextId = 10;

	// Automatically recalculated whenever nodes or edges mutate
	public calculationResult = $derived.by<NetworkCalculationResult>(() => {
		const calcNodes: MachineryNode[] = this.nodes.map((n) => {
			const recipe = n.data.recipeId ? getRecipe(n.data.recipeId) || null : null;
			return {
				id: n.id,
				type: n.data.machineType,
				name: n.data.name,
				recipe,
				clockSpeed: n.data.clockSpeed,
				customDurationOverride: n.data.customDurationOverride,
				powerCostOverride: n.data.powerCostOverride
			};
		});

		const calcEdges: MachineryEdge[] = this.edges.map((e) => ({
			id: e.id,
			sourceNodeId: e.source,
			sourceHandle: e.sourceHandle || '',
			targetNodeId: e.target,
			targetHandle: e.targetHandle || ''
		}));

		return evaluateProductionNetwork(calcNodes, calcEdges);
	});

	public addMachine(machineType: string, position = { x: 200, y: 200 }): string {
		const def = getMachine(machineType);
		const id = `machine-${this.nextId++}-${Date.now().toString(36).slice(-4)}`;

		// Assign first available recipe for this machine type if available
		const defaultRecipe =
			machineType === 'furnace'
				? 'smelt_iron_scrap'
				: machineType === 'processor'
					? 'craft_iron_plate'
					: null;

		const newNode: SvelteFlowNode = {
			id,
			type: 'machine',
			position: { ...position },
			data: {
				machineType,
				name: `${def?.name || 'Machine'} #${this.nextId}`,
				recipeId: defaultRecipe,
				clockSpeed: 100,
				customDurationOverride: undefined,
				powerCostOverride: undefined
			}
		};

		this.nodes = [...this.nodes, newNode];
		return id;
	}

	public removeNode(nodeId: string): void {
		this.nodes = this.nodes.filter((n) => n.id !== nodeId);
		// Remove any connected edges
		this.edges = this.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
	}

	public updateNodeData(nodeId: string, updates: Partial<MachineNodeData>): void {
		this.nodes = this.nodes.map((n) => {
			if (n.id === nodeId) {
				return {
					...n,
					data: {
						...n.data,
						...updates
					}
				};
			}
			return n;
		});
	}

	public connectEdge(
		source: string,
		sourceHandle: string,
		target: string,
		targetHandle: string
	): void {
		// Prevent duplicate connections between identical sockets
		const exists = this.edges.some(
			(e) =>
				e.source === source &&
				e.sourceHandle === sourceHandle &&
				e.target === target &&
				e.targetHandle === targetHandle
		);
		if (exists) return;

		const newEdge: SvelteFlowEdge = {
			id: `edge-${source}-${target}-${Date.now().toString(36)}`,
			source,
			sourceHandle,
			target,
			targetHandle,
			animated: true
		};

		this.edges = [...this.edges, newEdge];
	}

	public removeEdge(edgeId: string): void {
		this.edges = this.edges.filter((e) => e.id !== edgeId);
	}

	public clearCanvas(): void {
		this.nodes = [];
		this.edges = [];
	}

	public resetDemoLayout(): void {
		this.nodes = createDefaultDemoNodes();
		this.edges = createDefaultDemoEdges();
	}

	public exportBlueprintJson(): string {
		const payload = {
			version: 1,
			name: this.activeWorkflowName,
			exportedAt: Date.now(),
			nodes: this.nodes,
			edges: this.edges
		};
		return JSON.stringify(payload, null, 2);
	}

	public importBlueprintJson(jsonString: string): boolean {
		try {
			const parsed = JSON.parse(jsonString);
			if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
				this.nodes = parsed.nodes;
				this.edges = parsed.edges;
				if (parsed.name) {
					this.activeWorkflowName = parsed.name;
				}
				return true;
			}
		} catch (e) {
			console.error('Failed to import blueprint JSON:', e);
		}
		return false;
	}

	public async saveWorkflowToDb(name?: string): Promise<string> {
		const wfName = name || this.activeWorkflowName || 'Untitled Workflow';
		const id = this.activeWorkflowId || `wf-${Date.now().toString(36)}`;
		const workflows = await this.readWorkflowMap();

		workflows[id] = {
			id,
			name: wfName,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			nodes: this.nodes,
			edges: this.edges
		};

		await setValue(WORKFLOW_STORAGE_KEY, workflows);
		this.activeWorkflowId = id;
		this.activeWorkflowName = wfName;
		return id;
	}

	public async loadWorkflowFromDb(id: string): Promise<boolean> {
		const record = (await this.readWorkflowMap())[id];
		if (!record) return false;

		this.nodes = record.nodes as SvelteFlowNode[];
		this.edges = record.edges as SvelteFlowEdge[];
		this.activeWorkflowId = record.id;
		this.activeWorkflowName = record.name;
		return true;
	}

	public async listSavedWorkflows(): Promise<SavedWorkflow[]> {
		return Object.values(await this.readWorkflowMap()).sort(
			(a, b) => b.updatedAt - a.updatedAt,
		);
	}

	public async deleteSavedWorkflow(id: string): Promise<void> {
		const workflows = await this.readWorkflowMap();
		delete workflows[id];
		await setValue(WORKFLOW_STORAGE_KEY, workflows);
		if (this.activeWorkflowId === id) {
			this.activeWorkflowId = null;
		}
	}

	public async clearSavedWorkflows(): Promise<void> {
		await deleteValue(WORKFLOW_STORAGE_KEY);
		this.activeWorkflowId = null;
	}

	private async readWorkflowMap(): Promise<Record<string, SavedWorkflow>> {
		return (await getValue<Record<string, SavedWorkflow>>(WORKFLOW_STORAGE_KEY)) ?? {};
	}

}

export const machineryStore = new MachineryStore();
