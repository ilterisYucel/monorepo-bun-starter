import type { BitfieldConfig } from "@gd-monorepo/shared-types";

interface RawRegisterRow {
  "MODBUS Address"?: number;
  "Hex"?: string;
  "Type"?: string;
  "Name"?: string;
  "Data Tag"?: string;
  "Variable Name"?: string;
  "Unit"?: string;
  "Scale"?: string;
  "Value"?: string;
  "Description"?: string;
  "Register Type"?: string;
  "Alarm Limit"?: string;
  "Source"?: string;
}

export interface ParsedRegister {
  address: number;
  hex: string;
  type: "uint16" | "uint32" | "int16" | "sint32" | "float32" | "uint128" | "bit16" | "enum";
  name: string;
  dataTag: string;
  variableName: string;
  unit: string;
  scale: number;
  offset: number;
  value: string;
  description: string;
  registerType: "IR" | "HR" | "DI";
  alarmLimit: string;
  isBitField: boolean;
  bitFields: { bitStart: number; bitEnd: number; name: string; description: string; severity: string }[];
}

export function parseBSCMap(raw: RawRegisterRow[]): {
  registers: ParsedRegister[];
  bitfieldConfigs: BitfieldConfig[];
} {
  const merged = mergeRows(raw);
  const registers = merged.map(m => parseRegister(m));
  const bitfieldConfigs = buildBitfieldConfigs(registers.filter(r => r.isBitField));

  return { registers, bitfieldConfigs };
}

function mergeRows(raw: RawRegisterRow[]): RawRegisterRow[] {
  const result: RawRegisterRow[] = [];
  let current: RawRegisterRow | null = null;

  for (const row of raw) {
    if (row["MODBUS Address"] !== undefined) {
      if (current) result.push(current);
      current = { ...row };
    } else if (current) {
      if (row["Value"] && current["Value"]) current["Value"] += "\n" + row["Value"];
      if (row["Description"] && current["Description"]) current["Description"] += "\n" + row["Description"];
    }
  }
  if (current) result.push(current);

  return result;
}

function parseRegister(row: RawRegisterRow): ParsedRegister {
  const address = row["MODBUS Address"] ?? 0;
  const hex = row["Hex"] ?? "0000";
  const typeRaw = (row["Type"] ?? "uint16").toLowerCase();
  const name = row["Name"] ?? "";
  const dataTag = row["Data Tag"] ?? "";
  const variableName = row["Variable Name"] ?? "";
  const unit = row["Unit"] ?? "-";
  const scale = parseScale(row["Scale"]);
  const registerType = (row["Register Type"] ?? "IR") as "IR" | "HR" | "DI";
  const alarmLimit = row["Alarm Limit"] ?? "";
  const value = row["Value"] ?? "";
  const description = row["Description"] ?? "";

  const isBitField = typeRaw === "bit16" || (value.includes("b0") && value.includes("b1"));
  const bitFields = isBitField ? parseBitFields(value, alarmLimit, typeRaw) : [];

  let type = typeRaw as ParsedRegister["type"];
  if (isBitField && type !== "bit16") type = "bit16";

  return { address, hex, type, name, dataTag, variableName, unit, scale, offset: 0, value, description, registerType, alarmLimit, isBitField, bitFields };
}

function parseScale(raw: string | undefined): number {
  if (!raw || raw === "-") return 1;
  return parseFloat(raw) || 1;
}

function parseBitFields(valueStr: string, alarmStr: string, _typeRaw: string): ParsedRegister["bitFields"] {
  const fields: ParsedRegister["bitFields"] = [];

  const lines = valueStr.split("\n").filter(l => l.trim());
  let currentSeverity = alarmStr || "";

  for (const line of lines) {
    const match = line.match(/b(\d+)\s*(?:~\s*b(\d+))?\s*:?\s*(.*)/i);
    if (!match) continue;

    const bitStart = parseInt(match[1]!, 10);
    const bitEnd = match[2] ? parseInt(match[2], 10) : bitStart;
    let name = (match[3] ?? "").trim();

    if (name.endsWith("-")) continue;

    const alarmMatch = name.match(/(Alarm|Warning|Fault)/i);
    if (alarmMatch) {
      currentSeverity = alarmMatch[1]!;
      name = name.replace(/\s*(Alarm|Warning|Fault)/i, "").trim();
    }

    fields.push({ bitStart, bitEnd, name, description: "", severity: currentSeverity });
  }

  return fields;
}

function buildBitfieldConfigs(bitRegisters: ParsedRegister[]): BitfieldConfig[] {
  const byAddress = new Map<number, ParsedRegister[]>();
  for (const r of bitRegisters) {
    if (!byAddress.has(r.address)) byAddress.set(r.address, []);
    byAddress.get(r.address)!.push(r);
  }

  const configs: BitfieldConfig[] = [];

  for (const [address, regs] of byAddress) {
    const fields: BitfieldConfig["fields"] = [];
    const registerType = regs[0]!.registerType === "HR" ? "HOLDING_REGISTER" : "INPUT_REGISTER";

    let tagCounter = 0;
    for (const reg of regs) {
      for (const bf of reg.bitFields) {
        fields.push({
          bitStart: bf.bitStart,
          bitEnd: bf.bitEnd,
          name: bf.name || `bit_${bf.bitStart}_${bf.bitEnd}`,
          dataTag: reg.dataTag || `${reg.variableName}_b${bf.bitStart}`,
          description: bf.description || `${reg.name} bit ${bf.bitStart}-${bf.bitEnd}`,
          unit: "-",
          scale: 1,
          offset: 0,
          alarmLimit: bf.severity,
        });
        tagCounter++;
      }
    }

    if (fields.length > 0) {
      configs.push({ registerAddress: address, registerType, fields });
    }
  }

  return configs;
}
