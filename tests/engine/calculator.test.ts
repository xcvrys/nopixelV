import { describe, it, expect } from "vitest";
import {
  calculateMachineRates,
  evaluateProductionNetwork,
  type Recipe,
  type MachineryNode,
  type MachineryEdge,
} from "../../src/lib/engine/calculator";

describe("Calculator Engine", () => {
  const mockSmeltIron: Recipe = {
    id: "recipe_smelt_iron",
    name: "Smelt Iron Ingot",
    machineType: "furnace",
    duration: 3, // 3 seconds per craft
    powerCost: 2, // 2 kW per craft
    inputs: [{ itemId: "scrap_metal", amount: 2 }],
    outputs: [{ itemId: "iron_ingot", amount: 1 }],
  };

  describe("calculateMachineRates", () => {
    it("computes correct cycles and rates at 100% clock speed", () => {
      const res = calculateMachineRates(mockSmeltIron, 100);
      // 60 / 3 = 20 cycles per minute
      expect(res.cyclesPerMinute).toBeCloseTo(20, 2);
      expect(res.effectiveDuration).toBeCloseTo(3, 2);
      // Inputs: 2 * 20 = 40 items/min
      expect(res.inputs).toEqual([{ itemId: "scrap_metal", amountPerMin: 40 }]);
      // Outputs: 1 * 20 = 20 items/min
      expect(res.outputs).toEqual([{ itemId: "iron_ingot", amountPerMin: 20 }]);
      // Power: 2 * 20 = 40 kW/min
      expect(res.powerPerMinute).toBeCloseTo(40, 2);
    });

    it("computes correct rates with 150% clock speed (boost)", () => {
      const res = calculateMachineRates(mockSmeltIron, 150);
      // 3s / 1.5 = 2s duration
      // 60 / 2 = 30 cycles per min
      expect(res.effectiveDuration).toBeCloseTo(2, 2);
      expect(res.cyclesPerMinute).toBeCloseTo(30, 2);
      expect(res.inputs[0].amountPerMin).toBeCloseTo(60, 2);
      expect(res.outputs[0].amountPerMin).toBeCloseTo(30, 2);
      expect(res.powerPerMinute).toBeCloseTo(60, 2);
    });

    it("allows custom duration and power cost overrides", () => {
      const res = calculateMachineRates(mockSmeltIron, 100, 5, 10);
      // duration = 5s => 12 cycles/min
      expect(res.effectiveDuration).toBe(5);
      expect(res.cyclesPerMinute).toBe(12);
      expect(res.inputs[0].amountPerMin).toBe(24);
      expect(res.outputs[0].amountPerMin).toBe(12);
      expect(res.powerPerMinute).toBe(120);
    });
  });

  describe("evaluateProductionNetwork", () => {
    const mockMakePlates: Recipe = {
      id: "recipe_iron_plate",
      name: "Craft Iron Plate",
      machineType: "processor",
      duration: 6, // 10 cycles/min
      powerCost: 5,
      inputs: [{ itemId: "iron_ingot", amount: 2 }], // needs 20 ingots/min
      outputs: [{ itemId: "iron_plate", amount: 1 }], // produces 10 plates/min
    };

    it("evaluates a balanced 1:1 conveyor chain", () => {
      // Furnace produces 20 ingots/min
      // Processor requires 20 ingots/min
      const nodes: MachineryNode[] = [
        {
          id: "m1",
          type: "furnace",
          name: "Smelter",
          recipe: mockSmeltIron,
          clockSpeed: 100,
        },
        {
          id: "m2",
          type: "processor",
          name: "Plate Crafter",
          recipe: mockMakePlates,
          clockSpeed: 100,
        },
      ];

      const edges: MachineryEdge[] = [
        {
          id: "e1",
          sourceNodeId: "m1",
          sourceHandle: "iron_ingot",
          targetNodeId: "m2",
          targetHandle: "iron_ingot",
        },
      ];

      const result = evaluateProductionNetwork(nodes, edges);

      expect(result.machineStats["m1"].efficiency).toBe(1);
      expect(result.machineStats["m2"].efficiency).toBe(1);
      expect(result.bottlenecks).toHaveLength(0);

      // Summary:
      // Raw input needed: scrap_metal: 40/min
      expect(result.summary.rawInputsNeeded).toEqual([{ itemId: "scrap_metal", ratePerMin: 40 }]);
      // Final output produced: iron_plate: 10/min
      expect(result.summary.netOutputsProduced).toEqual([{ itemId: "iron_plate", ratePerMin: 10 }]);
      // Total power: 40 (m1) + 50 (m2) = 90 kW
      expect(result.summary.totalPowerDraw).toBe(90);
    });

    it("detects bottleneck and scales downstream outputs when undersupplied", () => {
      // Furnace runs at 50% clock speed -> produces only 10 ingots/min
      // Processor needs 20 ingots/min -> efficiency should be 50% (0.5)
      const nodes: MachineryNode[] = [
        {
          id: "m1",
          type: "furnace",
          name: "Underclocked Smelter",
          recipe: mockSmeltIron,
          clockSpeed: 50, // produces 10 ingots/min
        },
        {
          id: "m2",
          type: "processor",
          name: "Plate Crafter",
          recipe: mockMakePlates,
          clockSpeed: 100, // needs 20 ingots/min
        },
      ];

      const edges: MachineryEdge[] = [
        {
          id: "e1",
          sourceNodeId: "m1",
          sourceHandle: "iron_ingot",
          targetNodeId: "m2",
          targetHandle: "iron_ingot",
        },
      ];

      const result = evaluateProductionNetwork(nodes, edges);

      expect(result.machineStats["m2"].efficiency).toBeCloseTo(0.5, 2);
      expect(result.bottlenecks).toHaveLength(1);
      expect(result.bottlenecks[0].nodeId).toBe("m2");
      expect(result.bottlenecks[0].itemId).toBe("iron_ingot");
      expect(result.bottlenecks[0].suppliedRate).toBeCloseTo(10, 2);
      expect(result.bottlenecks[0].demandedRate).toBeCloseTo(20, 2);

      // Output plate rate should be scaled down to 50% of 10 = 5/min
      expect(result.summary.netOutputsProduced[0].ratePerMin).toBeCloseTo(5, 2);
    });
  });
});
