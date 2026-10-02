import {
  FirewallRunLogic,
  type FirewallRunSnapshot,
  type LaneStep,
} from "$lib/engine/firewall-run";

const STEP_BY_KEY: Record<string, LaneStep> = {
  arrowleft: -1,
  a: -1,
  arrowright: 1,
  d: 1,
};

export class FirewallRunStore {
  private readonly engine = new FirewallRunLogic();
  private animationFrame: number | null = null;
  private lastTick = 0;
  private isListening = false;

  public snapshot = $state<FirewallRunSnapshot>(this.engine.snapshot);

  /** Listen for input. Leaves the run in `idle`. */
  public start(): void {
    if (this.isListening) return;
    this.isListening = true;
    window.addEventListener("keydown", this.handleKeyDown);
  }

  public stop(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    this.stopLoop();
    this.isListening = false;
  }

  /** Begin a fresh run from `idle` or from a finished run. */
  public launch(): void {
    this.engine.start();
    this.snapshot = this.engine.snapshot;
    this.startLoop();
  }

  public move(step: LaneStep): void {
    this.engine.move(step);
    this.syncState();
  }

  private readonly loop = (now: number): void => {
    const deltaSeconds = (now - this.lastTick) / 1000;
    this.lastTick = now;
    this.engine.tick(deltaSeconds);
    this.syncState();
    if (this.snapshot.status !== "playing") {
      this.stopLoop();
      return;
    }
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.snapshot.status === "idle") {
      event.preventDefault();
      this.launch();
      return;
    }

    if (this.snapshot.status !== "playing") {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.launch();
      }
      return;
    }

    const step = STEP_BY_KEY[event.key.toLowerCase()];
    if (step === undefined) return;
    event.preventDefault();
    this.move(step);
  };

  private startLoop(): void {
    this.stopLoop();
    this.lastTick = performance.now();
    this.animationFrame = requestAnimationFrame(this.loop);
  }

  private stopLoop(): void {
    if (this.animationFrame === null) return;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
  }

  private syncState(): void {
    this.snapshot = this.engine.snapshot;
  }
}
