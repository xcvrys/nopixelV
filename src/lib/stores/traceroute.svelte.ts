import {
  generateBoard,
  TracerouteGame,
  type Direction,
  type GameSnapshot,
} from "$lib/engine/traceroute";

const REFRESH_INTERVAL_MS = 100;

export class TracerouteStore {
  public snapshot = $state.raw<GameSnapshot | null>(null);

  private game: TracerouteGame | null = null;
  private interval: number | null = null;

  public start(): void {
    this.stop();
    const board = generateBoard();
    const startedAt = performance.now();
    this.game = new TracerouteGame(board, startedAt);
    this.publish(this.game.tick(startedAt));
    this.interval = window.setInterval(() => this.tick(), REFRESH_INTERVAL_MS);
  }

  public move(direction: Direction): void {
    if (!this.game || this.snapshot?.status !== "playing") return;
    this.publish(this.game.move(direction, performance.now()));
  }

  public tick(): void {
    if (!this.game || this.snapshot?.status !== "playing") return;
    this.publish(this.game.tick(performance.now()));
  }

  public stop(): void {
    if (this.interval !== null) {
      window.clearInterval(this.interval);
      this.interval = null;
    }
  }

  private publish(snapshot: GameSnapshot): void {
    this.snapshot = snapshot;
    if (snapshot.status !== "playing") this.stop();
  }
}
