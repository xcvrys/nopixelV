import type { Position } from "$lib/engine/machinery";

export class MachineryLayoutStore {
  public positions = $state.raw<Map<string, Position>>(new Map());

  public getPosition(id: string): Position | undefined {
    return this.positions.get(id);
  }

  public setPosition(id: string, position: Position): void {
    const nextPositions = new Map(this.positions);
    nextPositions.set(id, { ...position });
    this.positions = nextPositions;
  }

  public removePosition(id: string): void {
    if (!this.positions.has(id)) return;
    const nextPositions = new Map(this.positions);
    nextPositions.delete(id);
    this.positions = nextPositions;
  }

  public setPositions(entries: Iterable<readonly [string, Position]>): void {
    const nextPositions = new Map<string, Position>();
    for (const [id, position] of entries) nextPositions.set(id, { ...position });
    this.positions = nextPositions;
  }
}

export const machineryLayoutStore = new MachineryLayoutStore();
