import { XRackSimulator, XRackSimulatorAdapter } from "@gd-monorepo/simulators";
import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";

export class XRackManager {
  private simulator: XRackSimulator;
  private adapter: IModbusSimulatorAdapter;
  private tickInterval: NodeJS.Timeout | null = null;

  constructor(rackCount: number = 16) {
    this.simulator = new XRackSimulator(rackCount);
    this.adapter = new XRackSimulatorAdapter(this.simulator);
  }

  start(intervalSeconds: number = 5): void {
    if (this.tickInterval) return;

    this.simulator.debugRack(1);
    this.simulator.tick(intervalSeconds);
    this.simulator.debugRack(1);

    this.tickInterval = setInterval(() => {
      this.simulator.tick(intervalSeconds);
    }, intervalSeconds * 1000);

    console.log(
      `[XRackManager] Started, tick every ${intervalSeconds} seconds`,
    );
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    console.log("[XRackManager] Stopped");
  }

  getAdapter(): IModbusSimulatorAdapter {
    return this.adapter;
  }

  getSimulator(): XRackSimulator {
    return this.simulator;
  }
}
