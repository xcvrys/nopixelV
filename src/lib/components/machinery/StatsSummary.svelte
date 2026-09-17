<script lang="ts">
	import { machineryStore } from '$lib/stores/machinery.svelte';
	import { getItem } from '$lib/data/items';
	import { STARTER_MACHINES } from '$lib/data/machines';
	import type { SavedWorkflow } from '$lib/stores/machinery.svelte';
	import {
		Zap,
		ArrowDownRight,
		ArrowUpRight,
		TriangleAlert,
		Plus,
		RotateCcw,
		Trash2,
		Download,
		Upload,
		Database,
		Save,
		X
	} from 'lucide-svelte';

	let summary = $derived(machineryStore.calculationResult.summary);
	let bottlenecks = $derived(machineryStore.calculationResult.bottlenecks);

	let showAddMenu = $state(false);
	let showWorkflowModal = $state(false);
	let savedWorkflows = $state<SavedWorkflow[]>([]);
	let newWorkflowName = $state('');
	let importError = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);

	function handleAddMachine(type: string) {
		machineryStore.addMachine(type, {
			x: 200 + Math.random() * 80,
			y: 150 + Math.random() * 80
		});
		showAddMenu = false;
	}

	async function openWorkflowModal() {
		savedWorkflows = await machineryStore.listSavedWorkflows();
		newWorkflowName = machineryStore.activeWorkflowName || '';
		showWorkflowModal = true;
	}

	async function handleSaveWorkflow() {
		if (!newWorkflowName.trim()) return;
		await machineryStore.saveWorkflowToDb(newWorkflowName.trim());
		savedWorkflows = await machineryStore.listSavedWorkflows();
	}

	async function handleLoadWorkflow(id: string) {
		await machineryStore.loadWorkflowFromDb(id);
		showWorkflowModal = false;
	}

	async function handleDeleteWorkflow(id: string) {
		await machineryStore.deleteSavedWorkflow(id);
		savedWorkflows = await machineryStore.listSavedWorkflows();
	}

	function handleExportBlueprint() {
		const json = machineryStore.exportBlueprintJson();
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `nopixel-v-blueprint-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleImportFile(e: Event) {
		importError = '';
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const content = event.target?.result as string;
			const success = machineryStore.importBlueprintJson(content);
			if (!success) {
				importError = 'Invalid blueprint JSON format.';
			} else {
				showWorkflowModal = false;
			}
		};
		reader.readAsText(file);
	}
</script>

<header class="w-full bg-black border-b border-neutral-900 px-4 py-3 flex flex-wrap items-center justify-between gap-4 z-20">
	<!-- Left: Global Production Balance Totals -->
	<div class="flex flex-wrap items-center gap-3">
		<!-- Raw Inputs Demanded -->
		<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800">
			<ArrowDownRight class="w-4 h-4 text-neutral-400 shrink-0" />
			<div class="text-xs">
				<span class="text-[10px] uppercase font-semibold text-neutral-500 block">Raw Inflow</span>
				{#if summary.rawInputsNeeded.length > 0}
					<div class="flex items-center gap-2">
						{#each summary.rawInputsNeeded as inp}
							{@const item = getItem(inp.itemId)}
							<span class="inline-flex items-center gap-1 font-mono font-bold text-white">
								<span class="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
								<span>{inp.ratePerMin}/m</span>
								<span class="text-neutral-500 text-[10px] font-normal">{item?.name || inp.itemId}</span>
							</span>
						{/each}
					</div>
				{:else}
					<span class="text-neutral-500 italic text-[11px]">No raw inputs</span>
				{/if}
			</div>
		</div>

		<!-- Net Outputs Produced -->
		<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800">
			<ArrowUpRight class="w-4 h-4 text-white shrink-0" />
			<div class="text-xs">
				<span class="text-[10px] uppercase font-semibold text-neutral-500 block">Net Products</span>
				{#if summary.netOutputsProduced.length > 0}
					<div class="flex items-center gap-2">
						{#each summary.netOutputsProduced as out}
							{@const item = getItem(out.itemId)}
							<span class="inline-flex items-center gap-1 font-mono font-bold text-white">
								<span class="w-1.5 h-1.5 rounded-full bg-white"></span>
								<span>{out.ratePerMin}/m</span>
								<span class="text-neutral-500 text-[10px] font-normal">{item?.name || out.itemId}</span>
							</span>
						{/each}
					</div>
				{:else}
					<span class="text-neutral-500 italic text-[11px]">No products</span>
				{/if}
			</div>
		</div>

		<!-- Global Power Consumption -->
		<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800">
			<Zap class="w-4 h-4 text-neutral-400 shrink-0" />
			<div class="text-xs">
				<span class="text-[10px] uppercase font-semibold text-neutral-500 block">Total Power</span>
				<span class="font-mono font-bold text-white">{summary.totalPowerDraw} kW/m</span>
			</div>
		</div>

		<!-- Bottleneck Warning Badge -->
		{#if bottlenecks.length > 0}
			<div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-semibold">
				<TriangleAlert class="w-4 h-4 text-neutral-400 shrink-0" />
				<span>{bottlenecks.length} Bottleneck{bottlenecks.length > 1 ? 's' : ''} Detected</span>
			</div>
		{/if}
	</div>

	<!-- Right: Actions & Workflow Management -->
	<div class="flex items-center gap-2">
		<!-- Add Machine Dropdown -->
		<div class="relative">
			<button
				onclick={() => (showAddMenu = !showAddMenu)}
				class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors"
			>
				<Plus class="w-4 h-4" />
				<span>Spawn Machine</span>
			</button>

			{#if showAddMenu}
				<div class="absolute right-0 mt-2 w-52 bg-black border border-neutral-800 rounded-lg shadow-2xl p-1 z-50 animate-in fade-in duration-100">
					{#each STARTER_MACHINES as m}
						<button
							onclick={() => handleAddMachine(m.type)}
							class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 text-left transition-colors"
						>
							<div class="w-1.5 h-1.5 rounded-full bg-neutral-400"></div>
							<span>{m.name}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Workflows Database Modal Trigger -->
		<button
			onclick={openWorkflowModal}
			class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-900 font-medium text-xs border border-neutral-800 transition-colors"
			title="Manage saved workflows and blueprints in local DB"
		>
			<Database class="w-3.5 h-3.5 text-neutral-400" />
			<span>Workflows</span>
		</button>

		<!-- Reset Demo -->
		<button
			onclick={() => machineryStore.resetDemoLayout()}
			class="p-2 rounded-lg bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800 transition-colors"
			title="Reset to demo machinery layout"
		>
			<RotateCcw class="w-4 h-4" />
		</button>

		<!-- Clear Canvas -->
		<button
			onclick={() => machineryStore.clearCanvas()}
			class="p-2 rounded-lg bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800 transition-colors"
			title="Clear all machines and belts"
		>
			<Trash2 class="w-4 h-4" />
		</button>
	</div>
</header>

<!-- Workflows & Blueprints IndexedDB Modal -->
{#if showWorkflowModal}
	<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
		<div class="bg-black border border-neutral-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl">
			<!-- Modal Header -->
			<div class="flex items-center justify-between pb-4 border-b border-neutral-900 mb-5">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
						<Database class="w-4 h-4" />
					</div>
					<div>
						<h3 class="font-bold text-white text-base">Local Database Workflows</h3>
						<p class="text-[11px] text-neutral-400">Save and load production blueprints in browser IndexedDB</p>
					</div>
				</div>
				<button
					onclick={() => (showWorkflowModal = false)}
					class="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Save Current Workflow Form -->
			<div class="mb-6 p-4 rounded-xl bg-neutral-950 border border-neutral-900">
				<label for="save-workflow-name-input" class="text-xs font-semibold text-neutral-300 block mb-2">
					Save Current Machinery Workflow
				</label>
				<div class="flex gap-2">
					<input
						id="save-workflow-name-input"
						type="text"
						placeholder="e.g. Scrap to Circuit Line"
						bind:value={newWorkflowName}
						class="flex-1 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500"
					/>
					<button
						onclick={handleSaveWorkflow}
						class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors"
					>
						<Save class="w-3.5 h-3.5" />
						<span>Save to DB</span>
					</button>
				</div>
			</div>

			<!-- Saved Workflows List -->
			<div class="mb-6">
				<h4 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Saved Workflows</h4>
				{#if savedWorkflows.length > 0}
					<div class="space-y-2 max-h-48 overflow-y-auto pr-1">
						{#each savedWorkflows as wf}
							<div class="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-900 hover:border-neutral-800">
								<div>
									<div class="font-bold text-xs text-white">{wf.name}</div>
									<div class="text-[10px] text-neutral-500">
										{wf.nodes.length} machines • {wf.edges.length} conveyor lines • {new Date(wf.updatedAt).toLocaleDateString()}
									</div>
								</div>
								<div class="flex items-center gap-2">
									<button
										onclick={() => handleLoadWorkflow(wf.id)}
										class="px-2.5 py-1.5 rounded-md bg-neutral-900 hover:bg-white hover:text-black text-white font-medium text-xs transition-colors border border-neutral-800"
									>
										Load
									</button>
									<button
										onclick={() => handleDeleteWorkflow(wf.id)}
										class="p-1.5 rounded-md text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors"
										title="Delete saved workflow"
									>
										<Trash2 class="w-3.5 h-3.5" />
									</button>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-xs text-neutral-500 italic py-3 text-center bg-neutral-950 rounded-lg border border-dashed border-neutral-900">
						No saved workflows in local database yet.
					</div>
				{/if}
			</div>

			<!-- Import & Export Section -->
			<div class="flex items-center justify-between pt-4 border-t border-neutral-900 text-xs">
				<div class="flex items-center gap-2">
					<button
						onclick={handleExportBlueprint}
						class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900 font-medium"
					>
						<Download class="w-3.5 h-3.5" />
						<span>Export JSON</span>
					</button>

					<button
						onclick={() => fileInput?.click()}
						class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900 font-medium"
					>
						<Upload class="w-3.5 h-3.5" />
						<span>Import JSON</span>
					</button>
					<input
						type="file"
						accept=".json"
						bind:this={fileInput}
						onchange={handleImportFile}
						class="hidden"
					/>
				</div>

				{#if importError}
					<span class="text-neutral-400 text-xs font-semibold">{importError}</span>
				{/if}
			</div>
		</div>
	</div>
{/if}
