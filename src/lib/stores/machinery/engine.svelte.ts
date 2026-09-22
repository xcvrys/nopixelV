import { calculateMachinery, type MachineryEdge, type MachineryNode } from "$lib/engine/machinery";

export class MachineryEngineStore {
  public nodes = $state.raw<MachineryNode[]>([]);
  public edges = $state.raw<MachineryEdge[]>([]);
  public calculationResult = $derived(calculateMachinery(this.nodes, this.edges));
}

export const machineryEngineStore = new MachineryEngineStore();
