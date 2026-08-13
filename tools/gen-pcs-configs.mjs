import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
// Kullanım: bun tools/gen-pcs-configs.mjs [N]  (N = PCS sayısı, varsayılan 3)
const PCS_COUNT = Math.max(1, Number.parseInt(process.argv[2] ?? "3", 10) || 3);

// =============================================================================
// Yardımcılar
// =============================================================================

function telemetry(name, description, unit, addr, type, scale, tags, opts = {}) {
  return {
    name,
    description,
    unit,
    protocol: "MODBUS",
    registerAddress: addr,
    registerTableType: opts.table ?? "INPUT_REGISTER",
    registerDataType: type,
    scale,
    offset: 0,
    priority: opts.priority ?? 0,
    byteOrder: "BIG_ENDIAN",
    tags,
  };
}

function bit(name, bit, logType) {
  const alarm = logType
    ? { alarmLimit: name.endsWith("Warning") ? "Warning" : "Fault", logType }
    : {};
  return {
    bitStart: bit,
    bitEnd: bit,
    name,
    dataTag: name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    description: name,
    unit: "-",
    scale: 1,
    offset: 0,
    ...alarm,
  };
}

function bitfield(addr, fields, table = "INPUT_REGISTER") {
  return { registerAddress: addr, registerType: table, fields };
}

const PCS_TAGS = { component: "pcs" };
const ac = (extra = {}) => ({ ...PCS_TAGS, scope: "ac", ...extra });
const dc = (extra = {}) => ({ ...PCS_TAGS, scope: "dc", ...extra });

// =============================================================================
// PCS config (n: 1 tabanlı PCS numarası)
// =============================================================================

function pcsInputs(n) {
  const b = 5000 + 300 * (n - 1);
  return [
    telemetry("AC Voltage AB", "#n PCS-a.c. voltage AB", "V", b + 0, "UINT16", 0.1, ac({ phase: "ab" })),
    telemetry("AC Voltage BC", "#n PCS-a.c. voltage BC", "V", b + 1, "UINT16", 0.1, ac({ phase: "bc" })),
    telemetry("AC Voltage CA", "#n PCS-a.c. voltage CA", "V", b + 2, "UINT16", 0.1, ac({ phase: "ca" })),
    telemetry("AC Frequency", "#n PCS-a.c. frequency", "Hz", b + 3, "UINT32", 0.001, ac()),
    telemetry("Phase Current A", "#n PCS-A phase current", "A", b + 5, "UINT16", 0.1, ac({ phase: "a" })),
    telemetry("Phase Current B", "#n PCS-B phase current", "A", b + 6, "UINT16", 0.1, ac({ phase: "b" })),
    telemetry("Phase Current C", "#n PCS-C phase current", "A", b + 7, "UINT16", 0.1, ac({ phase: "c" })),
    telemetry("AC Active Power", "#n PCS-a.c. active power", "kW", b + 8, "INT32", 0.1, ac()),
    telemetry("AC Reactive Power", "#n PCS-a.c. reactive power", "kvar", b + 11, "INT32", 0.1, ac()),
    telemetry("AC Apparent Power", "#n PCS-a.c.apparent power", "kVA", b + 13, "INT32", 0.1, ac()),
    telemetry("Power Factor", "#n PCS-PF", "", b + 14, "INT16", 0.001, ac()),
    telemetry("DC Voltage", "#n PCS-DC voltage", "V", b + 15, "INT16", 0.1, dc()),
    telemetry("DC Current", "#n PCS-DC current", "A", b + 16, "INT16", 0.1, dc()),
    telemetry("DC Power", "#n PCS-DC power", "kW", b + 17, "INT32", 0.1, dc()),
    telemetry("IGBT Temperature", "#n PCS-IGBT temperature", "°C", b + 19, "INT16", 0.1, PCS_TAGS),
    telemetry("Cabin Temperature", "#n PCS-PCS cabin temprarure", "°C", b + 20, "INT16", 0.1, PCS_TAGS),
    telemetry("Available Charge Power", "#n PCS-Available Charge Power", "kW", b + 21, "UINT16", 0.1, PCS_TAGS),
    telemetry("Available Discharge Power", "#n PCS-Available Discharge Power", "kW", b + 22, "UINT16", 0.1, PCS_TAGS),
    telemetry("Available Inductive Reactive Power", "#n PCS-Available inductive Reactive Power", "kvar", b + 23, "UINT16", 0.1, PCS_TAGS),
    telemetry("Available Capacitive Reactive Power", "#n PCS-Available capacitive Reactive Power", "kvar", b + 24, "UINT16", 0.1, PCS_TAGS),
    telemetry("Total Charge Energy", "#n PCS-Total charge energy", "kWh", b + 25, "UINT32", 0.1, PCS_TAGS),
    telemetry("Total Discharge Energy", "#n PCS-Total discharge energy", "kWh", b + 27, "UINT32", 0.1, PCS_TAGS),
    telemetry("Daily Charge Energy", "#n PCS-Daily charge energy", "kWh", b + 29, "UINT32", 0.1, PCS_TAGS),
    telemetry("Daily Discharge Energy", "#n PCS-Daily discharge energy", "kWh", b + 31, "UINT32", 0.1, PCS_TAGS),
    telemetry("Shutdown Code", "#n PCS-Shutdown code", "", b + 33, "UINT16", 1, PCS_TAGS),
    telemetry("Power On Blocking Code", "#n PCS-Power On blocking code", "", b + 34, "UINT16", 1, PCS_TAGS),
    ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((w, i) =>
      telemetry(`Status Word ${w}`, `#n PCS-Status word ${w}`, "", b + 250 + i, "UINT16", 1, PCS_TAGS),
    ),
    ...Array.from({ length: 30 }, (_, i) =>
      telemetry(`Alarm Word ${i + 1}`, `#n PCS-Alarm Word ${i + 1}`, "", b + 260 + i, "UINT16", 1, PCS_TAGS),
    ),
  ];
}

function pcsHoldings(n) {
  const b = 5000 + 300 * (n - 1);
  const h = (name, unit, off, type, scale, tags = PCS_TAGS) =>
    telemetry(name, `#n PCS-${name}`, unit, b + off, type, scale, tags, { table: "HOLDING_REGISTER", priority: 3 });
  return [
    h("Max Charging Voltage", "V", 0, "UINT16", 1, dc()),
    h("Min Discharging Voltage", "V", 1, "UINT16", 1, dc()),
    h("Max Charging Current", "A", 2, "UINT16", 1, dc()),
    h("Max Discharging Current", "A", 3, "UINT16", 1, dc()),
    h("Limited Current Charging", "A", 4, "UINT16", 1, dc()),
    h("Limited Voltage Charging", "V", 5, "UINT16", 1, dc()),
    h("Limited Current Discharging", "A", 6, "UINT16", 1, dc()),
    h("Limited Voltage Discharging", "V", 7, "UINT16", 1, dc()),
    h("Insulation Detection Enable", "", 8, "UINT16", 1, dc()),
    h("Limited Power Charging", "kW", 10, "UINT16", 1, dc()),
    h("Limited Power Discharging", "kW", 11, "UINT16", 1, dc()),
    h("Active Power Control Method", "", 12, "UINT16", 1),
    h("Reactive Power Control Method", "", 13, "UINT16", 1),
    h("Power Priority", "", 14, "UINT16", 1),
    h("AC Active Power Setpoint", "kW", 15, "INT16", 0.1, ac()),
    h("AC Reactive Power Setpoint", "kvar", 16, "INT16", 0.1, ac()),
    h("Power Factor Setpoint", "", 17, "INT16", 0.001, ac()),
    h("Charge Forbidden", "", 18, "UINT16", 1),
    h("Discharge Forbidden", "", 19, "UINT16", 1),
    h("DC Current Setpoint", "A", 20, "INT16", 0.1, dc()),
    h("DC Voltage Setpoint", "V", 21, "UINT16", 1, dc()),
    h("DC Power Setpoint", "kW", 22, "INT16", 0.1, dc()),
    h("Offgrid Voltage Percent", "%", 23, "UINT16", 0.1),
    h("Voltage Soft Start Rate", "%/s", 24, "UINT16", 0.1),
  ];
}

function pcsBitfields(n) {
  const b = 5000 + 300 * (n - 1);
  const fields = [];
  fields.push(bitfield(b + 250, [
    bit("Run Mode", 0), bit("PCS Run", 1), bit("Warning Run", 2), bit("Derating Run", 3),
    bit("Overload Run", 4), bit("Standby", 5), bit("Hot Standby", 6),
    bit("Charge Status", 7), bit("Discharge Status", 8),
    bit("DC Voltage Limit Charge", 9), bit("DC Voltage Limit Discharge", 10),
    bit("Current Limit Charge", 11), bit("Current Limit Discharge", 12), bit("Precharge State", 13),
  ]));
  fields.push(bitfield(b + 251, [
    bit("Carrier Sync Status", 0), bit("Carrier Master", 1), bit("Carrier Slave", 2),
    bit("Power Freq Sync", 4), bit("Power Freq Master", 5), bit("Power Freq Slave", 6),
    bit("CAN Scheduling Effective", 8), bit("DC Parallel Master Slave", 9),
    bit("12V Supply", 11), bit("5V Supply", 12), bit("Drive Power", 13),
    bit("Relay Power", 14), bit("DC Aux Sleep", 15),
  ]));
  fields.push(bitfield(b + 252, [
    bit("Cooling Fan", 0), bit("Turbulence Fan", 1), bit("Positive Bus Discharge", 2),
    bit("Negative Bus Discharge", 3), bit("DC Relay Drive", 4), bit("DC Soft Start Relay", 5),
    bit("AC Relay 1", 6), bit("AC Relay 2", 7), bit("AC Soft Start Relay", 8),
    bit("Insulation Testing", 9), bit("Limiting Power", 10), bit("Serve Mode", 11),
    bit("PWM Closed", 12), bit("PWM Closed Flag", 13),
  ]));
  fields.push(bitfield(b + 254, [
    bit("Bus Meets Startup", 0), bit("Unrecoverable Fault Shutdown", 1),
    bit("Command Startup", 2), bit("Command Shutdown", 3), bit("Auto Startup", 4),
    bit("Auto Shutdown", 5), bit("Startup Process", 6), bit("Fault Recovery Delay", 9),
  ]));
  fields.push(bitfield(b + 260, [
    bit("AC Under Voltage", 0, "error"), bit("AC Over Voltage", 1, "error"),
    bit("AC Under Frequency", 2, "error"), bit("AC Over Frequency", 3, "error"),
    bit("AC Voltage Imbalance", 4, "warning"), bit("AC Current Imbalance", 5, "error"),
    bit("LVRT", 6, "warning"), bit("HVRT", 7, "warning"),
    bit("Phase Sequence Reversed", 8, "error"), bit("Phase Missing", 9, "warning"),
    bit("AC Voltage Abnormal", 10, "warning"), bit("AC Frequency Abnormal", 11, "warning"),
    bit("Anti Island", 12, "error"), bit("AC Short Circuit", 13, "error"),
    bit("AC Current Abnormal", 14, "error"), bit("Harmonic Out Of Limit", 15, "warning"),
  ]));
  fields.push(bitfield(b + 261, [
    bit("Phase Locking Out", 0, "error"), bit("AC Voltage To Ground Abnormal", 1, "error"),
    bit("Leakage Current Abnormal", 2, "error"), bit("DC Component Abnormal", 3, "error"),
    bit("AC Overcurrent", 5, "error"), bit("AC Power Abnormal", 6, "error"),
    bit("Precharge Fault", 7, "error"), bit("Reverse Current Pre Protection", 8, "warning"),
    bit("Inductance Voltage High", 9, "error"), bit("Inductance Temperature High", 10, "error"),
    bit("10Min Overvoltage", 11, "error"),
  ]));
  fields.push(bitfield(b + 263, [
    bit("Battery Low Voltage", 0, "warning"), bit("Battery Over Voltage", 1, "error"),
    bit("Battery Inverse", 2, "error"), bit("Battery Over Current", 3, "error"),
    bit("Insulation Resistance Abnormal", 4, "error"), bit("Battery Ground Voltage Abnormal", 5, "error"),
    bit("Battery Fuse Break", 6, "error"),
  ]));
  return fields;
}

function pcsCommands(n) {
  const coil = 5000 + (n - 1);
  return {
    on: {
      label: "PCS Aç",
      telemetries: [{ name: "PCS On/Off Command", value: 0 }],
      timeoutMs: 3000,
      validate: { reads: [{ name: "PCS On/Off Command", expect: 0 }] },
    },
    off: {
      label: "PCS Kapat",
      telemetries: [{ name: "PCS On/Off Command", value: 1 }],
      timeoutMs: 3000,
      validate: { reads: [{ name: "PCS On/Off Command", expect: 1 }] },
    },
    charge: {
      label: "Şarj",
      telemetries: [{ name: "AC Active Power Setpoint", value: "-{{powerKw}}" }],
      params: {
        powerKw: { type: "number", min: 0, max: 240, default: 50, required: true, label: "Güç (kW)" },
      },
      atomic: true,
      timeoutMs: 3000,
    },
    discharge: {
      label: "Deşarj",
      telemetries: [{ name: "AC Active Power Setpoint", value: "{{powerKw}}" }],
      params: {
        powerKw: { type: "number", min: 0, max: 240, default: 50, required: true, label: "Güç (kW)" },
      },
      atomic: true,
      timeoutMs: 3000,
    },
    stop: {
      label: "Durdur",
      telemetries: [{ name: "AC Active Power Setpoint", value: 0 }],
      atomic: true,
      timeoutMs: 3000,
    },
    forbid_charge: {
      label: "Şarjı Yasakla",
      telemetries: [{ name: "Charge Forbidden", value: 1 }],
      timeoutMs: 3000,
    },
    forbid_discharge: {
      label: "Deşarjı Yasakla",
      telemetries: [{ name: "Discharge Forbidden", value: 1 }],
      timeoutMs: 3000,
    },
  };
}

function buildPcs(n, deviceId, name, port) {
  return {
    deviceId,
    name,
    manufacturer: "EMU",
    model: "EMU PCS V0.0.2",
    protocol: "MODBUS",
    type: "pcs",
    connection: { host: "127.0.0.1", port, slaveId: 1 },
    pollIntervalMs: 1000,
    transport: { kind: "simulator", type: "pcs" },
    telemetry: [
      telemetry("PCS On/Off Command", `#${n} PCS-On/off command`, "", 5000 + (n - 1), "BOOLEAN", 1, PCS_TAGS, { table: "COIL", priority: 1 }),
      ...pcsInputs(n),
      ...pcsHoldings(n),
    ],
    bitfieldConfigs: pcsBitfields(n),
    commands: pcsCommands(n),
  };
}

// =============================================================================
// EMU config (istasyon seviyesi)
// =============================================================================

const EMU_TAGS = { component: "emu" };

function buildEmu(deviceId, name, port) {
  const u32 = (nm, desc, unit, addr, tags = EMU_TAGS) =>
    telemetry(nm, desc, unit, addr, "UINT32", 0.1, tags);
  const s32 = (nm, desc, unit, addr, tags = EMU_TAGS) =>
    telemetry(nm, desc, unit, addr, "INT32", 0.1, tags);
  const u16 = (nm, desc, unit, addr, tags = EMU_TAGS) =>
    telemetry(nm, desc, unit, addr, "UINT16", 1, tags);

  const inputs = [
    u32("Nominal Capacity", "Nominal capctiy", "kVA", 100),
    u32("Nominal Energy", "Nominal energy", "kWh", 102),
    telemetry("System SOC", "System SOC", "%", 104, "UINT16", 0.1, EMU_TAGS),
    telemetry("System SOH", "System SOH", "%", 105, "UINT16", 0.1, EMU_TAGS),
    u32("Available Charge Energy", "Available charge energy", "kWh", 109),
    u32("Available Discharge Energy", "Available discharge energy", "kWh", 111),
    u32("Available Charge Power", "Available charge power", "kW", 113),
    u32("Available Discharge Power", "Available discharge power", "kW", 115),
    u32("Available Inductive Reactive Power", "Available inductive reactive power", "kvar", 117),
    u32("Available Capacitive Reactive Power", "Available capacitive reactive power", "kvar", 119),
    u16("Station State", "State of the Energy Station", "", 121),
    telemetry("Power Factor", "Power factor", "", 122, "INT16", 0.001, EMU_TAGS),
    s32("Apparent Power", "Apparent power", "kVA", 123),
    s32("Active Power", "Atvice power", "kW", 125),
    s32("Reactive Power", "Reactive power", "kvar", 127),
    u32("AC Frequency", "AC Frequency", "Hz", 129, EMU_TAGS),
    s32("DC Power", "DC power", "kW", 131),
    s32("DC Current", "DC current", "A", 133),
    u32("DC Average Voltage", "DC average voltage", "V", 135, EMU_TAGS),
    u32("Daily Charged Energy", "Daily charged Energy(AC)", "kWh", 137),
    u32("Daily Discharged Energy", "Daily discharged Energy(AC)", "kWh", 139),
    u32("Monthly Charged Energy", "Monthly charged Energy(AC)", "kWh", 141),
    u32("Monthly Discharged Energy", "Monthly discharged Energy(AC)", "kWh", 143),
    u32("Annual Charged Energy", "Annual charged Energy(AC)", "kWh", 145),
    u32("Annual Discharged Energy", "Annual discharged Energy(AC)", "kWh", 147),
    u32("Total Charged Energy", "Total charged Energy(AC)", "kWh", 149),
    u32("Total Discharged Energy", "Total discharged Energy(AC)", "kWh", 151),
    u16("PCS Count", "Number of PCSs", "", 200),
    u16("Running PCS Count", "Number of running PCSs", "", 201),
    u16("Warning PCS Count", "Number of warning PCSs", "", 202),
    u16("Fault PCS Count", "Number of fault PCSs", "", 203),
    ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((w, i) =>
      u16(`Status Word ${w}`, `Status word ${w}`, "", 218 + i),
    ),
    ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((w, i) =>
      u16(`Alarm Word ${w}`, `Alarm word ${w}`, "", 228 + i),
    ),
  ];

  const holdings = [
    telemetry("Active Power Control Method", "Energy station power control parameter-active power control method", "", 1, "UINT16", 1, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("Reactive Power Control Method", "Energy station power control parameter-reactive power control method", "", 2, "UINT16", 1, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("OnOff Auto Control Method", "Energy station On/off auto control method", "", 3, "UINT16", 1, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("Remote Local Control Mode", "Remote&Local control mode", "", 4, "UINT16", 1, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("AC Active Power Setpoint", "Energy station a.c. power control-a.c. active power", "kW", 20, "INT32", 0.1, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 2 }),
    telemetry("AC Reactive Power Setpoint", "Energy station a.c. power control-a.c. reactive power", "kvar", 22, "INT32", 0.1, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("Power Factor Setpoint", "Energy station a.c. power control-power factor", "", 24, "INT16", 0.001, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("Active Scheduling Mode", "Mode configuration - Active scheduling mode", "", 1000, "UINT16", 1, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("Reactive Scheduling Mode", "Mode configuration - Reactive power scheduling mode", "", 1001, "UINT16", 1, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("Scheduling Priority", "Mode Configuration - Scheduling Priority", "", 1002, "UINT16", 1, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("AC Scheduling Active Power", "Ac side scheduling parameter - Active power", "kW", 1010, "INT16", 10, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("AC Scheduling Reactive Power", "Ac side scheduling parameter - Reactive power", "kvar", 1011, "INT16", 10, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("AC Scheduling Power Factor", "Ac side scheduling parameter - Power factor", "", 1012, "INT16", 1000, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("Charging Prohibition", "DC side scheduling parameter - Charging prohibition", "", 1020, "UINT16", 1, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("Discharge Prohibition", "DC side scheduling parameter - Discharge prohibition", "", 1021, "UINT16", 1, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("DC Constant Current", "DC side scheduling parameter - DC constant current", "A", 1022, "INT16", 10, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("DC Constant Voltage", "DC side scheduling parameter - DC constant voltage", "V", 1023, "UINT16", 1, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
    telemetry("DC Constant Power", "DC side scheduling parameter - DC constant power", "kW", 1024, "INT16", 10, EMU_TAGS, { table: "HOLDING_REGISTER", priority: 3 }),
  ];

  const coils = [
    telemetry("Station On/Off Command", "Energy Station On/off command", "", 1, "BOOLEAN", 1, EMU_TAGS, { table: "COIL", priority: 1 }),
    telemetry("ACB1 Command", "#1 ACB control command", "", 2, "BOOLEAN", 1, EMU_TAGS, { table: "COIL", priority: 3 }),
    telemetry("ACB2 Command", "#2 ACB control command", "", 3, "BOOLEAN", 1, EMU_TAGS, { table: "COIL", priority: 3 }),
  ];

  const bitfields = [
    bitfield(218, [
      bit("Allow Startup", 0), bit("ACB1 Status", 1), bit("ACB2 Status", 2), bit("EPO Status", 4),
    ]),
    bitfield(219, [
      bit("MV Load Switch Connected", 0), bit("MV Load Switch Disconnected", 1),
    ]),
    bitfield(220, Array.from({ length: 16 }, (_, i) => bit(`PCS${i + 1} RS485 Comm`, i))),
    bitfield(221, Array.from({ length: 8 }, (_, i) => bit(`PCS${i + 17} RS485 Comm`, i))),
    bitfield(222, Array.from({ length: 16 }, (_, i) => bit(`PCS${i + 1} CAN Comm`, i))),
    bitfield(228, [
      bit("Over Temperature Alarm", 3, "error"), bit("690V SPD Failure", 5, "error"),
      bit("Oil Over Temperature Alarm", 12, "warning"), bit("Oil Over Temperature Trip", 13, "error"),
      bit("Pressure Release Trip", 14, "error"), bit("Oil Level Low Trip", 15, "error"),
    ]),
    bitfield(229, [
      bit("Heavy Gas Trip", 4, "error"), bit("Auxiliary SPD Failure", 5, "error"),
    ]),
  ];

  return {
    deviceId,
    name,
    manufacturer: "EMU",
    model: "EMU V0.0.2",
    protocol: "MODBUS",
    type: "emu",
    connection: { host: "127.0.0.1", port, slaveId: 1 },
    pollIntervalMs: 1000,
    transport: { kind: "simulator", type: "emu", pcsCount: 3 },
    telemetry: [...inputs, ...holdings, ...coils],
    bitfieldConfigs: bitfields,
    commands: {
      station_on: {
        label: "İstasyon Aç",
        telemetries: [{ name: "Station On/Off Command", value: 0 }],
        timeoutMs: 3000,
        validate: { reads: [{ name: "Station On/Off Command", expect: 0 }] },
      },
      station_off: {
        label: "İstasyon Kapat",
        telemetries: [{ name: "Station On/Off Command", value: 1 }],
        timeoutMs: 3000,
        validate: { reads: [{ name: "Station On/Off Command", expect: 1 }] },
      },
    },
  };
}

// =============================================================================
// Yaz
// =============================================================================

const pcsCanonical = buildPcs(1, "PCS-1", "PCS 1", 5031);
const emuCanonical = buildEmu("EMU-1", "EMU", 5030);

writeFileSync(`${ROOT}/configs/pcs.json`, JSON.stringify(pcsCanonical, null, 2) + "\n");
writeFileSync(`${ROOT}/configs/emu.json`, JSON.stringify(emuCanonical, null, 2) + "\n");
console.log("canonical yazildi: pcs telemetry=%d bitfields=%d commands=%d; emu telemetry=%d bitfields=%d",
  pcsCanonical.telemetry.length, pcsCanonical.bitfieldConfigs.length, Object.keys(pcsCanonical.commands).length,
  emuCanonical.telemetry.length, emuCanonical.bitfieldConfigs.length);

for (const dir of [
  "packages/services/device-service/config",
  "packages/services/device-service/deployment/config-docker",
]) {
  for (let n = 1; n <= PCS_COUNT; n++) {
    const inst = buildPcs(n, `PCS-${n}`, `PCS ${n}`, 5030 + n);
    writeFileSync(`${ROOT}/${dir}/pcs-${n}.json`, JSON.stringify(inst, null, 2) + "\n");
  }
  writeFileSync(`${ROOT}/${dir}/emu-1.json`, JSON.stringify(emuCanonical, null, 2) + "\n");
  console.log("kopyalar yazildi:", dir);
}
console.log(`PCS instance sayisi: ${PCS_COUNT}`);
