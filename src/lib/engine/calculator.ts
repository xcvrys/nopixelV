/**
 * Production Calculator Math Engine for NoPixel V Industrial System.
 * Calculates throughput, machine cycles, conveyor edge balances,
 * bottleneck diagnostics, and total power draw.
 */

export interface RecipeItem {
	itemId: string;
	amount: number;
}

export interface Recipe {
	id: string;
	name: string;
	machineType: string;
	duration: number; // in seconds
	powerCost: number; // in kW per cycle
	inputs: RecipeItem[];
	outputs: RecipeItem[];
}

export interface FactoryNode {
	id: string;
	type: string;
	name: string;
	recipe: Recipe | null;
	clockSpeed: number; // e.g. 100 for 100%
	customDurationOverride?: number;
	powerCostOverride?: number;
}

export interface FactoryEdge {
	id: string;
	sourceNodeId: string;
	sourceHandle: string; // item ID output
	targetNodeId: string;
	targetHandle: string; // item ID input
}

export interface MachineRateItem {
	itemId: string;
	amountPerMin: number;
}

export interface MachineRateResult {
	effectiveDuration: number;
	cyclesPerMinute: number;
	inputs: MachineRateItem[];
	outputs: MachineRateItem[];
	powerPerMinute: number;
}

export interface MachineStats {
	efficiency: number; // 0 to 1
	rates: MachineRateResult;
	actualOutputs: MachineRateItem[];
}

export interface BottleneckWarning {
	nodeId: string;
	machineName: string;
	itemId: string;
	suppliedRate: number;
	demandedRate: number;
	efficiency: number;
}

export interface ItemFlowTotal {
	itemId: string;
	ratePerMin: number;
}

export interface NetworkSummary {
	rawInputsNeeded: ItemFlowTotal[];
	netOutputsProduced: ItemFlowTotal[];
	totalPowerDraw: number;
}

export interface NetworkCalculationResult {
	machineStats: Record<string, MachineStats>;
	bottlenecks: BottleneckWarning[];
	summary: NetworkSummary;
}

/**
 * Calculates theoretical 100%-efficiency rates for an individual machine.
 */
export function calculateMachineRates(
	recipe: Recipe,
	clockSpeed: number = 100,
	durationOverride?: number,
	powerCostOverride?: number
): MachineRateResult {
	const speedFactor = clockSpeed > 0 ? clockSpeed / 100 : 1;
	const baseDuration = durationOverride ?? (recipe.duration > 0 ? recipe.duration : 1);
	const effectiveDuration = durationOverride !== undefined ? durationOverride : baseDuration / speedFactor;
	const safeDuration = Math.max(0.001, effectiveDuration);
	const cyclesPerMinute = 60 / safeDuration;

	const inputs = recipe.inputs.map((inp) => ({
		itemId: inp.itemId,
		amountPerMin: inp.amount * cyclesPerMinute
	}));

	const outputs = recipe.outputs.map((out) => ({
		itemId: out.itemId,
		amountPerMin: out.amount * cyclesPerMinute
	}));

	const unitPower = powerCostOverride ?? recipe.powerCost;
	const powerPerMinute = unitPower * cyclesPerMinute;

	return {
		effectiveDuration,
		cyclesPerMinute,
		inputs,
		outputs,
		powerPerMinute
	};
}

/**
 * Evaluates the entire network of machines and conveyor belts:
 * - Traverses connected conveyor edges
 * - Determines inflow vs demand for each input socket
 * - Calculates operating efficiency and scales downstream outputs
 * - Aggregates raw inputs, net final outputs, and global power
 */
export function evaluateProductionNetwork(
	nodes: FactoryNode[],
	edges: FactoryEdge[]
): NetworkCalculationResult {
	const nodeMap = new Map<string, FactoryNode>();
	const theoreticalRates: Record<string, MachineRateResult> = {};
	const machineStats: Record<string, MachineStats> = {};
	const bottlenecks: BottleneckWarning[] = [];

	// Step 1: Pre-calculate theoretical maximum rates for all active machines
	for (const node of nodes) {
		nodeMap.set(node.id, node);
		if (node.recipe) {
			theoreticalRates[node.id] = calculateMachineRates(
				node.recipe,
				node.clockSpeed,
				node.customDurationOverride,
				node.powerCostOverride
			);
		} else {
			theoreticalRates[node.id] = {
				effectiveDuration: 0,
				cyclesPerMinute: 0,
				inputs: [],
				outputs: [],
				powerPerMinute: 0
			};
		}
	}

	// Step 2: Build graph dependencies and conveyor edge mappings
	// Target handle -> edges feeding into it
	const incomingEdges = new Map<string, FactoryEdge[]>(); // key: `${targetNodeId}:${targetHandle}`
	// Source handle -> edges taking from it
	const outgoingEdges = new Map<string, FactoryEdge[]>(); // key: `${sourceNodeId}:${sourceHandle}`

	for (const edge of edges) {
		const targetKey = `${edge.targetNodeId}:${edge.targetHandle}`;
		const sourceKey = `${edge.sourceNodeId}:${edge.sourceHandle}`;

		const inList = incomingEdges.get(targetKey) || [];
		inList.push(edge);
		incomingEdges.set(targetKey, inList);

		const outList = outgoingEdges.get(sourceKey) || [];
		outList.push(edge);
		outgoingEdges.set(sourceKey, outList);
	}

	// Step 3: Topological / iterative propagation to resolve actual output rates & efficiencies
	// Initialize each machine at efficiency = 1.0 (or 0 if no recipe)
	for (const node of nodes) {
		const rates = theoreticalRates[node.id];
		machineStats[node.id] = {
			efficiency: node.recipe ? 1.0 : 0,
			rates,
			actualOutputs: rates.outputs.map((o) => ({ ...o }))
		};
	}

	// Perform 3 relaxation passes to stabilize multi-step conveyor networks
	const PASS_COUNT = Math.max(3, nodes.length);
	for (let pass = 0; pass < PASS_COUNT; pass++) {
		for (const node of nodes) {
			if (!node.recipe) continue;

			const rates = theoreticalRates[node.id];
			let minEfficiency = 1.0;

			// Check each input requirement
			for (const input of rates.inputs) {
				const targetKey = `${node.id}:${input.itemId}`;
				const belts = incomingEdges.get(targetKey) || [];

				if (belts.length > 0) {
					// Connected to upstream machines: sum incoming supply
					let suppliedRate = 0;
					for (const belt of belts) {
						const upstreamNode = nodeMap.get(belt.sourceNodeId);
						const upstreamStats = machineStats[belt.sourceNodeId];
						if (upstreamNode && upstreamStats) {
							const upstreamOutput = upstreamStats.actualOutputs.find(
								(o) => o.itemId === belt.sourceHandle
							);
							if (upstreamOutput) {
								// If an upstream output feeds multiple belts, split evenly among them
								const siblings = outgoingEdges.get(`${belt.sourceNodeId}:${belt.sourceHandle}`) || [belt];
								suppliedRate += upstreamOutput.amountPerMin / siblings.length;
							}
						}
					}

					const demandRate = input.amountPerMin;
					const ratio = demandRate > 0 ? suppliedRate / demandRate : 1;
					if (ratio < minEfficiency) {
						minEfficiency = Math.max(0, ratio);
					}

					// On the final pass, record bottleneck warnings if noticeably undersupplied (< 99%)
					if (pass === PASS_COUNT - 1 && ratio < 0.99) {
						bottlenecks.push({
							nodeId: node.id,
							machineName: node.name,
							itemId: input.itemId,
							suppliedRate: Number(suppliedRate.toFixed(2)),
							demandedRate: Number(demandRate.toFixed(2)),
							efficiency: Number(minEfficiency.toFixed(3))
						});
					}
				}
				// If no incoming belts connected, input is treated as manually fed / raw supply
			}

			machineStats[node.id].efficiency = minEfficiency;
			machineStats[node.id].actualOutputs = rates.outputs.map((out) => ({
				itemId: out.itemId,
				amountPerMin: out.amountPerMin * minEfficiency
			}));
		}
	}

	// Step 4: Aggregate Global Summary
	const rawInputsMap = new Map<string, number>();
	const netOutputsMap = new Map<string, number>();
	let totalPowerDraw = 0;

	for (const node of nodes) {
		if (!node.recipe) continue;
		const stats = machineStats[node.id];
		totalPowerDraw += stats.rates.powerPerMinute * stats.efficiency;

		// Raw inputs: inputs that do NOT have an incoming conveyor belt
		for (const input of stats.rates.inputs) {
			const targetKey = `${node.id}:${input.itemId}`;
			const incoming = incomingEdges.get(targetKey);
			if (!incoming || incoming.length === 0) {
				const current = rawInputsMap.get(input.itemId) || 0;
				rawInputsMap.set(input.itemId, current + input.amountPerMin * stats.efficiency);
			}
		}

		// Net outputs: outputs that do NOT have an outgoing conveyor belt (end products)
		for (const output of stats.actualOutputs) {
			const sourceKey = `${node.id}:${output.itemId}`;
			const outgoing = outgoingEdges.get(sourceKey);
			if (!outgoing || outgoing.length === 0) {
				const current = netOutputsMap.get(output.itemId) || 0;
				netOutputsMap.set(output.itemId, current + output.amountPerMin);
			}
		}
	}

	const rawInputsNeeded: ItemFlowTotal[] = Array.from(rawInputsMap.entries()).map(
		([itemId, ratePerMin]) => ({ itemId, ratePerMin: Number(ratePerMin.toFixed(2)) })
	);

	const netOutputsProduced: ItemFlowTotal[] = Array.from(netOutputsMap.entries()).map(
		([itemId, ratePerMin]) => ({ itemId, ratePerMin: Number(ratePerMin.toFixed(2)) })
	);

	return {
		machineStats,
		bottlenecks,
		summary: {
			rawInputsNeeded,
			netOutputsProduced,
			totalPowerDraw: Number(totalPowerDraw.toFixed(2))
		}
	};
}
