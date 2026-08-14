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
    // Canonical değerler bu sözlükte birikir — kart alanları döngü sonunda okunur
    const values: Record<string, number | null> = {};
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
        // Canonical eşlemesi (generic): canonical değeri değer sözlüğüne yazılır,
        // kart alanları döngü sonunda bu sözlükten doldurulur.
        const canonical = t.tags?.canonical;
        if (canonical === "charge_power") {
          values.chargePowerKw = num(t.value);
        } else if (canonical === "discharge_power") {
          values.dischargePowerKw = num(t.value);
        } else if (canonical) {
          values[canonical] = num(t.value);
        } else {
          switch (t.name) {
            case "SOC": values.soc = num(t.value); break;
            case "SOH": values.soh = num(t.value); break;
            case "Voltage": values.voltage = num(t.value); break;
            case "Current": values.current = num(t.value); break;
            case "ChargePower": values.chargePowerKw = num(t.value); break;
            case "DischargePower": values.dischargePowerKw = num(t.value); break;
            case "AnticipatedVoltage": anticipatedVoltage = num(t.value); break;
            case "Version": version = s(t.value); break;
            case "State": state = s(t.value); break;
            case "Heartbeat": heartbeat = s(t.value); break;
            case "Request Acknowledge": requestAck = s(t.value); break;
            case "Last Accepted Req": lastAcceptedReq = s(t.value); break;
            case "Online Rack No": onlineRackCount = num(t.value) ?? 0; break;
          }
        }
      }

      if (agg === "max" && t.name === "Temperature") {
        temperature = num(t.value);
      }
    }

    const soc = values["soc"] ?? null;
    const soh = values["soh"] ?? null;
    const voltage = values["voltage"] ?? null;
    const current = values["current"] ?? null;
    const chargePowerKw = values["chargePowerKw"] ?? null;
    const dischargePowerKw = values["dischargePowerKw"] ?? null;
    const tempByCanonical = values["temperature"] ?? null;
    if (tempByCanonical !== null && temperature === null) {
      temperature = tempByCanonical;
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
