// BSC→PCS mapping sözleşmesi — kaynak BSC register'larının Wattox BMS
// bloğuna eşlenmesi. Kaynak: BSC-PCS-CONNECTOR-MIMARISI.md §5.

import { ValidationError } from "@gd-monorepo/result";
import { BMS_BASE, BMS_SIZE } from "../wattox-pcs/register-map";

/** Kaynak referansı — konteyner device-service içindeki BSC/EMU adapter'ı. */
export interface BscPcsSourceRef {
  deviceId: string;
  table: "input" | "holding";
  address: number;
  /** Kelime sayısı (1=uint16/sint16, 2=uint32/sint32 — big-endian). Varsayılan 1. */
  size?: number;
  /** size>1 için işaretli mi (sint32). Varsayılan false. */
  signed?: boolean;
}

/** Register→register eşlemesi: raw_pcs = round(raw_bsc × ratio + offset). */
export interface BscPcsRegisterMapping {
  kind: "register";
  from: BscPcsSourceRef;
  to: number;
  ratio: number;
  offset: number;
}

/** Bit→bit eşlemesi: kaynak register'ın N. biti → hedef register'ın M. biti. */
export interface BscPcsBitMapping {
  kind: "bit";
  from: BscPcsSourceRef & { bit: number };
  to: number;
  bit: number;
}

/** Sabit değer eşlemesi (ör. B21 anma enerji). */
export interface BscPcsConstantMapping {
  kind: "constant";
  to: number;
  value: number;
}

export type BscPcsMappingEntry =
  | BscPcsRegisterMapping
  | BscPcsBitMapping
  | BscPcsConstantMapping;

/** Mapping dosyası kökü. */
export interface BscPcsMapping {
  target: { host: string; port: number };
  intervalMs: number;
  mappings: BscPcsMappingEntry[];
}

const SOURCE_KEYS = new Set(["deviceId", "table", "address", "bit", "size", "signed"]);
const ENTRY_KEYS = new Set(["kind", "from", "to", "ratio", "offset", "bit", "value"]);

/**
 * Sorgu — mapping dosyasını STRICT parse eder; geçersiz yapı throw
 * (ValidationError — fail-fast açılış, BSC-PCS-CONNECTOR-MIMARISI §5).
 */
export function parseBscPcsMapping(raw: string): BscPcsMapping {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ValidationError("bsc-pcs.mapping-invalid", "Mapping dosyasi JSON degil");
  }

  if (typeof data !== "object" || data === null) {
    throw new ValidationError("bsc-pcs.mapping-invalid", "Mapping koku obje degil");
  }
  const obj = data as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (key !== "target" && key !== "intervalMs" && key !== "mappings") {
      throw new ValidationError(
        "bsc-pcs.mapping-invalid",
        `Bilinmeyen kok anahtar: ${key}`,
      );
    }
  }

  const target = obj["target"] as Record<string, unknown> | undefined;
  if (
    !target ||
    typeof target["host"] !== "string" ||
    typeof target["port"] !== "number"
  ) {
    throw new ValidationError("bsc-pcs.mapping-invalid", "target.host/port zorunlu");
  }

  const intervalMs = obj["intervalMs"];
  if (typeof intervalMs !== "number" || intervalMs <= 0) {
    throw new ValidationError("bsc-pcs.mapping-invalid", "intervalMs pozitif olmali");
  }

  const mappings = obj["mappings"];
  if (!Array.isArray(mappings) || mappings.length === 0) {
    throw new ValidationError("bsc-pcs.mapping-invalid", "mappings bos olamaz");
  }

  const entries = mappings.map((m) => parseEntry(m as Record<string, unknown>));
  return {
    target: { host: target["host"], port: target["port"] },
    intervalMs,
    mappings: entries,
  };
}

function parseEntry(raw: Record<string, unknown>): BscPcsMappingEntry {
  for (const key of Object.keys(raw)) {
    if (!ENTRY_KEYS.has(key)) {
      throw new ValidationError(
        "bsc-pcs.mapping-invalid",
        `Bilinmeyen mapping anahtari: ${key}`,
      );
    }
  }

  const to = raw["to"];
  if (typeof to !== "number" || !inBmsRange(to)) {
    throw new ValidationError(
      "bsc-pcs.mapping-invalid",
      `to adresi BMS blogu disinda: ${String(to)}`,
    );
  }

  switch (raw["kind"]) {
    case "register": {
      const from = parseSource(raw["from"] as Record<string, unknown> | undefined);
      if (from === undefined) throwErr("register.from zorunlu");
      if (typeof raw["ratio"] !== "number" || typeof raw["offset"] !== "number") {
        throwErr("register mapping'de ratio/offset zorunlu");
      }
      return {
        kind: "register",
        from: from!,
        to,
        ratio: raw["ratio"] as number,
        offset: raw["offset"] as number,
      };
    }
    case "bit": {
      const from = parseSource(raw["from"] as Record<string, unknown> | undefined);
      if (from === undefined || from.bit === undefined) {
        throwErr("bit mapping'de from.bit zorunlu");
      }
      if (typeof raw["bit"] !== "number") throwErr("bit mapping'de bit zorunlu");
      return {
        kind: "bit",
        from: { deviceId: from.deviceId, table: from.table, address: from.address, bit: from.bit! },
        to,
        bit: raw["bit"] as number,
      };
    }
    case "constant": {
      if (typeof raw["value"] !== "number") throwErr("constant mapping'de value zorunlu");
      return { kind: "constant", to, value: raw["value"] as number };
    }
    default:
      throw new ValidationError(
        "bsc-pcs.mapping-invalid",
        `Bilinmeyen kind: ${String(raw["kind"])}`,
      );
  }
}

function parseSource(
  raw: Record<string, unknown> | undefined,
): (BscPcsSourceRef & { bit?: number }) | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  for (const key of Object.keys(raw)) {
    if (!SOURCE_KEYS.has(key)) {
      throw new ValidationError(
        "bsc-pcs.mapping-invalid",
        `Bilinmeyen from anahtari: ${key}`,
      );
    }
  }
  if (typeof raw["deviceId"] !== "string" || raw["deviceId"].length === 0) {
    throwErr("from.deviceId zorunlu");
  }
  if (raw["table"] !== "input" && raw["table"] !== "holding") {
    throwErr("from.table input|holding olmali");
  }
  if (typeof raw["address"] !== "number") throwErr("from.address zorunlu");
  const bit = raw["bit"];
  if (bit !== undefined && typeof bit !== "number") throwErr("from.bit sayi olmali");
  const size = raw["size"];
  if (size !== undefined && (typeof size !== "number" || size < 1 || !Number.isInteger(size))) {
    throwErr("from.size pozitif tamsayi olmali");
  }
  const signed = raw["signed"];
  if (signed !== undefined && typeof signed !== "boolean") {
    throwErr("from.signed boolean olmali");
  }
  return {
    deviceId: raw["deviceId"] as string,
    table: raw["table"] as "input" | "holding",
    address: raw["address"] as number,
    ...(size !== undefined ? { size: size as number } : undefined),
    ...(signed !== undefined ? { signed: signed as boolean } : undefined),
    ...(bit !== undefined ? { bit: bit as number } : undefined),
  };
}

function throwErr(message: string): never {
  throw new ValidationError("bsc-pcs.mapping-invalid", message);
}

function inBmsRange(address: number): boolean {
  return address >= BMS_BASE && address < BMS_BASE + BMS_SIZE;
}
