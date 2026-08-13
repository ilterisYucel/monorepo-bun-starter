import { describe, it, expect, vi } from "vitest";
import { SimulatorTransport } from "./simulator-transport";
import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";

function mockSim(): IModbusSimulatorAdapter {
  return {
    readHoldingRegisters: vi.fn().mockResolvedValue([1]),
    writeHoldingRegisters: vi.fn().mockResolvedValue(undefined),
    readInputRegisters: vi.fn().mockResolvedValue([2]),
    readCoils: vi.fn().mockResolvedValue([true]),
    writeMultipleCoils: vi.fn().mockResolvedValue(undefined),
    readDiscreteInputs: vi.fn().mockResolvedValue([false]),
  };
}

describe("SimulatorTransport", () => {
  it("connect ticker'ı başlatır, disconnect durdurur", async () => {
    vi.useFakeTimers();
    const tick = vi.fn();
    const transport = new SimulatorTransport(mockSim(), tick, 1000);

    await transport.connect();
    vi.advanceTimersByTime(3000);
    expect(tick).toHaveBeenCalledTimes(3);

    await transport.disconnect();
    vi.advanceTimersByTime(3000);
    expect(tick).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it("çift connect ticker'ı çoğaltmaz", async () => {
    vi.useFakeTimers();
    const tick = vi.fn();
    const transport = new SimulatorTransport(mockSim(), tick, 1000);

    await transport.connect();
    await transport.connect();
    vi.advanceTimersByTime(3000);
    expect(tick).toHaveBeenCalledTimes(3);

    await transport.disconnect();
    vi.useRealTimers();
  });

  it("okuma/yazmaları simulator adapter'ına delege eder", async () => {
    const sim = mockSim();
    const transport = new SimulatorTransport(sim, () => {}, 1000);

    expect(await transport.readHoldingRegisters(10, 2)).toEqual([1]);
    expect(await transport.readInputRegisters(20, 1)).toEqual([2]);
    expect(await transport.readCoils(30, 1)).toEqual([true]);
    expect(await transport.readDiscreteInputs(40, 1)).toEqual([false]);

    await transport.writeHoldingRegisters(10, [7]);
    await transport.writeCoils(30, [false]);

    expect(sim.writeHoldingRegisters).toHaveBeenCalledWith(10, [7]);
    expect(sim.writeMultipleCoils).toHaveBeenCalledWith(30, [false]);
  });

  it("isConnected her zaman true, reconnect no-op", async () => {
    const transport = new SimulatorTransport(mockSim(), () => {}, 1000);
    expect(transport.isConnected()).toBe(true);
    await expect(transport.reconnect()).resolves.toBeUndefined();
  });
});
