/**
 * Device config drift denetimi (saf karşılaştırma).
 *
 * Kök `configs/` (source of truth) ile deployment kopyası arasındaki yapısal farkı
 * raporlar. İzinli proje alanları (`deviceId`/`name`/`connection`/`transport`) ve
 * komutlar karşılaştırma DIŞIDIR.
 *
 * Kural:
 * - Kopyada EKSİK register/bitfield → `error` (missing).
 * - Kopyada FAZLA register/bitfield → allowlist'te ise `warn` (izinli demo eki),
 *   değilse `error` (extra).
 */

export interface DriftTelemetryEntry {
  name: string;
  registerTableType?: string;
  registerAddress?: number;
}

export interface DriftBitfieldConfig {
  registerAddress: number;
  fields?: Array<{ name: string }>;
}

export interface DriftConfigLike {
  deviceId: string;
  type?: string;
  telemetry?: DriftTelemetryEntry[];
  bitfieldConfigs?: DriftBitfieldConfig[];
}

export interface DriftIssue {
  level: "error" | "warn";
  deviceId: string;
  rootType: string;
  kind: "missing" | "extra";
  key: string;
}

/** `type → izinli extra isimler` (ör. demo-only setpoint register'ları). */
export type DriftAllowlist = Record<string, string[]>;

function telemetryKey(t: DriftTelemetryEntry): string {
  return `${t.registerTableType ?? "?"}:${t.registerAddress ?? "?"}:${t.name}`;
}

function bitfieldKey(registerAddress: number, name: string): string {
  return `BF:${registerAddress}:${name}`;
}

function countBy(keys: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const k of keys) map.set(k, (map.get(k) ?? 0) + 1);
  return map;
}

function nameOf(key: string): string {
  const parts = key.split(":");
  return parts[parts.length - 1]!;
}

/**
 * Kök config ile deployment kopyasını karşılaştırır.
 * @returns sapma listesi (boş = temiz). Çağıran `level === "error"` varlığında fail eder.
 */
export function compareDeviceConfig(
  root: DriftConfigLike,
  copy: DriftConfigLike,
  allowlist: DriftAllowlist = {},
): DriftIssue[] {
  const rootType = root.type ?? root.deviceId;
  const allowed = new Set(allowlist[rootType] ?? []);

  const rootKeys = [
    ...(root.telemetry ?? []).map(telemetryKey),
    ...(root.bitfieldConfigs ?? []).flatMap((b) =>
      (b.fields ?? []).map((f) => bitfieldKey(b.registerAddress, f.name)),
    ),
  ];
  const copyKeys = [
    ...(copy.telemetry ?? []).map(telemetryKey),
    ...(copy.bitfieldConfigs ?? []).flatMap((b) =>
      (b.fields ?? []).map((f) => bitfieldKey(b.registerAddress, f.name)),
    ),
  ];

  const rootCount = countBy(rootKeys);
  const copyCount = countBy(copyKeys);
  const issues: DriftIssue[] = [];

  for (const [key, count] of rootCount) {
    const inCopy = copyCount.get(key) ?? 0;
    for (let i = 0; i < count - inCopy; i++) {
      issues.push({ level: "error", deviceId: copy.deviceId, rootType, kind: "missing", key });
    }
  }
  for (const [key, count] of copyCount) {
    const inRoot = rootCount.get(key) ?? 0;
    const extra = count - inRoot;
    if (extra <= 0) continue;
    const level = allowed.has(nameOf(key)) ? "warn" : "error";
    for (let i = 0; i < extra; i++) {
      issues.push({ level, deviceId: copy.deviceId, rootType, kind: "extra", key });
    }
  }

  return issues;
}
