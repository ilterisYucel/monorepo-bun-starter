import {
  ALL_DEMO_REGISTERS,
  DEMO_DEVICES,
  DEMO_MAPPING,
  rackAddr,
  type DemoDevicePlan,
  type DemoMappingEntry,
  type DemoRegister,
} from "./demo-registers";

/**
 * Register-source katmanı — referans konsol `src/regsrc.js` portu (SPEC UC-12).
 *
 * Bir UI değerinin **hangi cihazdan hangi register'dan** geldiğini ya da **hangi
 * PMS hesabıyla** türetildiğini taşıyan saf (IO'suz) tanımlayıcılar üretir.
 * Değerlerin kendisi burada hesaplanmaz; yalnız kaynak meta verisi + hover kartı
 * HTML'i (`tipHtml`) üretilir.
 *
 * Kaynak türleri (`RegisterSourceKind`):
 *   reg    — Modbus register (device + adres + FC + tip/scale/unit)
 *   calc   — PMS hesabı (girdi register listesi)
 *   nomap  — cihaz biliniyor, register haritası yok (referans M1–M7)
 *   model  — simülasyon / proje konfigürasyonu
 *
 * Davranış sözleşmesi:
 * - `idOrKey` hem register id (`bsc.soc`) hem ekran eşleme anahtarı (`bank.soc`)
 *   kabul eder; `DEMO_MAPPING` üzerinden çözülür.
 * - Cihaz IP/port/unitId `DEMO_DEVICES` planından **kind+bank** (yoksa tam id)
 *   ile çözülür; bulunamazsa IP basılmaz (kart yine dolu).
 * - `tipHtml` HTML döner; tüm alanlar escape edilir. Boş alan satırı basılmaz.
 */

export type RegisterSourceKind = "reg" | "calc" | "nomap" | "model";

export interface RegisterSource {
  readonly kind: RegisterSourceKind;
  /** Görünen cihaz etiketi (BSC-1, PCS-2, DEMO-MV-1 …) ya da "PMS"/"simulation". */
  readonly dev: string;
  readonly fam?: "BSC" | "PCS" | "HVAC" | "";
  readonly ip?: string;
  readonly port?: number;
  readonly unitId?: number | string;
  readonly slave?: number;
  readonly model?: string;
  readonly proto?: string;
  readonly doc?: string;
  /** Register adresi (decimal). Rack ise base + offset. */
  readonly addr?: number;
  readonly adec?: number | null;
  readonly words?: number;
  readonly fc?: number;
  readonly name: string;
  readonly param?: string;
  readonly type?: string;
  readonly scale?: number;
  readonly unit?: string;
  readonly enum?: Record<string, string>;
  readonly bits?: Record<string, string>;
  readonly note?: string;
  readonly prio?: string;
  /** Rack register bloğu (30170 + 150·(rack−1) + offset). */
  readonly rack?: { no: number; pos: number; base: number; offset: number };
  /** PMS hesabının girdi register'ları (`calc`). */
  readonly parts?: RegisterSource[];
  /** Ekran eşleme satırı (Admin › Data mapping). */
  readonly map?: { key: string; label: string; shownOn: string };
  /** Fan-out grubu (BESS#n) — yalnızca bağlam satırı olarak gösterilir. */
  readonly group?: number;
}

const BSC_META = { proto: "Modbus TCP", port: 502, unitId: 1, model: "LGES Flex BSC · JF1 rack", doc: "20250730_Flex_BSC_Modbusmap_JF1_Rev_AF" };
const PCS_META = { proto: "Modbus TCP", port: 502, unitId: 1, model: "Wattox MPCS-1725-S", doc: "Wattox MPCS Modbus V1.0" };
const HVAC_META = { proto: "Modbus RTU · RS485 9600 8N2 → Modbus TCP gateway", port: 502, model: "Envicool MC90HDNC1R-L", doc: "Envicool MC series A3" };

const POLL: Record<string, string> = {
  nameplate: "once on connect",
  essential: "1 s",
  summary: "1 s",
  rack: "1 s (rack block +50…+103)",
  counter: "60 s",
  setting: "60 s",
  alarm: "2 s",
  command: "write on demand",
};

const words = (t: string | undefined): number => (/32/.test(t ?? "") ? 2 : /128/.test(t ?? "") ? 8 : 1);
const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/** Register id veya ekran eşleme anahtarı → mapping satırı. */
export function mappingFor(idOrKey: string): DemoMappingEntry | undefined {
  return DEMO_MAPPING.find((m) => m.key === idOrKey || m.register === idOrKey);
}

/** `idOrKey` (register id veya mapping anahtarı) → katalog register kaydı. */
export function resolveRegister(idOrKey: string): { reg: DemoRegister; map?: DemoMappingEntry } | undefined {
  const map = mappingFor(idOrKey);
  const id = map?.register ?? idOrKey;
  const reg = ALL_DEMO_REGISTERS[id];
  if (!reg) return undefined;
  return map ? { reg, map } : { reg };
}

function devicePlan(dev: string, fam: string, bank?: string): DemoDevicePlan | undefined {
  const exact = DEMO_DEVICES.find((d) => d.id === dev);
  if (exact) return exact;
  const kind = fam.toLowerCase();
  if (bank) return DEMO_DEVICES.find((d) => d.kind === kind && d.bank === bank);
  return undefined;
}

const FAM_OF = (dev: string): "BSC" | "PCS" | "HVAC" | "" =>
  dev.startsWith("BSC") ? "BSC" : dev.startsWith("PCS") ? "PCS" : dev.startsWith("HVAC") ? "HVAC" : "";

interface RegOpts {
  bank?: string;
  group?: number;
  rack?: { no: number; pos: number; base: number; offset: number };
  fc?: number;
  slave?: number;
}

function regSource(dev: string, idOrKey: string, opts: RegOpts = {}): RegisterSource {
  const found = resolveRegister(idOrKey);
  if (!found) return nomapSource(dev, idOrKey);
  const { reg, map } = found;
  const fam = FAM_OF(dev);
  const meta = fam === "BSC" ? BSC_META : fam === "PCS" ? PCS_META : fam === "HVAC" ? HVAC_META : undefined;
  const plan = devicePlan(dev, fam, opts.bank);
  const addr = opts.rack ? rackAddr(opts.rack.pos, opts.rack.offset) : reg.addr;
  return {
    kind: "reg",
    dev,
    fam,
    ip: plan?.ip,
    port: plan?.port ?? meta?.port ?? 502,
    unitId: opts.slave ?? plan?.unitId ?? (fam === "BSC" || fam === "PCS" ? 1 : undefined),
    slave: opts.slave,
    model: meta?.model,
    proto: meta?.proto,
    doc: meta?.doc,
    addr,
    adec: addr ?? null,
    words: words(reg.type),
    fc: opts.fc ?? reg.fc ?? (fam === "BSC" ? 4 : reg.access ? 6 : 3),
    name: reg.name,
    param: reg.param,
    type: reg.type,
    scale: reg.scale,
    unit: reg.unit,
    enum: reg.enum,
    note: reg.note,
    prio: opts.rack ? "rack" : reg.prio,
    rack: opts.rack,
    map: map ? { key: map.key, label: map.label, shownOn: map.shownOn } : undefined,
    group: opts.group,
  };
}

/** Flex BSC register kaynağı (bank A/B). */
export function bscSource(dev: string, idOrKey: string, opts: RegOpts = {}): RegisterSource {
  return regSource(dev, idOrKey, opts);
}

/** Wattox MPCS holding/input register kaynağı. */
export function pcsSource(dev: string, idOrKey: string, opts: RegOpts = {}): RegisterSource {
  return regSource(dev, idOrKey, opts);
}

/** Envicool MC90 kaynağı (RS485 slave). */
export function hvacSource(dev: string, idOrKey: string, opts: RegOpts = {}): RegisterSource {
  return regSource(dev, idOrKey, { ...opts, slave: opts.slave });
}

/** BSC rack bloğu kaynağı — adres `30170 + 150·(pos−1) + offset`. */
export function rackSource(dev: string, rackNo: number, idOrKey: string, opts: RegOpts = {}): RegisterSource {
  const found = resolveRegister(idOrKey);
  if (!found || found.reg.offset === undefined) return nomapSource(dev, idOrKey);
  const pos = ((rackNo - 1) % 8) + 1;
  return regSource(dev, idOrKey, {
    ...opts,
    fc: 4,
    rack: { no: rackNo, pos, base: rackAddr(pos, 0), offset: found.reg.offset },
  });
}

/** PMS hesabı — türev + girdi register listesi. */
export function calcSource(text: string, parts: RegisterSource[] = []): RegisterSource {
  return { kind: "calc", dev: "PMS", name: text, parts };
}

/** Cihaz biliniyor, register haritası yok (M1–M7). */
export function nomapSource(dev: string, what: string): RegisterSource {
  return { kind: "nomap", dev, name: what };
}

/** Simülasyon / proje konfigürasyonu. */
export function modelSource(text: string): RegisterSource {
  return { kind: "model", dev: "simulation", name: text };
}

/* ── registry: kaynaklar data-rsk anahtarıyla paylaşılır ── */
const KEYS = new Map<string, RegisterSource>();

/** Kaynağın kararlı anahtarı (aynı kaynak → aynı anahtar). */
export function sourceKey(s: RegisterSource): string {
  const k = `${s.kind}|${s.dev}|${s.addr ?? ""}|${s.name}|${(s.parts ?? []).map((p) => p.dev + (p.addr ?? "") + p.name).join(",")}`;
  if (!KEYS.has(k)) KEYS.set(k, s);
  return `rs${hash(k)}`;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Kayıtlı kaynağı anahtarından çözer (hover kartı). */
export function sourceByKey(key: string): RegisterSource | undefined {
  for (const [k, s] of KEYS) if (`rs${hash(k)}` === key) return s;
  return undefined;
}

/** Tek satır kaynak metni (title attribute / inline mod). */
export function sourceText(s: RegisterSource | undefined | null): string {
  if (!s) return "";
  if (s.kind === "reg") return `${s.dev}${s.ip ? ` (${s.ip})` : ""} · ${s.addr ?? "?"} · FC${s.fc} · ${s.name}`;
  if (s.kind === "calc") {
    const inputs = (s.parts ?? []).map((p) => (p.kind === "reg" ? `${p.dev} ${p.addr ?? ""}` : p.name)).join(", ");
    return `PMS calc · ${s.name}${inputs ? ` ← ${inputs}` : ""}`;
  }
  if (s.kind === "nomap") return `${s.dev} · register map not supplied · ${s.name}`;
  return `simulation only · ${s.name}`;
}

/* ── hover kartı (HTML) ── */
const KIND_TITLE: Record<RegisterSourceKind, string> = {
  reg: "Modbus register",
  calc: "PMS calculation",
  nomap: "Register map not supplied",
  model: "Simulation / configuration",
};

const row = (k: string, v: unknown): string => (v == null || v === "" ? "" : `<tr><th>${k}</th><td>${v}</td></tr>`);

const FACTOR: Array<[RegExp, string, number]> = [
  [/\bMW\b/, "kW", 1000],
  [/\bMWh\b/, "kWh", 1000],
  [/\bkW\b/, "W", 1000],
  [/\bMVA\b/, "kVA", 1000],
];

function rawOf(shown: string, s: RegisterSource): number | null {
  const m = String(shown ?? "").replace("−", "-").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  const n0 = m ? Number(m[0]) : null;
  if (n0 == null) return null;
  const sh = String(shown);
  let n = n0;
  for (const [display, regUnit, f] of FACTOR) if (display.test(sh) && s.unit === regUnit) n = n0 * f;
  if (s.scale) return Math.round(n / s.scale);
  if (!s.enum && !s.bits) return Math.round(n);
  return null;
}

function enumList(o: Record<string, string>, cur?: string): string {
  const e = Object.entries(o);
  if (!e.length) return "";
  const clipped = e.slice(0, 24);
  const items = clipped
    .map(
      ([k, v]) =>
        `<li class="${cur && String(v).toLowerCase() === String(cur).trim().toLowerCase() ? "on" : ""}"><code>${/^\d+$/.test(k) ? (+k > 15 ? `0x${(+k).toString(16).toUpperCase()}` : k) : esc(k)}</code> ${esc(v)}</li>`,
    )
    .join("");
  return `<ul class="rt-enum">${items}${e.length > 24 ? `<li>… ${e.length - 24} more</li>` : ""}</ul>`;
}

function regRows(s: RegisterSource, shown: string): string {
  const raw = rawOf(shown, s);
  const hex = raw != null && raw >= 0 ? `0x${raw.toString(16).toUpperCase().padStart(4, "0")}` : null;
  const hexTwos = raw != null && raw < 0 ? `0x${(raw + 0x10000).toString(16).toUpperCase()}` : null;
  const valueCell =
    esc(String(shown ?? "").trim()) +
    (raw != null ? ` · raw ≈ <code>${raw}</code>${hex ? ` (<code>${hex}</code>)` : ""}${hexTwos ? ` (<code>${hexTwos}</code> two’s complement)` : ""}` : "");
  return (
    row("Device", `<b>${esc(s.dev)}</b>${s.group ? ` · BESS#${s.group}` : ""}${s.slave ? ` · RS485 slave ${s.slave}` : ""}`) +
    row("Model", esc(s.model)) +
    row(
      "Connection",
      `${esc(s.proto ?? "")}${s.ip ? ` · <code>${esc(s.ip)}:${s.port ?? 502}</code>` : ` · IP not set (Admin › Devices) · port ${s.port ?? 502}`}${s.unitId != null ? ` · unit ID ${esc(s.unitId)}` : ""}`,
    ) +
    row("Address", s.addr != null ? `<code>${s.addr}</code>${s.words && s.words > 1 ? ` · ${s.words} registers` : ""}` : "") +
    (s.rack
      ? row("Rack block", `rack ${s.rack.pos} on this BSC (container Rack#${s.rack.no}) · base <code>${s.rack.base}</code> = 30170 + 150·(${s.rack.pos}−1) · offset +${s.rack.offset}`)
      : "") +
    row(
      "Function code",
      s.fc === 4
        ? "FC 04 · read input registers"
        : s.fc === 3
          ? "FC 03 · read holding registers"
          : s.fc === 6
            ? "FC 06 · write single register"
            : s.fc === 2
              ? "FC 02 · read discrete inputs"
              : s.fc != null
                ? `FC ${s.fc}`
                : "",
    ) +
    row("Data type", `${esc(s.type ?? "—")}${s.scale ? ` · scale × ${s.scale}` : ""}${s.unit ? ` · unit ${esc(s.unit)}` : ""}`) +
    row("Value", valueCell) +
    row("Parameter", s.param ? `${esc(s.param)} (Wattox parameter code)` : "") +
    row("Poll", POLL[s.prio ?? ""] ?? "") +
    row("Screen mapping", s.map ? `<code>${esc(s.map.key)}</code> · ${esc(s.map.label)} · shown on ${esc(s.map.shownOn)}` : "") +
    row("Values", s.enum ? enumList(s.enum, shown) : s.bits ? enumList(s.bits) : "") +
    row("Note", s.note ? esc(s.note) : "") +
    row("Document", s.doc ? esc(s.doc) : "")
  );
}

/** Hover kartı HTML'i (`shown` = ekrandaki değer metni). */
export function tipHtml(s: RegisterSource | undefined | null, shown = ""): string {
  if (!s) return "";
  let h = `<div class="rt-h k-${s.kind}"><span>${KIND_TITLE[s.kind]}</span><b>${esc(s.name)}</b></div><table class="rt">`;
  if (s.kind === "reg") h += regRows(s, shown);
  else if (s.kind === "calc") {
    h += row("Computed by", "PMS backend (Management service)");
    h += row("Value", esc(String(shown ?? "").trim()));
    h += row(
      "Inputs",
      s.parts?.length
        ? `<ul class="rt-enum">${s.parts
            .map((p) =>
              p.kind === "reg"
                ? `<li><b>${esc(p.dev)}</b> <code>${esc(p.addr ?? "")}</code> FC${p.fc} · ${esc(p.name)}${p.type ? ` · ${esc(p.type)}${p.scale ? ` ×${p.scale}` : ""}${p.unit ? ` ${esc(p.unit)}` : ""}` : ""}</li>`
                : `<li>${esc(p.dev)} · ${esc(p.name)}${p.kind === "nomap" ? " <i>(map not supplied)</i>" : ""}</li>`,
            )
            .join("")}</ul>`
        : "PMS internal state",
    );
  } else if (s.kind === "nomap") {
    h += row("Device", `<b>${esc(s.dev)}</b>`);
    h += row("Value", esc(String(shown ?? "").trim()));
    h += row("Data point", esc(s.name));
    h += row("Status", "Register map not supplied yet – value is simulated (docs/REQUIREMENTS.md › M1–M7)");
  } else {
    h += row("Value", esc(String(shown ?? "").trim()));
    h += row("Source", esc(s.name));
    h += row("Field source", "none – simulation or project configuration");
  }
  return `${h}</table>`;
}
