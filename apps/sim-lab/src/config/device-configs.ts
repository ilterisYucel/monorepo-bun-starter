// EMS device-config dosyalarını okur — Sim-Lab'ın tek gerçeklik kaynağı:
// hangi cihaz, hangi portta, hangi register'ı hangi tipte okuyor.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";

export interface TelemetryEntry {
  name: string;
  registerAddress: number;
  registerTableType: "INPUT_REGISTER" | "HOLDING_REGISTER" | "COIL" | "DISCRETE_INPUT" | string;
  registerDataType: string;
  scale: number;
  offset?: number;
  unit?: string;
  canonical?: string;
  byteOrder?: string;
}

export interface BitfieldConfig {
  registerAddress: number;
  registerType: string;
  fields: { bitStart: number; bitEnd: number; name: string; alarmLimit?: string; logType?: string }[];
}

export interface DeviceConfig {
  file: string;
  dir: string;
  deviceId: string;
  name: string;
  type: string;
  model?: string;
  connection: { host?: string; port: number; slaveId?: number; unitId?: number };
  transport?: { kind?: string; type?: string; bmsPort?: number; registerMap?: string };
  telemetry: TelemetryEntry[];
  bitfieldConfigs?: BitfieldConfig[];
  details?: Record<string, unknown>;
  connector?: {
    device: { deviceId: string; name: string; connection: { host?: string; port: number }; telemetry: TelemetryEntry[] };
    sim?: { registerMap?: string; target?: { host?: string; port?: number } };
  };
  commands?: Record<string, unknown>;
}

export function loadDeviceConfigs(dirs: string[], baseDir: string): DeviceConfig[] {
  const out: DeviceConfig[] = [];
  for (const d of dirs) {
    const dir = resolve(baseDir, d);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      console.warn(`[sim-lab] config dizini yok: ${dir}`);
      continue;
    }
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      const file = join(dir, f);
      try {
        const j = JSON.parse(readFileSync(file, "utf-8")) as Partial<DeviceConfig>;
        if (!j.deviceId || !j.connection) continue;
        out.push({ ...(j as DeviceConfig), file, dir, type: (j.type ?? j.transport?.type ?? "") as string, telemetry: j.telemetry ?? [] });
      } catch (e) {
        console.warn(`[sim-lab] okunamadı: ${file} — ${String(e)}`);
      }
    }
  }
  return out;
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function resolveFrom(file: string, rel: string): string {
  return resolve(dirname(file), rel);
}

/** BSC telemetrisinden raf blok adımını çıkarır ("Rack State R2" adresi − "Rack State R1"). */
export function detectRackStride(cfg: DeviceConfig): number | null {
  const r1 = cfg.telemetry.find((t) => /^Rack State R1$/i.test(t.name));
  const r2 = cfg.telemetry.find((t) => /^Rack State R2$/i.test(t.name));
  if (!r1 || !r2) return null;
  return r2.registerAddress - r1.registerAddress;
}

/** Telemetri girişinin kelime sayısı. */
export function wordsOf(dt: string): number {
  const t = dt.toUpperCase();
  if (t.includes("32") || t === "FLOAT") return 2;
  if (t.includes("64")) return 4;
  return 1;
}

/** Ham kelimelerden mühendislik değeri (EMS'in göreceği). */
export function decode(entry: TelemetryEntry, words: number[]): number {
  const t = entry.registerDataType.toUpperCase();
  let raw: number;
  if (t === "INT16") raw = words[0]! >= 0x8000 ? words[0]! - 0x10000 : words[0]!;
  else if (t === "UINT32") raw = ((words[0]! << 16) >>> 0) + words[1]!;
  else if (t === "INT32") {
    raw = ((words[0]! << 16) >>> 0) + words[1]!;
    if (raw >= 0x80000000) raw -= 0x100000000;
  } else if (t === "FLOAT32" || t === "FLOAT") {
    const dv = new DataView(new ArrayBuffer(4));
    dv.setUint16(0, words[0]!);
    dv.setUint16(2, words[1] ?? 0);
    raw = dv.getFloat32(0);
  } else raw = words[0]!;
  return raw * (entry.scale ?? 1) + (entry.offset ?? 0);
}
