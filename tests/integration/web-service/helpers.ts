import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { connect } from "node:net";
import { execFileSync } from "node:child_process";

/**
 * Demo-field entegrasyon test yardımcıları (v2/dev stack).
 *
 * Hedefler:
 * - field web-service :5002 (PCS, MV, operasyon/manevra, konteyner linki)
 * - container web-service :5001 (BSC, HVAC, IMD, DC sayaç, PM5340, CB, IO, FSS, DC çıkış)
 * - DebugInjector :15590 (konteyner) / :15591 (field)
 * - Simülatör Modbus TCP portları (ham protokol probları)
 *
 * Stack yoksa `beforeAll` net hata verir; sessiz skip YOKTUR.
 */

export const FIELD_URL = process.env.DEMO_FIELD_URL ?? "http://localhost:5002";
export const CONTAINER_URL = process.env.DEMO_CONTAINER_URL ?? "http://localhost:5001";
export const CONTAINER_INJECT_URL =
  process.env.DEMO_CONTAINER_INJECT_URL ?? "http://localhost:8090/compat/c1";
export const FIELD_INJECT_URL = process.env.DEMO_FIELD_INJECT_URL ?? "http://localhost:8090/compat/field";
export const CONTAINER2_INJECT_URL =
  process.env.DEMO_CONTAINER2_INJECT_URL ?? "http://localhost:8090/compat/c2";
/** Konteyner-3 API'si (test stack: bess2 istasyonunun ilk konteyneri). */
export const CONTAINER3_URL = process.env.DEMO_CONTAINER3_URL ?? "http://localhost:5503";
/** Konteyner-3 (test stack: bess2 istasyonunun ilk konteyneri) — uyumluluk ucu. */
export const CONTAINER3_INJECT_URL =
  process.env.DEMO_CONTAINER3_INJECT_URL ?? "http://localhost:8090/compat/c3";

const USER = process.env.DEMO_USER ?? "admin";
const SEED_PASSWORD = process.env.DEMO_PASSWORD ?? "password123";
const NEW_PASSWORD = process.env.DEMO_NEW_PASSWORD ?? "password1234";

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function resolveFieldId(): string {
  if (process.env.DEMO_FIELD_ID) return process.env.DEMO_FIELD_ID;
  try {
    const env = readFileSync(
      resolve(__dirname, "../../../deployment/v2/dev/site/.env"),
      "utf-8",
    );
    const line = env.split("\n").find((l) => l.startsWith("FIELD_ID="));
    return line ? line.slice("FIELD_ID=".length).trim() : "";
  } catch {
    return "";
  }
}

export interface ApiResult {
  status: number;
  body: unknown;
}

export async function rawFetch(
  base: string,
  path: string,
  init: RequestInit = {},
): Promise<ApiResult> {
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  let body: unknown;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

export async function api(
  base: string,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<ApiResult> {
  return rawFetch(base, path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

/** İlk giriş (mustChangePassword) + şifre değişimi dahil login; accessToken döner. */
export async function login(base: string): Promise<string> {
  const tryLogin = (password: string) =>
    rawFetch(base, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: USER, password }),
    });

  let result = await tryLogin(SEED_PASSWORD);
  if (result.status !== 200 && result.body && (result.body as { mustChangePassword?: boolean }).mustChangePassword !== undefined) {
    // gövde hata — yeni şifreyi dene
  }
  if (result.status !== 200) result = await tryLogin(NEW_PASSWORD);
  if (result.status !== 200) throw new Error(`Login başarısız (${base}): HTTP ${result.status}`);

  const body = result.body as { accessToken?: string; user?: { mustChangePassword?: boolean } };
  let token = body.accessToken ?? "";
  if (body.user?.mustChangePassword) {
    const change = await api(base, token, "/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ oldPassword: SEED_PASSWORD, newPassword: NEW_PASSWORD }),
    });
    if (change.status !== 200) throw new Error(`Şifre değişimi başarısız: HTTP ${change.status}`);
    token = (change.body as { accessToken?: string }).accessToken ?? token;
  }
  if (!token) throw new Error(`accessToken yok (${base})`);
  return token;
}

export async function assertHealthy(base: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${base}/health`);
  } catch (error) {
    throw new Error(
      `Demo stack erişilemedi (${base}): ${(error as Error).message}. ` +
        "Önce 'bun run dev:stack:up' ile stack'i başlatın.",
    );
  }
  if (!res.ok) throw new Error(`Sağlık kontrolü başarısız (${base}): HTTP ${res.status}`);
}

export interface Row {
  deviceId: string;
  name: string;
  value: unknown;
  tags?: Record<string, string>;
}

/** Tier API'sinden bir cihazın en güncel telemetri satırları. */
export async function deviceRows(
  base: string,
  token: string,
  deviceId: string,
): Promise<Row[]> {
  const { body } = await api(base, token, `/api/unified/telemetry/latest?deviceIds=${deviceId}`);
  return (body as { telemetries?: Row[] }).telemetries ?? [];
}

/**
 * Field konteyner linkinden tüm konteyner cihazlarının telemetrileri.
 *
 * Field `[container-1, container-2]` **sırasız** döner ve iki konteynerde aynı
 * `deviceId`'ler (BSC-1, CB-1, CONTROL-PANEL-IO-1…) bulunur; düzleştirme
 * yapılırsa `valueOf` yanlış konteynerin satırını okur. Bu yüzden varsayılan
 * olarak **container-1** seçilir (suite'lerin hedefi); başka konteyner gerekirse
 * `containerId` verilir.
 */
export async function containerRows(token: string, containerId = "container-1"): Promise<Row[]> {
  const { body } = await api(FIELD_URL, token, `/api/fields/${resolveFieldId()}/containers`);
  const containers = (Array.isArray(body) ? body : (body as { containers?: unknown[] }).containers) ?? [];
  const all = containers as Array<{ containerId?: string; latestTelemetry?: Row[] }>;
  const selected = all.filter((c) => c.containerId === containerId);
  return (selected.length > 0 ? selected : all).flatMap((c) => c.latestTelemetry ?? []);
}

export function valueOf(rows: Row[], name: string): number {
  const row = rows.find((r) => r.name === name);
  return row ? Number(row.value) : Number.NaN;
}

export function canonicalOf(rows: Row[], canonical: string): number {
  const row = rows.find((r) => r.tags?.canonical === canonical);
  return row ? Number(row.value) : Number.NaN;
}

/** DebugInjector — dev-only senaryo enjeksiyonu. */
export async function inject(base: string, deviceId: string, scenario: string): Promise<boolean> {
  const { status, body } = await rawFetch(base, "/inject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, scenario }),
  });
  if (status !== 200 && status !== 404) throw new Error(`Enjeksiyon hatası: HTTP ${status}`);
  return Boolean((body as { applied?: boolean }).applied);
}

/** Tier API'sinde bir cihaz telemetrisi hedef değere ulaşana kadar bekler (deterministik kurulum). */
export async function waitForDeviceValue(
  base: string,
  token: string,
  deviceId: string,
  name: string,
  expected: number,
  timeoutMs = 45_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await deviceRows(base, token, deviceId).catch(() => [] as Row[]);
    const row = rows.find((r) => r.name === name);
    if (row !== undefined && Number(row.value) === expected) return true;
    await sleep(1000);
  }
  return false;
}

/**
 * Konteyner durumunu bilinen Normal hâle getirir (suite'ler arası paylaşımlı stack):
 * enjeksiyonları temizler, BSC'yi Stop→Start ile Normal'e alır, kontaktörleri kapatır,
 * DC şalterleri kapatır. Hatalar yutulur (best-effort normalizasyon).
 */
/** Sorgu — telemetri değeri `min` üstüne çıkana kadar bekler (koşul poll'ü). */
export async function waitForValueAbove(
  base: string,
  token: string,
  deviceId: string,
  name: string,
  min: number,
  timeoutMs = 30_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await deviceRows(base, token, deviceId).catch(() => [] as Row[]);
    if (Number(valueOf(rows, name)) > min) return true;
    await sleep(1000);
  }
  return false;
}

export async function normalizeContainer(
  token: string,
  base: string = CONTAINER_URL,
  injectUrl: string = CONTAINER_INJECT_URL,
): Promise<void> {
  const scenarios: Array<[string, string]> = [
    ["IMD-1", "healthy"],
    ["DC-METER-1", "nominal"],
    ["PM5340-1", "nominal"],
    ["CONTROL-PANEL-IO-1", "nominal"],
    ["HVAC-1", "nominal"],
    ["BSC-1", "nominal"],
    ["BSC-2", "nominal"],
    ["PCS-1", "nominal"],
    ["PCS-2", "nominal"],
  ];
  await Promise.all(scenarios.map(([d, s]) => inject(injectUrl, d, s).catch(() => false)));

  const cmd = (deviceId: string, command: string, params?: Record<string, unknown>) =>
    api(base, token, "/api/commands/execute", {
      method: "POST",
      body: JSON.stringify({ deviceId, command, ...(params ? { params } : {}) }),
    }).catch(() => undefined);

  // Sim-Lab katı ack tablosu: EMERGENCY/başka state'ten çıkmak için önce RESET.
  for (const d of ["BSC-1", "BSC-2"]) await cmd(d, "reset");
  for (const p of ["PCS-1", "PCS-2"]) {
    await cmd(p, "fault_reset");
    await cmd(p, "standby");
  }
  await sleep(2000);
  for (const d of ["BSC-1", "BSC-2"]) {
    await cmd(d, "start");
  }
  // Sim-Lab: Start → Initializing (~N×1.5 s + 6 s) → Normal; ardından kontaktörler.
  await Promise.all([
    waitForDeviceValue(base, token, "BSC-1", "BSC State", 3),
    waitForDeviceValue(base, token, "BSC-2", "BSC State", 3),
  ]);
  for (const d of ["BSC-1", "BSC-2"]) await cmd(d, "close_contactors");
  await Promise.all([cmd("CB-1", "close"), cmd("CB-2", "close")]);
  // Kontaktör kapanması modelde ~2 s (8 raf × 0,25 s) → sabit 8 s yerine koşul poll'ü.
  await waitForValueAbove(base, token, "BSC-1", "BSC SOC", 0, 20_000);
}

/**
 * Field durumunu "güç 0" hâline alır (best-effort).
 *
 * Önceden tam `standby` operasyonu koşuyordu (soft-start + bsc_stop, 30–90 s).
 * UC-6/K12: BSC'yi aşağıdaki `normalizeContainer` yönetir; burada yalnız PCS
 * setpoint'i sıfırlanır ve gücün 0'a indiği **koşul olarak** doğrulanır (~2–6 s).
 */
export async function normalizeField(token: string): Promise<void> {
  const cmd = (deviceId: string) =>
    api(FIELD_URL, token, "/api/commands/execute", {
      method: "POST",
      body: JSON.stringify({ deviceId, command: "set_power_zero" }),
    }).catch(() => undefined);
  await Promise.all([cmd("PCS-1"), cmd("PCS-2")]);
  for (let i = 0; i < 15; i++) {
    const rows = await deviceRows(FIELD_URL, token, "PCS-1").catch(() => [] as Row[]);
    if (Math.abs(valueOf(rows, "Grid Active Power")) < 1) break;
    await sleep(1000);
  }
  await sleep(1000); // rampa artığı
}

/**
 * Field→konteyner komut oturumunun kurulmasını bekler (web-service restart'ı
 * oturumu düşürebilir; kontroller tekrar bağlanınca geçer). Benign `BSC-1 stop`
 * ile probe eder. Oturum kurulamazsa net hata (sessiz skip YOK).
 */
export async function waitForContainerSession(token: string): Promise<void> {
  const fieldId = resolveFieldId();
  for (let i = 0; i < 25; i++) {
    const { status, body } = await api(
      FIELD_URL,
      token,
      `/api/fields/${fieldId}/containers/container-1/commands`,
      {
        method: "POST",
        body: JSON.stringify({
          commands: [{ deviceId: "BSC-1", command: "stop" }],
          mode: "parallel",
          onFailure: "continue",
        }),
      },
    ).catch(() => ({ status: 0, body: undefined }));
    // Oturum erişilebilirliği yeterli: komut reddedilse bile results döner
    // (Sim-Lab katı modeli state'e göre reddedebilir → 422 + results; bu oturum hatası değil).
    const results = (body as { results?: unknown[] } | undefined)?.results;
    if ((status === 200 || status === 422) && Array.isArray(results) && results.length > 0) return;
    await sleep(2000);
  }
  throw new Error("field→container komut oturumu kurulamadı (stack hazır değil)");
}

/** Field hub üzerinden uzak konteyneri (ör. container-2) Normal'e alır. */
export async function normalizeRemoteContainer(fieldToken: string, containerId: string): Promise<void> {
  const fieldId = resolveFieldId();
  const cmd = (deviceId: string, command: string) =>
    api(FIELD_URL, fieldToken, `/api/fields/${fieldId}/containers/${containerId}/commands`, {
      method: "POST",
      body: JSON.stringify({
        commands: [{ deviceId, command }],
        mode: "parallel",
        onFailure: "continue",
      }),
    }).catch(() => undefined);

  await Promise.all([cmd("BSC-1", "reset"), cmd("BSC-2", "reset")]);
  await sleep(2000);
  await Promise.all([cmd("BSC-1", "start"), cmd("BSC-2", "start")]);
  // Initializing modelde ~2 + 8×0,4 ≈ 5 s → sabit 25 s yerine state poll'ü.
  for (let i = 0; i < 40; i++) {
    const rows = await containerRows(fieldToken, containerId);
    if (valueOf(rows, "BSC State") === 3) break;
    await sleep(1000);
  }
  await Promise.all([cmd("BSC-1", "close_contactors"), cmd("BSC-2", "close_contactors")]);
  await Promise.all([cmd("CB-1", "close"), cmd("CB-2", "close")]);
  // Online rack: SOC > 0 olana kadar (kontaktör ~2 s).
  for (let i = 0; i < 20; i++) {
    const rows = await containerRows(fieldToken, containerId);
    if (Number(valueOf(rows, "BSC SOC")) > 0) break;
    await sleep(1000);
  }
}

/** Her iki tier'ı da normalize eder (çoğu suite `beforeAll`'ında çağırır). */
export async function normalizeStack(fieldToken: string, containerToken: string): Promise<void> {
  await normalizeField(fieldToken);
  await waitForContainerSession(fieldToken);
  await normalizeContainer(containerToken);
  await normalizeRemoteContainer(fieldToken, "container-2");
  // Deterministik SOC: testler şarj/deşarj yönünü sabit başlangıçtan ölçer.
  await Promise.all([
    inject(CONTAINER_INJECT_URL, "BSC-1", "soc:50").catch(() => false),
    inject(CONTAINER_INJECT_URL, "BSC-2", "soc:50").catch(() => false),
    inject(CONTAINER2_INJECT_URL, "BSC-1", "soc:50").catch(() => false),
    inject(CONTAINER2_INJECT_URL, "BSC-2", "soc:50").catch(() => false),
  ]);
  await sleep(2000);
}

/** Emniyetli parse — gövde dizi/obje olabilir. */
export function listOf<T>(body: unknown, key: string): T[] {
  if (Array.isArray(body)) return body as T[];
  const value = (body as Record<string, unknown> | undefined)?.[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

// ─── Ham Modbus TCP (harici bağımlılık yok; FC03/04/06) ─────────────────────

export interface ModbusResult {
  /** Okunan register değerleri (FC03/04). */
  values: number[];
  /** Modbus istisna kodu (0x80|FC yanıtı) — varsa. */
  exception?: number;
}

function buildReadFrame(transactionId: number, unitId: number, fc: number, address: number, count: number): Buffer {
  const frame = Buffer.alloc(12);
  frame.writeUInt16BE(transactionId, 0);
  frame.writeUInt16BE(0, 2); // protocol
  frame.writeUInt16BE(6, 4); // length = unit + fc + addr(2) + qty(2)
  frame.writeUInt8(unitId, 6);
  frame.writeUInt8(fc, 7);
  frame.writeUInt16BE(address, 8);
  frame.writeUInt16BE(count, 10);
  return frame;
}

function buildWriteSingleFrame(transactionId: number, unitId: number, address: number, value: number): Buffer {
  const frame = Buffer.alloc(12);
  frame.writeUInt16BE(transactionId, 0);
  frame.writeUInt16BE(0, 2);
  frame.writeUInt16BE(6, 4);
  frame.writeUInt8(unitId, 6);
  frame.writeUInt8(6, 7); // FC06
  frame.writeUInt16BE(address, 8);
  frame.writeUInt16BE(value, 10);
  return frame;
}

/** Tek Modbus TCP isteği — ham çerçeve gönderir, yanıtı çözer. */
async function transact(
  host: string,
  port: number,
  frame: Buffer,
  expectValues: boolean,
): Promise<ModbusResult> {
  return new Promise<ModbusResult>((resolvePromise, reject) => {
    const socket = connect({ host, port });
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Modbus timeout ${host}:${port}`));
    }, 5000);
    socket.on("connect", () => socket.write(frame));
    socket.on("data", (chunk) => {
      chunks.push(chunk as Buffer);
      const buf = Buffer.concat(chunks);
      const length = buf.readUInt16BE(4);
      if (buf.length < 6 + length) return; // tam çerçeve bekle
      clearTimeout(timer);
      socket.end();
      const fc = buf.readUInt8(7);
      if ((fc & 0x80) !== 0) {
        resolvePromise({ values: [], exception: buf.readUInt8(8) });
        return;
      }
      if (!expectValues) {
        resolvePromise({ values: [] });
        return;
      }
      const byteCount = buf.readUInt8(8);
      const values: number[] = [];
      for (let i = 0; i < byteCount; i += 2) values.push(buf.readUInt16BE(9 + i));
      resolvePromise({ values });
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export function modbusRead(
  port: number,
  fc: 3 | 4,
  address: number,
  count: number,
  host = "127.0.0.1",
  unitId = 1,
): Promise<ModbusResult> {
  return transact(host, port, buildReadFrame(1, unitId, fc, address, count), true);
}

export function modbusWriteSingle(
  port: number,
  address: number,
  value: number,
  host = "127.0.0.1",
  unitId = 1,
): Promise<ModbusResult> {
  return transact(host, port, buildWriteSingleFrame(1, unitId, address, value), false);
}

/**
 * PCS'i komut almaya hazırlar (UC-6: hedefli hazırlık, tam reset değil).
 *
 * `fault_reset` + `set_command_source` + `start` idempotenttir; op durumu
 * 0'dan çıkana kadar beklenir (~2–20 s, soft-start). Şarj/deşarj operasyonu
 * öncesi, önceki testin standby'ından kalan durumu kapatır.
 */
export async function ensurePcsReady(token: string): Promise<void> {
  const cmd = (deviceId: string, command: string) =>
    api(FIELD_URL, token, "/api/commands/execute", {
      method: "POST",
      body: JSON.stringify({ deviceId, command }),
    }).catch(() => undefined);
  for (const id of ["PCS-1", "PCS-2"]) {
    await cmd(id, "fault_reset");
    await cmd(id, "set_command_source");
    await cmd(id, "start");
  }
  for (let i = 0; i < 20; i++) {
    const rows = await deviceRows(FIELD_URL, token, "PCS-1").catch(() => [] as Row[]);
    if (Number(valueOf(rows, "PCS Operation Status")) !== 0) return;
    await sleep(1000);
  }
}

/**
 * Stack katmanı ön koşulu (UC-6) — **ucuz** tam hazırlık.
 *
 * `normalizeField` artık standby operasyonu değil (güç≈0 poll'ü), `normalizeContainer`
 * sabit sleep'ler yerine state/SOC poll'ü kullanır → toplam ~10–20 s.
 * Her stack dosyası kendi ön koşulunu kurar (dosyalar arası gizli bağımlılık YOK).
 */
export async function ensureStackReady(fieldToken: string, containerToken: string): Promise<void> {
  await normalizeField(fieldToken);
  await normalizeContainer(containerToken);
}

/**
 * Kural motorunu taşıyan management-service konteynerinin adı.
 *
 * Dev stack (`demo-container-management-service`) ile test stack
 * (`container-1-management-service`) farklı adlar kullanır; ilk bulunan döner.
 */
export function managementContainerName(): string {
  const out = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf-8" });
  const names = out.split("\n").map((n) => n.trim()).filter(Boolean);
  return (
    names.find((n) => n === "demo-container-management-service") ??
    names.find((n) => n.endsWith("-management-service")) ??
    "demo-container-management-service"
  );
}
