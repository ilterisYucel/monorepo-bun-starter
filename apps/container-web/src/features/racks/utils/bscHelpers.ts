import type { TelemetryData, ChargeStatus } from "@gd-monorepo/shared-types";
import type { BSCCardProps } from "@gd-monorepo/ui";
import type { DeviceInfo } from "../../devices/types/device";

const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

const s = (v: unknown): string => {
  if (v === null || v === undefined) return "N/A";
  return String(v);
};

export const telemetriesToBscSummaries = (
  telemetries: TelemetryData[],
  globalChargeStatus: ChargeStatus,
  bscDevices: DeviceInfo[],
): BSCCardProps[] => {
  const result: BSCCardProps[] = [];

  for (const device of bscDevices) {
    let soc: number | null = null;
    let soh: number | null = null;
    let voltage: number | null = null;
    let current: number | null = null;
    let chargePowerKw: number | null = null;
    let dischargePowerKw: number | null = null;
    let anticipatedVoltage: number | null = null;
    let version = "N/A";
    let state = "N/A";
    let heartbeat = "N/A";
    let requestAck = "N/A";
    let lastAcceptedReq = "N/A";
    let temperature: number | null = null;
    let onlineRackCount = 0;

    let systemCount = 0;
    for (const t of telemetries) {
      if (t.deviceId !== device.id) continue;
      if (t.tags?.rack_id !== "system") continue;
      systemCount++;

      const agg = t.tags?.aggregation;

      if (!agg) {
        // Kanonik metrik eşlemesi — legacy name case'leri fallback olarak durur
        switch (t.tags?.canonical) {
          case "soc": soc = num(t.value); continue;
          case "soh": soh = num(t.value); continue;
          case "voltage": voltage = num(t.value); continue;
          case "current": current = num(t.value); continue;
          case "charge_power": chargePowerKw = num(t.value); continue;
          case "discharge_power": dischargePowerKw = num(t.value); continue;
        }

        switch (t.name) {
          case "SOC": soc = num(t.value); break;
          case "SOH": soh = num(t.value); break;
          case "Voltage": voltage = num(t.value); break;
          case "Current": current = num(t.value); break;
          case "ChargePower": chargePowerKw = num(t.value); break;
          case "DischargePower": dischargePowerKw = num(t.value); break;
          case "AnticipatedVoltage": anticipatedVoltage = num(t.value); break;
          case "Version": version = s(t.value); break;
          case "State": state = s(t.value); break;
          case "Heartbeat": heartbeat = s(t.value); break;
          case "Request Acknowledge": requestAck = s(t.value); break;
          case "Last Accepted Req": lastAcceptedReq = s(t.value); break;
          case "Online Rack No": onlineRackCount = num(t.value) ?? 0; break;
        }
      }

      if (agg === "max" && t.name === "Temperature") {
        temperature = num(t.value);
      }
    }

    console.log(`[bscHelpers] ${device.id}: ${systemCount} sys, ch=${chargePowerKw} disch=${dischargePowerKw} ant=${anticipatedVoltage} ver=${version} st=${state} hb=${heartbeat} ack=${requestAck} lr=${lastAcceptedReq}`);

    result.push({
      name: device.id,
      status: device.status,
      chargeStatus: globalChargeStatus,
      soc,
      soh,
      rackCount: device.rack_count ?? 0,
      onlineRackCount,
      systemPowerKw: chargePowerKw,
      voltage,
      current,
      chargePowerKw,
      dischargePowerKw,
      anticipatedVoltage,
      temperature,
      version,
      state,
      heartbeat,
      requestAck,
      lastAcceptedReq,
    });
  }

  return result;
};
