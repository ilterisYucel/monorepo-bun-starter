import type { TelemetryData } from "@gd-monorepo/shared-types";

export interface MockContainer {
  containerId: string;
  name: string;
  status: "online" | "warning" | "offline";
  connected: boolean;
  latestTelemetry: TelemetryData[];
}

const NOW = Date.now();

function ts(minutes?: number): string {
  return new Date(NOW + (minutes ?? 0) * 60 * 1000).toISOString();
}

function entry(
  name: string,
  value: number | boolean | string,
  unit: string,
  deviceId: string,
  containerId: string,
  timestamp: string,
  extraTags?: Record<string, string>,
): TelemetryData {
  return {
    name,
    description: name,
    value,
    unit,
    timestamp,
    deviceId,
    tags: { container_id: containerId, ...extraTags },
  } as TelemetryData;
}

function bscEntries(deviceId: string, containerId: string, soc: number, soh: number, voltage: number, current: number, power: number, temp: number, chargeStatus: string, timestamp?: string): TelemetryData[] {
  const t = timestamp ?? ts();
  const rackSystem = { rack_id: "system" };
  return [
    entry("SOC", soc, "%", deviceId, containerId, t, rackSystem),
    entry("SOH", soh, "%", deviceId, containerId, t, rackSystem),
    entry("Voltage", voltage, "V", deviceId, containerId, t, rackSystem),
    entry("Current", current, "A", deviceId, containerId, t, rackSystem),
    entry("Power", power, "kW", deviceId, containerId, t, rackSystem),
    entry("MaxCellTemperature", temp, "°C", deviceId, containerId, t, rackSystem),
    entry("ChargeStatus", chargeStatus, "", deviceId, containerId, t, rackSystem),
    // ponytail: LG BSC limitleri — gerçek register adları (30063/30065)
    entry("AvailableChargePower", Math.round((100 - soc) * 0.6), "kW", deviceId, containerId, t, rackSystem),
    entry("AvailableDischargePower", Math.round(soc * 0.5), "kW", deviceId, containerId, t, rackSystem),
  ];
}

function cbEntries(deviceId: string, containerId: string, isClosed: boolean, isTripped: boolean, current: number, voltage: number, temp: number, timestamp?: string): TelemetryData[] {
  const t = timestamp ?? ts();
  return [
    entry("Is Closed", isClosed, "", deviceId, containerId, t),
    entry("Is Tripped", isTripped, "", deviceId, containerId, t),
    entry("Current", current, "A", deviceId, containerId, t),
    entry("Voltage", voltage, "V", deviceId, containerId, t),
    entry("Temperature", temp, "°C", deviceId, containerId, t),
  ];
}

function dcEntries(deviceId: string, containerId: string, isOn: boolean, voltage: number, current: number, power: number, temp: number, timestamp?: string): TelemetryData[] {
  const t = timestamp ?? ts();
  return [
    entry("Is On", isOn, "", deviceId, containerId, t),
    entry("Fault", false, "", deviceId, containerId, t),
    entry("Actual Voltage", voltage, "V", deviceId, containerId, t),
    entry("Actual Current", current, "A", deviceId, containerId, t),
    entry("Actual Power", power, "kW", deviceId, containerId, t),
    entry("Temperature", temp, "°C", deviceId, containerId, t),
  ];
}

function hvacEntries(deviceId: string, containerId: string, roomTemp: number, equipmentStatus: string, roomId: string, timestamp?: string): TelemetryData[] {
  const t = timestamp ?? ts();
  return [
    entry("Room Temperature", roomTemp, "°C", deviceId, containerId, t, { room: roomId }),
    entry("Equipment Status", equipmentStatus, "", deviceId, containerId, t, { room: roomId }),
  ];
}

/**
 * PCS telemetrisi — konteyner başına TEK PCS sözleşmesi (2026-08-30).
 * `activePower` İŞARETLİDİR: negatif = şarj (şebekeden çekim), pozitif = deşarj.
 * `offline` ise tüm okumalar 0 üretilir (bağlantı kopuk konteyner).
 */
function pcsEntries(deviceId: string, containerId: string, activePower: number, offline: boolean, timestamp?: string): TelemetryData[] {
  const t = timestamp ?? ts();
  const current = offline ? 0 : Math.abs(activePower) * 0.9 + 6;
  return [
    entry("AC Active Power", activePower, "kW", deviceId, containerId, t),
    entry("AC Voltage AB", offline ? 0 : 392, "V", deviceId, containerId, t),
    entry("AC Voltage BC", offline ? 0 : 391, "V", deviceId, containerId, t),
    entry("AC Voltage CA", offline ? 0 : 393, "V", deviceId, containerId, t),
    entry("AC Frequency", offline ? 0 : 50.0, "Hz", deviceId, containerId, t),
    entry("Phase Current A", current, "A", deviceId, containerId, t),
    entry("Phase Current B", current, "A", deviceId, containerId, t),
    entry("Phase Current C", current, "A", deviceId, containerId, t),
    entry("AC Reactive Power", offline ? 0 : activePower * 0.12, "kvar", deviceId, containerId, t),
    entry("AC Apparent Power", offline ? 0 : Math.abs(activePower) * 1.01, "kVA", deviceId, containerId, t),
    entry("Power Factor", offline ? 0 : 0.98, "", deviceId, containerId, t),
    entry("DC Voltage", offline ? 0 : 745, "V", deviceId, containerId, t),
    entry("DC Current", offline ? 0 : Math.abs(activePower) * 1.35, "A", deviceId, containerId, t),
    entry("DC Power", offline ? 0 : activePower * 0.985, "kW", deviceId, containerId, t),
    entry("IGBT Temperature", offline ? 0 : 52, "°C", deviceId, containerId, t),
    entry("Cabin Temperature", offline ? 0 : 33, "°C", deviceId, containerId, t),
    entry("Available Charge Power", offline ? 0 : 500, "kW", deviceId, containerId, t),
    entry("Available Discharge Power", offline ? 0 : 500, "kW", deviceId, containerId, t),
    entry("Available Inductive Reactive Power", offline ? 0 : 250, "kvar", deviceId, containerId, t),
    entry("Available Capacitive Reactive Power", offline ? 0 : 250, "kvar", deviceId, containerId, t),
    entry("Total Charge Energy", offline ? 0 : 8420, "kWh", deviceId, containerId, t),
    entry("Total Discharge Energy", offline ? 0 : 7360, "kWh", deviceId, containerId, t),
    entry("Daily Charge Energy", offline ? 0 : 320, "kWh", deviceId, containerId, t),
    entry("Daily Discharge Energy", offline ? 0 : 285, "kWh", deviceId, containerId, t),
  ];
}

function buildContainerLatest(
  containerId: string,
  pcsDeviceId: string,
  pcsActivePower: number,
  pcsOffline: boolean,
  bsc1: { soc: number; soh: number; voltage: number; current: number; power: number; temp: number; chargeStatus: string },
  bsc2: { soc: number; soh: number; voltage: number; current: number; power: number; temp: number; chargeStatus: string },
  cb1: { isClosed: boolean; isTripped: boolean; current: number; voltage: number; temp: number },
  cb2: { isClosed: boolean; isTripped: boolean; current: number; voltage: number; temp: number },
  dc1: { isOn: boolean; voltage: number; current: number; power: number; temp: number },
  dc2: { isOn: boolean; voltage: number; current: number; power: number; temp: number },
  hvacRooms: { roomId: string; temp: number; status: string }[],
): TelemetryData[] {
  return [
    ...pcsEntries(pcsDeviceId, containerId, pcsActivePower, pcsOffline),
    ...bscEntries("BSC-1", containerId, bsc1.soc, bsc1.soh, bsc1.voltage, bsc1.current, bsc1.power, bsc1.temp, bsc1.chargeStatus),
    ...bscEntries("BSC-2", containerId, bsc2.soc, bsc2.soh, bsc2.voltage, bsc2.current, bsc2.power, bsc2.temp, bsc2.chargeStatus),
    ...cbEntries("CB-1", containerId, cb1.isClosed, cb1.isTripped, cb1.current, cb1.voltage, cb1.temp),
    ...cbEntries("CB-2", containerId, cb2.isClosed, cb2.isTripped, cb2.current, cb2.voltage, cb2.temp),
    ...dcEntries("DC-1", containerId, dc1.isOn, dc1.voltage, dc1.current, dc1.power, dc1.temp),
    ...dcEntries("DC-2", containerId, dc2.isOn, dc2.voltage, dc2.current, dc2.power, dc2.temp),
    ...hvacRooms.flatMap((r) => hvacEntries("HVAC-KONTROL", containerId, r.temp, r.status, r.roomId)),
  ];
}

const MOCK_CONTAINERS: MockContainer[] = [
  {
    containerId: "container-1",
    name: "Konteyner 1",
    status: "online",
    connected: true,
    latestTelemetry: buildContainerLatest(
      "container-1",
      "PCS-1",
      -25,
      false,
      { soc: 82, soh: 95, voltage: 48.2, current: 258, power: 12.4, temp: 38, chargeStatus: "Charge" },
      { soc: 78, soh: 93, voltage: 48.0, current: 245, power: 11.8, temp: 36, chargeStatus: "Charge" },
      { isClosed: true, isTripped: false, current: 250, voltage: 48.2, temp: 32 },
      { isClosed: true, isTripped: false, current: 248, voltage: 48.0, temp: 31 },
      { isOn: true, voltage: 48.0, current: 120, power: 5.76, temp: 35 },
      { isOn: true, voltage: 47.8, current: 105, power: 5.02, temp: 34 },
      [
        { roomId: "room1", temp: 22.5, status: "Cooling" },
        { roomId: "room2", temp: 21.8, status: "Idle" },
        { roomId: "room3", temp: 23.1, status: "Cooling" },
        { roomId: "room4", temp: 22.0, status: "Idle" },
      ],
    ),
  },
  {
    containerId: "container-2",
    name: "Konteyner 2",
    status: "warning",
    connected: true,
    latestTelemetry: buildContainerLatest(
      "container-2",
      "PCS-2",
      18,
      false,
      { soc: 65, soh: 88, voltage: 46.8, current: 173, power: 8.1, temp: 42, chargeStatus: "Discharge" },
      { soc: 60, soh: 86, voltage: 46.5, current: 165, power: 7.7, temp: 40, chargeStatus: "Discharge" },
      { isClosed: true, isTripped: false, current: 170, voltage: 46.8, temp: 38 },
      { isClosed: false, isTripped: true, current: 0, voltage: 0, temp: 26 },
      { isOn: false, voltage: 0, current: 0, power: 0, temp: 28 },
      { isOn: true, voltage: 47.0, current: 90, power: 4.23, temp: 33 },
      [
        { roomId: "room1", temp: 25.0, status: "Cooling" },
        { roomId: "room2", temp: 24.5, status: "Cooling" },
        { roomId: "room3", temp: 25.8, status: "Heating" },
        { roomId: "room4", temp: 24.2, status: "Cooling" },
      ],
    ),
  },
  {
    containerId: "container-3",
    name: "Konteyner 3",
    status: "offline",
    connected: false,
    latestTelemetry: buildContainerLatest(
      "container-3",
      "PCS-3",
      0,
      true,
      { soc: 0, soh: 72, voltage: 0, current: 0, power: 0, temp: 0, chargeStatus: "Idle" },
      { soc: 0, soh: 70, voltage: 0, current: 0, power: 0, temp: 0, chargeStatus: "Idle" },
      { isClosed: false, isTripped: false, current: 0, voltage: 0, temp: 0 },
      { isClosed: false, isTripped: false, current: 0, voltage: 0, temp: 0 },
      { isOn: false, voltage: 0, current: 0, power: 0, temp: 0 },
      { isOn: false, voltage: 0, current: 0, power: 0, temp: 0 },
      [
        { roomId: "room1", temp: 0, status: "Idle" },
        { roomId: "room2", temp: 0, status: "Idle" },
        { roomId: "room3", temp: 0, status: "Idle" },
        { roomId: "room4", temp: 0, status: "Idle" },
      ],
    ),
  },
];

export function mockContainers(): MockContainer[] {
  return MOCK_CONTAINERS;
}
// =============================================================================
// Faz 5.1 B4: mockPcs/mockEmu/mockTimeSeries/mockFieldAggregate KALDIRILDI —
// saha PANO artık konteyner snapshot'ından beslenir (features/dashboard).
// Kalan tek tüketici FieldManeuverPanel'dir (mockContainers) — komut paneli
// hedef listesi Faz 6'da gerçek kayıt defterine bağlanacak.
// =============================================================================
