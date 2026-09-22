import EnergyNode from "./energy/EnergyNode.svelte";
import MachineNode from "./machine/MachineNode.svelte";
import TextNode from "./text/TextNode.svelte";

export const machineryNodeTypes = {
  machine: MachineNode,
  energy: EnergyNode,
  text: TextNode,
};
