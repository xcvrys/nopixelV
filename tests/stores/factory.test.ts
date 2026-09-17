import { describe, it, expect, beforeEach } from 'vitest';
import {
	saveWorkflow,
	getWorkflow,
	listWorkflows,
	deleteWorkflow,
	clearAllWorkflows
} from '../../src/lib/db/storage';
import { FactoryStore } from '../../src/lib/stores/factory.svelte';
import { getRecipe } from '../../src/lib/data/recipes';

describe('Workflow Database Storage', () => {
	beforeEach(async () => {
		await clearAllWorkflows();
	});

	it('saves, retrieves, lists, and deletes a workflow', async () => {
		const testWorkflow = {
			id: 'wf-1',
			name: 'Iron Smelting Line',
			createdAt: Date.now(),
			updatedAt: Date.now(),
			nodes: [{ id: 'n1', type: 'furnace', position: { x: 0, y: 0 }, data: {} }],
			edges: []
		};

		await saveWorkflow(testWorkflow);

		const retrieved = await getWorkflow('wf-1');
		expect(retrieved).toBeDefined();
		expect(retrieved?.name).toBe('Iron Smelting Line');

		const list = await listWorkflows();
		expect(list).toHaveLength(1);
		expect(list[0].id).toBe('wf-1');

		await deleteWorkflow('wf-1');
		const emptyList = await listWorkflows();
		expect(emptyList).toHaveLength(0);
	});
});

describe('FactoryStore', () => {
	let store: FactoryStore;

	beforeEach(() => {
		store = new FactoryStore();
	});

	it('initializes with a demo layout', () => {
		expect(store.nodes.length).toBeGreaterThan(0);
		expect(store.edges.length).toBeGreaterThan(0);
		expect(store.calculationResult.summary.totalPowerDraw).toBeGreaterThan(0);
	});

	it('allows adding and removing machine nodes', () => {
		store.clearCanvas();
		expect(store.nodes).toHaveLength(0);

		const nodeId = store.addMachine('furnace', { x: 100, y: 200 });
		expect(store.nodes).toHaveLength(1);
		expect(store.nodes[0].id).toBe(nodeId);
		expect(store.nodes[0].type).toBe('machine');
		expect(store.nodes[0].data.machineType).toBe('furnace');

		store.removeNode(nodeId);
		expect(store.nodes).toHaveLength(0);
	});

	it('allows updating node parameters and updates live stats', () => {
		store.clearCanvas();
		const furnaceId = store.addMachine('furnace', { x: 0, y: 0 });
		const recipe = getRecipe('smelt_iron_scrap');
		expect(recipe).toBeDefined();

		store.updateNodeData(furnaceId, {
			recipeId: recipe!.id,
			clockSpeed: 150
		});

		const node = store.nodes.find((n) => n.id === furnaceId);
		expect(node?.data.recipeId).toBe('smelt_iron_scrap');
		expect(node?.data.clockSpeed).toBe(150);

		// With 150% clock speed on 3s recipe, 30 cycles/min -> 60 power
		expect(store.calculationResult.summary.totalPowerDraw).toBeCloseTo(60, 1);
	});

	it('exports and imports blueprint JSON cleanly', () => {
		const json = store.exportBlueprintJson();
		expect(json).toBeTruthy();

		store.clearCanvas();
		expect(store.nodes).toHaveLength(0);

		const success = store.importBlueprintJson(json);
		expect(success).toBe(true);
		expect(store.nodes.length).toBeGreaterThan(0);
	});
});
