import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { EnergyAnalyzerSummary, EnergyAnalyzerPhase } from "../types/energy-analyzer";

function findValue(telemetries: TelemetryData[], name: string, tags?: Record<string, string>): number {
  const match = telemetries.find((t) => {
    if (t.name !== name) return false;
    if (!tags || Object.keys(tags).length === 0) return true;
    const tt = t.tags;
    if (!tt) return false;
    return Object.entries(tags).every(([k, v]) => tt[k] === v);
  });
  return typeof match?.value === "number" ? match.value : 0;
}

function buildPhase(telemetries: TelemetryData[], phase: "A" | "B" | "C"): EnergyAnalyzerPhase {
  const tag = { phase };
  const abTag = { phase: phase === "A" ? "AB" : phase === "B" ? "BC" : "CA" };
  return {
    voltageLN: findValue(telemetries, `Voltage L-N ${phase}`, tag),
    voltageLL: findValue(telemetries, `Voltage L-L ${abTag.phase}`, abTag),
    current: findValue(telemetries, `Current ${phase}`, tag),
    activePower: findValue(telemetries, `Active Power ${phase}`, tag),
    reactivePower: findValue(telemetries, `Reactive Power ${phase}`, tag),
    apparentPower: findValue(telemetries, `Apparent Power ${phase}`, tag),
    powerFactor: findValue(telemetries, `Power Factor ${phase}`, tag),
    thdCurrent: findValue(telemetries, `THD Current ${phase}`, tag),
    thdVoltage: findValue(telemetries, `THD Voltage L-N ${phase}`, tag),
  };
}

export function telemetriesToSummary(
  telemetries: TelemetryData[],
  deviceId: string,
  name: string,
): EnergyAnalyzerSummary {
  return {
    deviceId,
    name,
    frequency: findValue(telemetries, "Frequency"),
    activeEnergyDelivered: findValue(telemetries, "Active Energy Delivered"),
    activeEnergyReceived: findValue(telemetries, "Active Energy Received"),
    reactiveEnergyDelivered: findValue(telemetries, "Reactive Energy Delivered"),
    reactiveEnergyReceived: findValue(telemetries, "Reactive Energy Received"),
    apparentEnergy: findValue(telemetries, "Apparent Energy"),
    demandPowerPresent: findValue(telemetries, "Present Demand Power"),
    demandPowerPeak: findValue(telemetries, "Peak Demand Power"),
    demandCurrentPresent: findValue(telemetries, "Present Demand Current"),
    phaseA: buildPhase(telemetries, "A"),
    phaseB: buildPhase(telemetries, "B"),
    phaseC: buildPhase(telemetries, "C"),
    neutralCurrent: findValue(telemetries, "Current N", { phase: "N" }),
  };
}
