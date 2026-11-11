import type { TelemetryData } from "@gd-monorepo/shared-types";

/**
 * Telemetri yardımcıları (saf). TelemetryData düz satırlardır; cihaz/rack
 * ayrımı `deviceId` + `tags.canonical` / `tags.rack_id` / `name` ile yapılır.
 */

/** deviceId → satırlar indeksi. */
export function indexByDevice(
  rows: TelemetryData[],
): Map<string, TelemetryData[]> {
  const map = new Map<string, TelemetryData[]>();
  for (const r of rows) {
    const list = map.get(r.deviceId);
    if (list) list.push(r);
    else map.set(r.deviceId, [r]);
  }
  return map;
}

/** Sayıya çevrilebiliyorsa döner; boolean/string için de dener. */
export function num(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const n = Number.parseFloat(value.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Telemetri değerinin doğruluk (truthy) yorumu — pozisyon/anahtar okuma. */
export function truthy(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "1" || v === "true" || v === "closed" || v === "on" || v === "kapali";
  }
  return false;
}

/** Adı tam eşleşen satır. */
export function byName(
  rows: TelemetryData[] | undefined,
  name: string,
): TelemetryData | undefined {
  return rows?.find((r) => r.name === name);
}

/** Canonical etiketli satır (opsiyonel rack_id). */
export function byCanonical(
  rows: TelemetryData[] | undefined,
  canonical: string,
  rackId?: string,
): TelemetryData | undefined {
  return rows?.find(
    (r) =>
      r.tags?.canonical === canonical &&
      (rackId === undefined || r.tags?.rack_id === rackId),
  );
}

/** Canonical değer (sayı). */
export function canonicalNumber(
  rows: TelemetryData[] | undefined,
  canonical: string,
  rackId?: string,
): number | undefined {
  return num(byCanonical(rows, canonical, rackId)?.value);
}

/** `Rack Max Pack Temp R{n}` gibi isim kalıplarından rakam yakalar. */
export function rackNumber(name: string): number | undefined {
  const m = /R(\d+)\s*$/.exec(name);
  return m ? Number.parseInt(m[1], 10) : undefined;
}

/** İsim kalıbına uyan satırları rack numarasına göre döner. */
export function rowsMatching(
  rows: TelemetryData[] | undefined,
  re: RegExp,
): Array<{ rack: number; value: number }> {
  const out: Array<{ rack: number; value: number }> = [];
  for (const r of rows ?? []) {
    if (!re.test(r.name)) continue;
    const rack = rackNumber(r.name);
    const value = num(r.value);
    if (rack !== undefined && value !== undefined) out.push({ rack, value });
  }
  return out.sort((a, b) => a.rack - b.rack);
}
