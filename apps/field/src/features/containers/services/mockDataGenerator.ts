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

function latest(name: string, value: number | boolean | string, unit: string, deviceId: string, containerId: string, extraTags?: Record<string, string>): TelemetryData {
  return entry(name, value, unit, deviceId, containerId, ts(), extraTags);
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

function buildContainerLatest(
  containerId: string,
  bsc1: { soc: number; soh: number; voltage: number; current: number; power: number; temp: number; chargeStatus: string },
  bsc2: { soc: number; soh: number; voltage: number; current: number; power: number; temp: number; chargeStatus: string },
  cb1: { isClosed: boolean; isTripped: boolean; current: number; voltage: number; temp: number },
  cb2: { isClosed: boolean; isTripped: boolean; current: number; voltage: number; temp: number },
  dc1: { isOn: boolean; voltage: number; current: number; power: number; temp: number },
  dc2: { isOn: boolean; voltage: number; current: number; power: number; temp: number },
  hvacRooms: { roomId: string; temp: number; status: string }[],
): TelemetryData[] {
  return [
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

export function mockContainer(containerId: string): MockContainer | undefined {
  return MOCK_CONTAINERS.find((c) => c.containerId === containerId);
}

export function mockTimeSeries(containerId: string, rangeMs?: number): TelemetryData[] {
  const container = MOCK_CONTAINERS.find((c) => c.containerId === containerId);
  if (!container) return [];

  const baseEntries = container.latestTelemetry.filter(
    (t) => typeof t.value === "number",
  );

  const points = 288;
  const durationMs = rangeMs ?? 24 * 60 * 60 * 1000;
  const intervalMs = durationMs / points;

  const result: TelemetryData[] = [];

  for (let i = 0; i < points; i++) {
    const time = new Date(NOW - durationMs + i * intervalMs).toISOString();
    const noise = (Math.random() - 0.5) * 0.1; // NOSONAR — mock data only, not security-sensitive

    for (const base of baseEntries) {
      const baseVal = base.value as number;
      const wave = Math.sin((i / points) * Math.PI * 2 + (baseVal * 0.05)) * baseVal * 0.03;
      const val = Math.max(0, baseVal + baseVal * noise + wave);

      result.push(
        entry(
          base.name,
          Math.round(val * 100) / 100,
          base.unit,
          base.deviceId,
          containerId,
          time,
          base.tags
            ? Object.fromEntries(
                Object.entries(base.tags).filter(([k]) => k !== "container_id"),
              )
            : undefined,
        ),
      );
    }
  }

  return result;
}

export function mockAllTimeSeries(containerIds: string[], rangeMs?: number): TelemetryData[] {
  return containerIds.flatMap((id) => mockTimeSeries(id, rangeMs));
}

// =============================================================================
// PCS telemetrisi (field device-service tarafından poll edilen, konteyner başına bir PCS)
// Register adları: EMU Modbus TCP V0.0.2 — PCS Modules bloğu
// =============================================================================

export interface MockPcs {
  pcsId: string;
  containerId: string;
  containerName: string;
  connected: boolean;
  latestTelemetry: TelemetryData[];
}

function containerPowerKw(container: MockContainer): number {
  return container.latestTelemetry
    .filter((t) => t.name === "Power" && t.deviceId.startsWith("BSC") && t.tags?.rack_id === "system")
    .reduce((sum, t) => sum + (t.value as number), 0);
}

function containerChargeState(container: MockContainer): "Charge" | "Discharge" | "Idle" {
  const statuses = container.latestTelemetry
    .filter((t) => t.name === "ChargeStatus")
    .map((t) => t.value as string);
  if (statuses.includes("Charge")) return "Charge";
  if (statuses.includes("Discharge")) return "Discharge";
  return "Idle";
}

function pcsEntries(containerId: string, pcsId: string, powerKw: number, t: string): TelemetryData[] {
  // İşaret kuralı (EMU dökümanı): + = deşarj, − = şarj
  const signed = Math.round(powerKw * 10) / 10;
  const absP = Math.abs(signed);
  const pf = absP > 0 ? 0.99 : 0;
  const apparent = pf > 0 ? absP / pf : 0;
  const reactive = pf > 0 ? absP * Math.tan(Math.acos(pf)) : 0;
  const phaseCurrent = (absP * 1000) / (400 * Math.sqrt(3));
  const dcCurrent = (absP * 1000) / 750;
  const ac = (extra?: Record<string, string>) => ({ scope: "ac", ...extra });

  return [
    entry("AC Voltage AB", 400, "V", pcsId, containerId, t, ac({ phase: "ab" })),
    entry("AC Voltage BC", 400, "V", pcsId, containerId, t, ac({ phase: "bc" })),
    entry("AC Voltage CA", 400, "V", pcsId, containerId, t, ac({ phase: "ca" })),
    entry("AC Frequency", 50, "Hz", pcsId, containerId, t, ac()),
    entry("Phase Current A", phaseCurrent, "A", pcsId, containerId, t, ac({ phase: "a" })),
    entry("Phase Current B", phaseCurrent, "A", pcsId, containerId, t, ac({ phase: "b" })),
    entry("Phase Current C", phaseCurrent, "A", pcsId, containerId, t, ac({ phase: "c" })),
    entry("AC Active Power", signed, "kW", pcsId, containerId, t, ac()),
    entry("AC Reactive Power", Math.round(reactive * 10) / 10, "kvar", pcsId, containerId, t, ac()),
    entry("AC Apparent Power", Math.round(apparent * 10) / 10, "kVA", pcsId, containerId, t, ac()),
    entry("Power Factor", pf, "", pcsId, containerId, t, ac()),
    entry("DC Voltage", 750, "V", pcsId, containerId, t, { scope: "dc" }),
    entry("DC Current", Math.round(dcCurrent * 10) / 10, "A", pcsId, containerId, t, { scope: "dc" }),
    entry("DC Power", signed, "kW", pcsId, containerId, t, { scope: "dc" }),
    entry("IGBT Temperature", 42 + (absP / 240) * 15, "°C", pcsId, containerId, t),
    entry("Cabin Temperature", 28 + (absP / 240) * 8, "°C", pcsId, containerId, t),
    entry("Available Charge Power", Math.round((240 - (signed < 0 ? absP : 0)) * 10) / 10, "kW", pcsId, containerId, t),
    entry("Available Discharge Power", Math.round((240 - (signed > 0 ? absP : 0)) * 10) / 10, "kW", pcsId, containerId, t),
    entry("Available Inductive Reactive Power", 240, "kvar", pcsId, containerId, t),
    entry("Available Capacitive Reactive Power", 240, "kvar", pcsId, containerId, t),
    entry("Total Charge Energy", 1240, "kWh", pcsId, containerId, t),
    entry("Total Discharge Energy", 980, "kWh", pcsId, containerId, t),
    entry("Daily Charge Energy", 42, "kWh", pcsId, containerId, t),
    entry("Daily Discharge Energy", 36, "kWh", pcsId, containerId, t),
  ];
}

export function mockPcs(pcsId: string): MockPcs | undefined {
  const n = Number(pcsId.replace("PCS-", ""));
  const container = MOCK_CONTAINERS[n - 1];
  if (!container) return undefined;

  const state = containerChargeState(container);
  const powerKw = container.connected ? containerPowerKw(container) : 0;
  const signedPower = state === "Charge" ? -powerKw : state === "Discharge" ? powerKw : 0;

  return {
    pcsId,
    containerId: container.containerId,
    containerName: container.name,
    connected: container.connected,
    latestTelemetry: pcsEntries(container.containerId, pcsId, signedPower, ts()),
  };
}

export function mockPcsList(): MockPcs[] {
  return MOCK_CONTAINERS.map((_, i) => mockPcs(`PCS-${i + 1}`)!);
}

// =============================================================================
// EMU istasyon telemetrisi (field device-service — EMU cihazı)
// =============================================================================

export interface MockEmu {
  latestTelemetry: TelemetryData[];
  pcsCount: number;
  runningPcsCount: number;
}

export function mockEmu(): MockEmu {
  const pcsList = mockPcsList();
  const connected = pcsList.filter((p) => p.connected);
  const activePower = connected.reduce(
    (sum, p) => sum + ((p.latestTelemetry.find((x) => x.name === "AC Active Power")?.value as number) ?? 0),
    0,
  );
  const socs = connected.map((p) => {
    const c = MOCK_CONTAINERS.find((m) => m.containerId === p.containerId);
    return c?.latestTelemetry.find((t) => t.name === "SOC" && t.tags?.rack_id === "system")?.value as number ?? 0;
  });
  const avgSoc = socs.length > 0 ? socs.reduce((a, b) => a + b, 0) / socs.length : 0;
  const pf = activePower !== 0 ? 0.99 : 0;
  const apparent = pf > 0 ? Math.abs(activePower) / pf : 0;
  const reactive = pf > 0 ? Math.abs(activePower) * Math.tan(Math.acos(pf)) : 0;
  const stationState = activePower < 0 ? 4 : activePower > 0 ? 5 : 3;

  const t = ts();
  const emuId = "EMU-1";
  const e = (name: string, value: number, unit: string, extraTags?: Record<string, string>): TelemetryData =>
    entry(name, Math.round(value * 10) / 10, unit, emuId, "field", t, { scope: "station", ...extraTags });

  return {
    pcsCount: pcsList.length,
    runningPcsCount: connected.length,
    latestTelemetry: [
      e("Nominal Capacity", 750, "kVA"),
      e("System SOC", avgSoc, "%"),
      e("System SOH", 94.2, "%"),
      e("Station State", stationState, ""),
      e("Active Power", activePower, "kW"),
      e("Reactive Power", reactive, "kvar"),
      e("Apparent Power", apparent, "kVA"),
      e("Power Factor", pf, ""),
      e("AC Frequency", 50, "Hz"),
      e("DC Voltage", 750, "V"),
      e("DC Current", Math.abs(activePower) * 1000 / 750, "A"),
      e("DC Power", activePower, "kW"),
      e("Available Charge Power", 720 - (activePower < 0 ? -activePower : 0), "kW"),
      e("Available Discharge Power", 720 - (activePower > 0 ? activePower : 0), "kW"),
      e("Total Charged Energy", 3720, "kWh"),
      e("Total Discharged Energy", 2940, "kWh"),
      e("Daily Charged Energy", 126, "kWh"),
      e("Daily Discharged Energy", 108, "kWh"),
    ],
  };
}

// =============================================================================
// Saha toplam serisi (dashboard + charts için)
// =============================================================================

export function mockFieldAggregate(rangeMs?: number): TelemetryData[] {
  const points = 288;
  const durationMs = rangeMs ?? 24 * 60 * 60 * 1000;
  const intervalMs = durationMs / points;
  const connected = MOCK_CONTAINERS.filter((c) => c.connected);
  const basePower = connected.reduce((sum, c) => sum + containerPowerKw(c), 0);
  const baseSoc =
    connected.reduce((sum, c) => {
      const soc = c.latestTelemetry.find(
        (t) => t.name === "SOC" && t.tags?.rack_id === "system",
      );
      return sum + ((soc?.value as number) ?? 0);
    }, 0) / Math.max(1, connected.length);

  const result: TelemetryData[] = [];
  for (let i = 0; i < points; i++) {
    const t = new Date(NOW - durationMs + i * intervalMs).toISOString();
    const wave = Math.sin((i / points) * Math.PI * 2);
    const power = Math.max(0, basePower * (1 + wave * 0.25) + wave * 2);
    const soc = Math.min(100, Math.max(0, baseSoc + wave * 3));

    result.push(
      entry("TotalPower", Math.round(power * 10) / 10, "kW", "FIELD", "field", t, { scope: "field" }),
      entry("AvgSoc", Math.round(soc * 10) / 10, "%", "FIELD", "field", t, { scope: "field" }),
    );
  }
  return result;
}
