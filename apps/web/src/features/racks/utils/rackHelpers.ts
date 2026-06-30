// apps/web/src/features/racks/utils/rackHelpers.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { Rack } from "../types/rack";
import type { DeviceInfo } from "../../devices/types/device";
import type { RackDetailData, RackExtendedTelemetry, RackNameplate, RackDiagnosticGroup } from "../components/RackDetailModal/RackDetailModal.types";

export const telemetriesToRacks = (
  telemetries: TelemetryData[],
  globalChargeStatus: "Charge" | "Discharge" | "Idle",
  bscDevices: DeviceInfo[],
): Rack[] => {
  const rackMap = new Map<string, Rack>();

  for (const device of bscDevices) {
    for (let i = 1; i <= (device.rack_count ?? 0); i++) {
      const key = `${device.id}-${i}`;
      rackMap.set(key, {
        id: i,
        deviceId: device.id,
        name: `${device.id} Rack ${i}`,
        status: "offline",
        charge_status: globalChargeStatus,
        soc: null,
        soh: null,
        voltage: null,
        current: null,
        power_kw: null,
        temperature: null,
      });
    }
  }

  for (const telemetry of telemetries) {
    const raw = telemetry.tags?.rack_id;
    if (!raw || raw === "system") continue;
    const rackId = parseInt(raw, 10);
    if (isNaN(rackId)) continue;

    const key = `${telemetry.deviceId}-${rackId}`;
    const rack = rackMap.get(key);
    if (!rack) continue;

    const name = telemetry.name.replace(/\s+R\d+$/, "");

    switch (name) {
      case "Battery Ready":
        rack.status = telemetry.value === 1 ? "online" : "offline";
        break;
      case "SOC":
        rack.soc = telemetry.value as number;
        break;
      case "SOH":
        rack.soh = telemetry.value as number;
        break;
      case "Voltage":
        rack.voltage = telemetry.value as number;
        break;
      case "Current":
        rack.current = telemetry.value as number;
        break;
      case "ChargePower":
        rack.power_kw = telemetry.value as number;
        break;
      case "Temperature":
        rack.temperature = telemetry.value as number;
        break;
      case "ChargeStatus":
        rack.charge_status =
          telemetry.value === 1
            ? "Charge"
            : telemetry.value === 2
              ? "Discharge"
              : "Idle";
        break;
      case "Rack SOC":
        rack.soc = telemetry.value as number;
        break;
      case "Rack SOH":
        rack.soh = telemetry.value as number;
        break;
      case "Rack Cell Sum Voltage":
        rack.voltage = telemetry.value as number;
        break;
      case "Rack Current":
        rack.current = telemetry.value as number;
        break;
      case "Rack Max Pack Temp":
        rack.temperature = telemetry.value as number;
        break;
    }
  }

  return Array.from(rackMap.values());
};

const n = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const num = Number(v);
  return isNaN(num) ? null : num;
};

const s = (v: unknown): string => String(v ?? "");

// ponytail: hardcoded BSC diagnostic groups, swap with config API when other device types need it
const SYSTEM_DIAG_GROUPS: [string, string[]][] = [
  ["BSC Durumu", ["BSC Alarm", "BSC Warning", "BSC Fault"]],
  ["Kontrolcü Bağlantısı", ["Controller LOC Alarm", "Controller LOC Warning", "Controller LOC Fault"]],
  ["Güç Koruması", ["Over Charge Power Alarm", "Over Charge Power Warning", "Over Charge Power Fault", "Over Discharge Power Alarm", "Over Discharge Power Warning", "Over Discharge Power Fault"]],
  ["Sistem Log", ["SLF (System Logging Failure) Alarm", "SLF (System Logging Failure) Warning", "SLF (System Logging Failure) Fault"]],
  ["Çoklu Raf", ["MFRD (Multiple Fault Rack) Alarm", "MFRD (Multiple Fault Rack) Warning", "MFRD (Multiple Fault Rack) Fault"]],
  ["Çevrimdışı Raf", ["Over Offline Rack Alarm", "Over Offline Rack Warning", "Over Offline Rack Fault"]],
  ["Yazılım Uyuşmazlığı", ["RBMS SW Version Mismatch Alarm", "RBMS SW Version Mismatch Warning", "RBMS SW Version Mismatch Fault"]],
];

const RACK_DIAG_GROUPS: [string, string[]][] = [
  ["Raf Durumu", ["Warning", "Fault", "Cell Balancing", "DC Line Closed", "Battery Ready", "Charge Power Derating", "Current Sensor Type"]],
  ["Bileşen Durumu", ["PC Status", "MC(+) Status", "MC(-) Status", "CB Status", "Pack Fan1", "Pack Fan2", "BPU Fan"]],
];

const extractDiagnostics = (
  telemetries: TelemetryData[],
  rackDeviceId: string,
  rackId: number,
): RackDiagnosticGroup[] => {
  const groups: RackDiagnosticGroup[] = [];

  for (const [groupName, names] of SYSTEM_DIAG_GROUPS) {
    const flags = names.map((name) => {
      const entry = telemetries.find(
        (t) => t.name === name && t.deviceId === rackDeviceId && (!t.tags?.rack_id || t.tags.rack_id === "system"),
      );
      return { name, active: entry ? entry.value === 1 : false };
    });
    groups.push({ register: groupName, flags });
  }

  const rackIdStr = String(rackId);
  for (const [groupName, names] of RACK_DIAG_GROUPS) {
    const flags = names.map((name) => {
      const entry = telemetries.find(
        (t) => t.name === name && t.deviceId === rackDeviceId && t.tags?.rack_id === rackIdStr,
      );
      return { name, active: entry ? entry.value === 1 : false };
    });
    groups.push({ register: groupName, flags });
  }

  return groups;
};

export const telemetriesToRackDetailMap = (
  telemetries: TelemetryData[],
  globalChargeStatus: "Charge" | "Discharge" | "Idle",
  bscDevices: DeviceInfo[],
): Map<string, RackDetailData> => {
  const racks = telemetriesToRacks(telemetries, globalChargeStatus, bscDevices);
  const detailMap = new Map<string, RackDetailData>();

  for (const rack of racks) {
    const key = `${rack.deviceId}-${rack.id}`;
    const ext: RackExtendedTelemetry = {
      chargePowerLimit: null,
      dischargePowerLimit: null,
      maxCellVoltage: null,
      minCellVoltage: null,
      avgCellVoltage: null,
      maxPackTemperature: null,
      minPackTemperature: null,
      avgPackTemperature: null,
      maxDiffTempRack: null,
      maxDiffTempPack: null,
      balancingTime: null,
      mcOpenCount: null,
      nonBalancingPeriod: null,
      liveUnitCount: null,
      heartbeat: null,
    };
    const np: RackNameplate = {};

    const device = bscDevices.find((d) => d.id === rack.deviceId);
    if (device) {
      np.manufacturer = device.manufacturer ?? undefined;
      np.model = device.model ?? undefined;
      np.packCount = device.rack_count ?? undefined;
    }

    for (const t of telemetries) {
      const rawRackId = t.tags?.rack_id;
      if (!rawRackId || rawRackId === "system") continue;
      const rackId = parseInt(rawRackId, 10);
      if (isNaN(rackId) || rackId !== rack.id) continue;
      if (t.deviceId !== rack.deviceId) continue;

      const name = t.name;
      const agg = t.tags?.aggregation as string | undefined;
      const val = t.value;

      if (name === "CellVoltage") {
        if (agg === "max") ext.maxCellVoltage = n(val);
        else if (agg === "min") ext.minCellVoltage = n(val);
        else if (agg === "avg") ext.avgCellVoltage = n(val);
      } else if (name === "CellLocation") {
        if (agg === "max") ext.maxCellLocation = s(val);
        else if (agg === "min") ext.minCellLocation = s(val);
      } else if (name === "Temperature") {
        if (agg === "max") ext.maxPackTemperature = n(val);
        else if (agg === "min") ext.minPackTemperature = n(val);
        else if (agg === "avg") ext.avgPackTemperature = n(val);
      } else if (name === "BalanceTime") {
        ext.balancingTime = n(val);
      } else if (name === "Heartbeat") {
        ext.heartbeat = n(val);
      } else if (name === "OpenCount") {
        ext.mcOpenCount = n(val);
      } else if (name === "NonBalancePeriod") {
        ext.nonBalancingPeriod = n(val);
      } else if (name === "State") {
        ext.state = s(val);
      } else if (name === "Count") {
        ext.liveUnitCount = n(val);
      } else if (name === "DischargePower") {
        ext.dischargePowerLimit = n(val);
      } else if (name === "Version") {
        if (!np.firmwareVersion) np.firmwareVersion = s(val);
      } else if (name === "SerialNumber") {
        if (!np.serialNumber) np.serialNumber = s(val);
      } else if (name === "SWName") {
        if (!np.bmsSwName) np.bmsSwName = s(val);
      } else if (name === "SensorType") {
        if (!np.currentSensorType) np.currentSensorType = s(val);
      } else if (name === "Type") {
        if (!np.packType) np.packType = s(val);
      } else if (name === "CloseCurrent") {
        if (np.relayCloseCurrent === undefined) np.relayCloseCurrent = n(val);
      }
    }

    const hasNameplate = np.manufacturer || np.firmwareVersion || np.serialNumber || np.packType || np.bmsSwName;
    const diagnostics = extractDiagnostics(telemetries, rack.deviceId, rack.id);
    detailMap.set(key, {
      ...rack,
      nameplate: hasNameplate ? np : undefined,
      extendedTelemetry: ext,
      diagnostics,
    });
  }

  return detailMap;
};