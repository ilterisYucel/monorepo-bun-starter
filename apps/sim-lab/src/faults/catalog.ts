// Arıza kataloğu — arayüzden/senaryodan enjekte edilebilen tüm koşullar.
// Her tanım: hedef cihaz türü, parametreler, uygula/temizle ve "beklenen" saha davranışı
// (EMS/PMS'in ne görmesi gerektiği — test kabul ölçütü olarak kullanılabilir).

import type { Plant } from "../plant";
import type { Rack } from "../models/battery/rack";
import type { DemoMvStationSimulator, ControlPanelIoSimulator, ImdSimulator, CbSimulator, DcMeterSimulator } from "@gd-monorepo/simulators";
import { FAULT_BITS } from "../models/wattox-catalog";

export type TargetKind = "rack" | "bsc" | "pcs" | "hvac" | "any" | "link" | "site" | "cb" | "imd" | "io" | "mv" | "dcmeter";

export interface ParamDef {
  key: string;
  label: string;
  type: "number" | "select" | "bool";
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string | number; label: string }[];
  unit?: string;
}

export interface FaultDef {
  id: string;
  group: string;
  target: TargetKind;
  label: string;
  expect: string;
  params?: ParamDef[];
  /** Tek seferlik eylem (aktif listede tutulmaz). */
  oneShot?: boolean;
  apply(p: Plant, target: string, params: Record<string, unknown>): void;
  clear(p: Plant, target: string, params: Record<string, unknown>): void;
}

export interface ActiveFault {
  uid: number;
  defId: string;
  target: string;
  params: Record<string, unknown>;
  since: number;
  simSince: number;
  label: string;
}

const rack = (p: Plant, t: string): Rack => {
  const [b, r] = t.split("/");
  const bsc = p.bscs.get(b!);
  const rk = bsc?.racks[Number((r ?? "R1").replace(/\D/g, "")) - 1];
  if (!rk) throw new Error(`Raf bulunamadı: ${t}`);
  return rk;
};
const pcs = (p: Plant, t: string) => {
  const x = p.pcss.get(t);
  if (!x) throw new Error(`PCS yok: ${t}`);
  return x;
};
const hvac = (p: Plant, t: string) => {
  const x = p.hvacs.get(t);
  if (!x) throw new Error(`HVAC yok: ${t}`);
  return x;
};
const bsc = (p: Plant, t: string) => {
  const x = p.bscs.get(t);
  if (!x) throw new Error(`BSC yok: ${t}`);
  return x;
};
const legacy = <T>(p: Plant, t: string): T => {
  const d = p.devices.get(t);
  if (!d?.legacy) throw new Error(`Cihaz yok: ${t}`);
  return d.legacy.sim as unknown as T;
};
const num = (v: unknown, d: number): number => (v === undefined || v === "" ? d : Number(v));

const packParam: ParamDef = { key: "pack", label: "Paket (1–17)", type: "number", default: 9, min: 1, max: 17 };
const cellParam: ParamDef = { key: "cell", label: "Hücre (1–408)", type: "number", default: 200, min: 1, max: 408 };

const rackFlag = (id: string, label: string, key: keyof Rack["inj"], expect: string): FaultDef => ({
  id, group: "Raf / RBMS", target: "rack", label, expect,
  apply: (p, t) => { (rack(p, t).inj as unknown as Record<string, unknown>)[key] = true; },
  clear: (p, t) => { (rack(p, t).inj as unknown as Record<string, unknown>)[key] = false; },
});

const hvacFlag = (id: string, label: string, key: string, expect: string): FaultDef => ({
  id, group: "HVAC", target: "hvac", label, expect,
  apply: (p, t) => { (hvac(p, t).inj as unknown as Record<string, unknown>)[key] = true; },
  clear: (p, t) => { (hvac(p, t).inj as unknown as Record<string, unknown>)[key] = false; },
});

const pcsFaultOptions = FAULT_BITS.flatMap((bits, w) => bits.map((n, b) => ({ value: `${w + 1}:${b}`, label: `W${w + 1}.b${b} — ${n}` }))).filter((o) => !o.label.endsWith("Reserved"));
const pcsAlarmOptions = pcsFaultOptions.filter((o) => Number(String(o.value).split(":")[0]) <= 8);

export const FAULTS: FaultDef[] = [
  // ─────────────── Raf / RBMS ───────────────
  {
    id: "rack.hotspot", group: "Raf / RBMS", target: "rack", label: "Paket iç ısınma (sıcak nokta)",
    expect: "Raf maks. sıcaklığı yükselir → 40 °C'den itibaren TPC (BSC Info b13) ve limit düşümü → 49 °C OTW (raf diag 30240 b9) → 58 °C OTF1 → raf MC açılır, raf offline.",
    params: [packParam, { key: "watts", label: "Ek ısı", type: "number", default: 900, min: 50, max: 5000, unit: "W" }],
    apply: (p, t, a) => { rack(p, t).inj.heat = { pack: num(a.pack, 9) - 1, watts: num(a.watts, 900) }; },
    clear: (p, t) => { rack(p, t).inj.heat = null; },
  },
  {
    id: "rack.tempSensor", group: "Raf / RBMS", target: "rack", label: "Sıcaklık sensörü açık devre",
    expect: "Sensör sınır dışı değer okur → 5 s sonra TSE (Temperature out of limit, 30246 b6) → raf açılır.",
    params: [packParam, { key: "value", label: "Okunan değer", type: "number", default: 127, min: -40, max: 150, unit: "°C" }],
    apply: (p, t, a) => { rack(p, t).inj.tempSensorFault = { pack: num(a.pack, 9) - 1, value: num(a.value, 127) }; },
    clear: (p, t) => { rack(p, t).inj.tempSensorFault = null; },
  },
  {
    id: "rack.selfDischarge", group: "Raf / RBMS", target: "rack", label: "Hücre iç kısa devre / yüksek self-deşarj",
    expect: "Tek hücre zamanla düşer → hücre sapması büyür; düşük SOC'de PDVW/PDVF (CER, yalnız LGES temizler), deşarj sonunda UVW erken gelir. Hızlandırmak için sim hızını artırın.",
    params: [cellParam, { key: "mA", label: "Kaçak akım", type: "number", default: 2000, min: 10, max: 50000, unit: "mA" }],
    apply: (p, t, a) => { rack(p, t).inj.cellSelfDischarge = { cell: num(a.cell, 200) - 1, mA: num(a.mA, 2000) }; },
    clear: (p, t) => { rack(p, t).inj.cellSelfDischarge = null; },
  },
  {
    id: "rack.cellHighR", group: "Raf / RBMS", target: "rack", label: "Hücre yüksek iç direnç (kaynak/bara gevşek)",
    expect: "Yük altında hücre gerilimi sapar: şarjda maks. hücre ↑ (OVW/VPC erken), deşarjda min. hücre ↓ (UVW).",
    params: [cellParam, { key: "factor", label: "Direnç çarpanı", type: "number", default: 8, min: 1.5, max: 50, step: 0.5 }],
    apply: (p, t, a) => { rack(p, t).inj.cellHighR = { cell: num(a.cell, 200) - 1, factor: num(a.factor, 8) }; },
    clear: (p, t) => { rack(p, t).inj.cellHighR = null; },
  },
  {
    id: "rack.cellSocStep", oneShot: true, group: "Raf / RBMS", target: "rack", label: "Hücre SOC dengesizliği (anlık)",
    expect: "Seçili hücrenin SOC'si kaydırılır → yüksek SOC'de OVW/PDVW, düşük SOC'de UVW/PDVW; boşta (Idle >10 dk) hücre dengeleme devreye girer (raf status b0).",
    params: [cellParam, { key: "delta", label: "SOC farkı", type: "number", default: -6, min: -40, max: 40, unit: "%" }],
    apply: (p, t, a) => { const r = rack(p, t); const i = num(a.cell, 200) - 1; r.soc[i] = Math.max(0, Math.min(100, r.soc[i]! + num(a.delta, -6))); },
    clear: () => undefined,
  },
  {
    id: "rack.setSoc", oneShot: true, group: "Raf / RBMS", target: "rack", label: "Raf SOC'sini ayarla",
    expect: "Raf diğerlerinden farklı gerilimde kalır → Close Contactors'ta '±ΔV' dışı raf kapatılmaz (olay günlüğü) veya Manual modda 0x11 Over Voltage Deviation.",
    params: [{ key: "soc", label: "SOC", type: "number", default: 80, min: 0, max: 100, unit: "%" }],
    apply: (p, t, a) => rack(p, t).setSoc(num(a.soc, 80)),
    clear: () => undefined,
  },
  {
    id: "rack.soh", oneShot: true, group: "Raf / RBMS", target: "rack", label: "SOH düşür (yaşlanma)",
    expect: "Raf SOH ve güç limiti düşer; <56 % USOHA, <55 % USOHF (raf açılır).",
    params: [{ key: "soh", label: "SOH", type: "number", default: 70, min: 40, max: 100, unit: "%" }],
    apply: (p, t, a) => { rack(p, t).soh = num(a.soh, 70); },
    clear: () => undefined,
  },
  rackFlag("rack.rbmsLoc", "BSC ↔ RBMS haberleşme kaybı", "rbmsCommLoss", "Raf verileri 0'a düşer; 10 s sonra RBSCLOC (30300 b2) → raf açılır, BSC limitleri raf hariç yeniden hesaplar."),
  rackFlag("rack.packLoc", "RBMS ↔ PBMS haberleşme kaybı", "packCommLoss", "3 s sonra RPLOC (30243 b10) → raf açılır."),
  rackFlag("rack.pbms", "PBMS arızası", "pbmsFault", "1 s sonra PBMSF (30247 b10) → raf açılır; 2+ rafta → MFRD → BSC Emergency."),
  rackFlag("rack.currentSensor", "Akım sensörü hatası (CS1/CS2 uyuşmazlığı)", "currentSensorFault", "Raf akımı hatalı okunur; CSE (30246 b2) → raf açılır."),
  rackFlag("rack.contactorWeld", "Kontaktör kaynaması (açılmıyor)", "contactorOpenFailure", "Açma komutundan sonra akım akmaya devam eder → 10 s MCOF (COF) → bölüm limitleri 0 (PCS durmalı)."),
  rackFlag("rack.contactorFb", "Kontaktör geri bildirim hatası", "contactorFeedbackFail", "Component Feedback (summary+3) MC(+) açık görünür → 5 s MCFF."),
  rackFlag("rack.fan", "Paket fan arızası", "packFanFail", "Paket→hava ısıl direnç artar, raf daha hızlı ısınır; 30 s sonra Pack Fan Error uyarısı."),
  rackFlag("rack.fuse", "BPU sigortası attı", "fuseBlown", "Raf akım taşıyamaz, online sayılmaz; kapalıyken RCF (30300 b10)."),
  rackFlag("rack.regulator", "RBMS güç regülatörü arızası", "powerRegulatorFault", "5 s sonra RPRF (30248 b14) → raf açılır."),
  {
    id: "rack.forceDiag", group: "Raf / RBMS", target: "rack", label: "Teşhis zorla (herhangi bir raf teşhisi)",
    expect: "Seçilen LGES teşhisi aktif olur ve aksiyonu uygulanır (limit düşümü / raf açma).",
    params: [{ key: "code", label: "Teşhis", type: "select", default: "OTW", options: ["OVF2","OVF1","OVW","UVF1","UVW","PDVF","PDVW","RDVW","OCCF","OCCW","UTF1","UTW","OTF1","OTW","ODCF1","ODCW","OCPF","OCPW","DTW","USOHF","USOHA","USOCW","OSOCW","ODPF","ODPW","RPLOC","CWEF","CWEA","MCFF","TSE","CSE","MCOF","PBMSF","PFE","RPRF","MOOCA","RCF","RBSCLOC"].map((c) => ({ value: c, label: c })) }],
    apply: (p, t, a) => { rack(p, t).diag.forced.add(String(a.code)); },
    clear: (p, t, a) => { rack(p, t).diag.forced.delete(String(a.code)); },
  },
  // ─────────────── BSC ───────────────
  {
    id: "bsc.frozen", group: "BSC", target: "bsc", label: "BSC yazılımı donması",
    expect: "BSC heartbeat (30035) artmaz, komutlara cevap vermez; EMS heartbeat izleme ile 'BSC iletişim yok' teşhisi koymalı.",
    apply: (p, t) => bsc(p, t).setFrozen(true), clear: (p, t) => bsc(p, t).setFrozen(false),
  },
  {
    id: "bsc.forceDiag", group: "BSC", target: "bsc", label: "Bölüm teşhisi zorla",
    expect: "BSC Information (30037) alarm/uyarı/arıza biti ve ilgili 3004x biti; aksiyon: limit 0 / tüm raflar açık / Emergency.",
    params: [{ key: "code", label: "Teşhis", type: "select", default: "SOCPW", options: ["BSCEMSLOC_A","BSCEMSLOC","SUSOCW","SOSOCW","SODPW","SODPF","SOCPW","SOCPF","SLFA","MFRD","OORW"].map((c) => ({ value: c, label: c })) }],
    apply: (p, t, a) => { bsc(p, t).diag.forced.add(String(a.code)); },
    clear: (p, t, a) => { bsc(p, t).diag.forced.delete(String(a.code)); },
  },
  {
    id: "bsc.slf", group: "BSC", target: "bsc", label: "Sistem log hatası (SLF)",
    expect: "30045 b6 SLF alarm.",
    apply: (p, t) => { bsc(p, t).slf = true; }, clear: (p, t) => { bsc(p, t).slf = false; },
  },
  {
    id: "bsc.lgesClear", oneShot: true, group: "BSC", target: "bsc", label: "LGES servis temizliği (CER dahil)",
    expect: "PDVF/RDVF/MFRD dahil tüm teşhisler temizlenir (sahada yalnız LGES personeli yapar).",
    apply: (p, t) => bsc(p, t).lgesClear(), clear: () => undefined,
  },
  // ─────────────── PCS ───────────────
  {
    id: "pcs.faultBit", group: "PCS", target: "pcs", label: "PCS arıza biti (Appendix 2)",
    expect: "Fault Status (12099)=1, ilgili Fault Word biti; PCS dalga çıkışını durdurur, AC/DC kesiciler açılır, durum 6. Şebeke/haberleşme kaynaklı olanlar koşul kalkınca otomatik, diğerleri Fault Reset ile temizlenir.",
    params: [{ key: "bit", label: "Bit", type: "select", default: "2:3", options: pcsFaultOptions }],
    apply: (p, t, a) => { pcs(p, t).forcedFaults.add(String(a.bit)); },
    clear: (p, t, a) => { pcs(p, t).forcedFaults.delete(String(a.bit)); },
  },
  {
    id: "pcs.alarmBit", group: "PCS", target: "pcs", label: "PCS alarm biti (Appendix 3)",
    expect: "Alarm Status (12101)=1, ilgili Alarm Word biti; PCS çalışmaya devam eder.",
    params: [{ key: "bit", label: "Bit", type: "select", default: "7:9", options: pcsAlarmOptions }],
    apply: (p, t, a) => { pcs(p, t).forcedAlarms.add(String(a.bit)); },
    clear: (p, t, a) => { const x = pcs(p, t); x.forcedAlarms.delete(String(a.bit)); const [w, b] = String(a.bit).split(":").map(Number); x.raiseAlarm(w!, b!, false); },
  },
  ...(["local", "remote", "bms"] as const).map((k): FaultDef => ({
    id: `pcs.estop.${k}`, group: "PCS", target: "pcs", label: `Acil durdurma — ${k === "local" ? "yerel buton" : k === "remote" ? "uzak" : "BMS"}`,
    expect: `12128 bit${k === "local" ? 0 : k === "remote" ? 1 : 2}; PCS anında durur, kesiciler açılır, Fault. Buton bırakılıp Fault Reset yapılana kadar Fault kalır.`,
    apply: (p, t) => pcs(p, t).setEstop(k, true), clear: (p, t) => pcs(p, t).setEstop(k, false),
  })),
  {
    id: "pcs.door", group: "PCS", target: "pcs", label: "PCS kabin kapısı açık",
    expect: "DI Status 1 (8283) b0 + Alarm Word 7 b9 (Cabinet door).",
    apply: (p, t) => { pcs(p, t).doorOpen = true; }, clear: (p, t) => { pcs(p, t).doorOpen = false; },
  },
  {
    id: "pcs.cooling", group: "PCS", target: "pcs", label: "PCS soğutma arızası (pompa/fan)",
    expect: "IGBT/reaktör sıcaklıkları yükselir → Derated (12121) → 80 °C üstü güç düşümü → 85 °C IGBT alarm → 95 °C IGBT over-temp fault.",
    apply: (p, t) => { pcs(p, t).coolingFail = true; }, clear: (p, t) => { pcs(p, t).coolingFail = false; },
  },
  {
    id: "pcs.insulation", group: "PCS", target: "pcs", label: "DC izolasyon düşük",
    expect: "Grounding insulation impedance (12138) düşer; <100 kΩ Alarm Word 3 b15 (Low insulation resistance).",
    params: [{ key: "kohm", label: "İzolasyon", type: "number", default: 60, min: 1, max: 3000, unit: "kΩ" }],
    apply: (p, t, a) => { pcs(p, t).insulationKohm = num(a.kohm, 60); }, clear: (p, t) => { pcs(p, t).insulationKohm = 3200; },
  },
  {
    id: "pcs.local", group: "PCS", target: "pcs", label: "PCS yerel (HMI) moda alındı",
    expect: "S01 Command Source = 0 → PCS EMS komutlarını yok sayar (gerçek profil). EMS 'Command Source' okumalı ve 'set_command_source' ile geri almalı.",
    apply: (p, t) => { pcs(p, t).settings.set(0x0e00, 0); }, clear: (p, t) => { pcs(p, t).settings.set(0x0e00, 1); },
  },
  {
    id: "pcs.emsWatchdog", group: "PCS", target: "pcs", label: "PCS EMS haberleşme denetimi (C24)",
    expect: "EMS bu süre boyunca PCS'e hiç istek göndermezse Fault Word 6 b5 (EMS communication fault) → PCS durur.",
    params: [{ key: "s", label: "Zaman aşımı", type: "number", default: 10, min: 1, max: 60, unit: "s" }],
    apply: (p, t, a) => { pcs(p, t).emsTimeoutS = num(a.s, 10); }, clear: (p, t) => { pcs(p, t).emsTimeoutS = 0; },
  },
  {
    id: "pcs.bmsWatchdog", group: "PCS", target: "pcs", label: "PCS BMS zaman aşımı süresi (C61)",
    expect: "BMS bloğu bu süre içinde yazılmazsa Fault Word 6 b0 (BMS communication fault).",
    params: [{ key: "s", label: "Zaman aşımı", type: "number", default: 3, min: 1, max: 60, unit: "s" }],
    apply: (p, t, a) => { pcs(p, t).bmsTimeoutS = num(a.s, 3); }, clear: (p, t) => { pcs(p, t).bmsTimeoutS = 10; },
  },
  // ─────────────── HVAC ───────────────
  hvacFlag("hvac.compressor", "Kompresör arızası", "compressorFault", "0x303=1, durum 3 (fault); soğutma durur → zon ve raf sıcaklıkları yükselir → BSC TPC/OTW."),
  hvacFlag("hvac.indoorFan", "İç fan arızası", "indoorFanFail", "0x301=1, iç fan durumu 3, kompresör çalışamaz → soğutma yok."),
  hvacFlag("hvac.outdoorFan", "Dış fan arızası", "outdoorFanFail", "0x302=1; kondenser ısınır → yüksek basınç (0x305), 3 kez → kilit (0x310)."),
  hvacFlag("hvac.returnProbe", "Dönüş havası sensörü arızası", "returnProbeFail", "0x1008 = 0xFFFF, 0x304=1; mod 4 değilse kompresör çalışmaz."),
  hvacFlag("hvac.condProbe", "Kondenser sensörü arızası", "condenserProbeFail", "0x100E = 0xFFFF, 0x30D=1."),
  hvacFlag("hvac.evapProbe", "Evaporatör sensörü arızası", "evaporatorProbeFail", "0x1010 = 0xFFFF, 0x30C=1."),
  hvacFlag("hvac.ambientProbe", "Dış ortam sensörü arızası", "ambientProbeFail", "0x100C = 0xFFFF, 0x30E=1."),
  {
    id: "hvac.powerLoss", group: "HVAC", target: "hvac", label: "Klima beslemesi kesildi",
    expect: "Klima durur ve Modbus'ta cevap vermez (bağlantı düşer); zon ısınır. EMS iletişim kaybı alarmı vermeli.",
    apply: (p, t) => { hvac(p, t).inj.powerLoss = true; },
    clear: (p, t) => { hvac(p, t).inj.powerLoss = false; p.devices.get(t)?.server.setFault({ mode: "online" }); },
  },
  {
    id: "hvac.leak", group: "HVAC", target: "hvac", label: "Soğutucu akışkan kaçağı",
    expect: "Soğutma kapasitesi düşer, evaporatör soğur; >%70 kaçakta düşük basınç alarmı (0x312) ve kompresör durur.",
    params: [{ key: "pct", label: "Kapasite kaybı", type: "number", default: 60, min: 5, max: 100, unit: "%" }],
    apply: (p, t, a) => { hvac(p, t).inj.refrigerantLeak = num(a.pct, 60) / 100; }, clear: (p, t) => { hvac(p, t).inj.refrigerantLeak = 0; },
  },
  {
    id: "hvac.filter", group: "HVAC", target: "hvac", label: "Kirli filtre (hava debisi düşük)",
    expect: "İç fan devri düşer, soğutma kapasitesi azalır.",
    params: [{ key: "pct", label: "Debi kaybı", type: "number", default: 60, min: 5, max: 95, unit: "%" }],
    apply: (p, t, a) => { hvac(p, t).inj.dirtyFilter = num(a.pct, 60) / 100; }, clear: (p, t) => { hvac(p, t).inj.dirtyFilter = 0; },
  },
  {
    id: "hvac.acV", group: "HVAC", target: "hvac", label: "Klima besleme gerilimi sapması",
    expect: ">253 V 0x309 AC aşırı gerilim, <187 V 0x30A düşük gerilim, <160 V klima durur.",
    params: [{ key: "v", label: "Gerilim", type: "number", default: 175, min: 0, max: 300, unit: "V" }],
    apply: (p, t, a) => { hvac(p, t).inj.acVoltage = num(a.v, 175); }, clear: (p, t) => { hvac(p, t).inj.acVoltage = null; },
  },
  // ─────────────── Haberleşme (her cihaz) ───────────────
  ...([
    ["comm.offline", "Cihaz çevrim dışı (TCP bağlantısı yok)", "offline", "Port bağlantıyı keser; EMS bağlantı hatası / iletişim kaybı alarmı vermeli."],
    ["comm.timeout", "Cevap yok (timeout)", "timeout", "TCP açık, istekler cevapsız; EMS istek zaman aşımına düşmeli."],
    ["comm.freeze", "Donmuş veri (stale)", "freeze", "Cihaz cevap verir ama değerler değişmez (heartbeat dahil) — EMS heartbeat/değişim izlemesiyle yakalamalı."],
  ] as const).map(([id, label, mode, expect]): FaultDef => ({
    id, group: "Haberleşme", target: "any", label, expect,
    apply: (p, t) => p.devices.get(t)!.server.setFault({ mode }),
    clear: (p, t) => p.devices.get(t)!.server.setFault({ mode: "online" }),
  })),
  {
    id: "comm.delay", group: "Haberleşme", target: "any", label: "Yanıt gecikmesi", expect: "Her yanıt belirtilen süre gecikir — EMS poll döngüsü ve komut zaman aşımları test edilir.",
    params: [{ key: "ms", label: "Gecikme", type: "number", default: 1500, min: 10, max: 20000, unit: "ms" }],
    apply: (p, t, a) => p.devices.get(t)!.server.setFault({ mode: "delay", delayMs: num(a.ms, 1500) }),
    clear: (p, t) => p.devices.get(t)!.server.setFault({ mode: "online" }),
  },
  {
    id: "comm.exception", group: "Haberleşme", target: "any", label: "Modbus exception", expect: "Tüm isteklere seçili exception kodu döner.",
    params: [{ key: "code", label: "Kod", type: "select", default: 4, options: [{ value: 1, label: "0x01 Illegal Function" }, { value: 2, label: "0x02 Illegal Address" }, { value: 3, label: "0x03 Illegal Value" }, { value: 4, label: "0x04 Device Failure" }, { value: 6, label: "0x06 Device Busy" }] }],
    apply: (p, t, a) => p.devices.get(t)!.server.setFault({ mode: "exception", exceptionCode: num(a.code, 4) as 1 | 2 | 3 | 4 | 6 }),
    clear: (p, t) => p.devices.get(t)!.server.setFault({ mode: "online" }),
  },
  {
    id: "comm.lossy", group: "Haberleşme", target: "any", label: "Paket kaybı (aralıklı)", expect: "İsteklerin bir kısmı cevapsız kalır.",
    params: [{ key: "pct", label: "Kayıp oranı", type: "number", default: 30, min: 1, max: 99, unit: "%" }],
    apply: (p, t, a) => p.devices.get(t)!.server.setFault({ mode: "lossy", dropRatio: num(a.pct, 30) / 100 }),
    clear: (p, t) => p.devices.get(t)!.server.setFault({ mode: "online" }),
  },
  {
    id: "link.broken", group: "Haberleşme", target: "link", label: "BSC→PCS BMS bağlantısı koptu",
    expect: "PCS BMS bloğu güncellenmez → C61 süresi (vars. 10 s) sonra PCS Fault Word 6 b0 BMS communication fault → PCS durur; konnektör link=0.",
    apply: (p, t) => { p.links.get(t)!.broken = true; }, clear: (p, t) => { p.links.get(t)!.broken = false; },
  },
  {
    id: "assist.noHeartbeat", group: "Haberleşme", target: "site", label: "EMS yardımcısı heartbeat'i kes",
    expect: "Sim-Lab'ın EMS yerine yazdığı 40000 heartbeat durur (EMS de yazmıyorsa BSC S-C LOC — heartbeat denetimi açıkken).",
    apply: (p) => { p.assist.heartbeat = false; }, clear: (p) => { p.assist.heartbeat = true; },
  },
  // ─────────────── Saha / şebeke / diğer ───────────────
  {
    id: "grid.voltage", group: "Şebeke / Ortam", target: "site", label: "Şebeke gerilim sapması",
    expect: "621–759 V dışı → PCS Grid AC under/over voltage fault (FW3 b0 / FW2 b15); geri gelince otomatik toparlanma süresi sonra Stop.",
    params: [{ key: "pu", label: "Gerilim", type: "number", default: 0.85, min: 0, max: 1.3, step: 0.01, unit: "pu" }],
    apply: (p, _t, a) => { p.grid.override.vPu = num(a.pu, 0.85); }, clear: (p) => { delete p.grid.override.vPu; },
  },
  {
    id: "grid.freq", group: "Şebeke / Ortam", target: "site", label: "Şebeke frekans sapması",
    expect: "47.5–51.5 Hz dışı → PCS over/under frequency fault (FW3 b1/b2).",
    params: [{ key: "hz", label: "Frekans", type: "number", default: 51.8, min: 45, max: 55, step: 0.05, unit: "Hz" }],
    apply: (p, _t, a) => { p.grid.override.hz = num(a.hz, 51.8); }, clear: (p) => { delete p.grid.override.hz; },
  },
  {
    id: "env.heatwave", group: "Şebeke / Ortam", target: "site", label: "Sıcak hava dalgası",
    expect: "Dış ortam artar → klima kapasitesi düşer, PCS >45 °C derating (Derated b0), zon/raf sıcaklıkları yükselir.",
    params: [{ key: "dC", label: "Ek sıcaklık", type: "number", default: 14, min: -30, max: 30, unit: "°C" }],
    apply: (p, _t, a) => { p.weather.offsetC = num(a.dC, 14); }, clear: (p) => { p.weather.offsetC = 0; },
  },
  {
    id: "mv.trip", group: "Şebeke / Ortam", target: "mv", label: "OG kesici açma (H01/H04/H05)",
    expect: "İlgili PCS şebekeyi kaybeder → Grid AC undervoltage fault; kesici kapatılınca otomatik toparlanma.",
    params: [{ key: "cell", label: "Hücre", type: "select", default: "H04", options: ["H01", "H02", "H04", "H05"].map((c) => ({ value: c, label: c })) }],
    apply: (p, t, a) => { const coil = { H01: 0, H02: 2, H04: 4, H05: 6 }[String(a.cell) as "H01"] ?? 4; legacy<DemoMvStationSimulator>(p, t).writeCoil(coil, true); },
    clear: (p, t, a) => { const coil = ({ H01: 1, H02: 3, H04: 5, H05: 7 } as Record<string, number>)[String(a.cell)] ?? 5; legacy<DemoMvStationSimulator>(p, t).writeCoil(coil, true); },
  },
  {
    id: "cb.trip", group: "Şebeke / Ortam", target: "cb", label: "DC şalter açma (yük altında)",
    expect: "PCS DC tarafı batarya gerilimini kaybeder → Battery voltage too low fault; BSC akımı 0'a düşer.",
    apply: (p, t) => legacy<CbSimulator>(p, t).writeCoil(0, true),
    clear: (p, t) => legacy<CbSimulator>(p, t).writeCoil(1, true),
  },
  {
    id: "imd.fault", group: "Şebeke / Ortam", target: "imd", label: "IMD izolasyon arızası",
    expect: "IMD alarm/prewarning = 4, direnç <100 kΩ; ilk dizinin PCS izolasyon empedansı da düşer.",
    apply: (p, t) => legacy<ImdSimulator>(p, t).setFault(true), clear: (p, t) => legacy<ImdSimulator>(p, t).setFault(false),
  },
  {
    id: "io.fss", group: "Şebeke / Ortam", target: "io", label: "Yangın söndürme (FSS) durumu",
    expect: "Kontrol paneli DI: FSS fault / discharged / 2nd stage. EMS manevra kurallarını tetiklemeli.",
    params: [{ key: "state", label: "Durum", type: "select", default: "discharged", options: [{ value: "fault", label: "FSS Fault" }, { value: "secondStage", label: "2. kademe" }, { value: "discharged", label: "Gaz boşaldı" }] }],
    apply: (p, t, a) => legacy<ControlPanelIoSimulator>(p, t).setFssState({ [String(a.state)]: true }),
    clear: (p, t) => legacy<ControlPanelIoSimulator>(p, t).setFssState({ fault: false, discharged: false, secondStage: false }),
  },
  {
    id: "io.door", group: "Şebeke / Ortam", target: "io", label: "Konteyner kapısı açık",
    expect: "Batarya/panel kapı kontağı DI açık (FL-07).",
    params: [{ key: "which", label: "Kapı", type: "select", default: "battery", options: [{ value: "battery", label: "Batarya odası" }, { value: "panel", label: "Panel" }] }],
    apply: (p, t, a) => legacy<ControlPanelIoSimulator>(p, t).setDoorState({ batteryOpen: a.which !== "panel", panelOpen: a.which === "panel" }),
    clear: (p, t) => legacy<ControlPanelIoSimulator>(p, t).setDoorState({ batteryOpen: false, panelOpen: false }),
  },
  {
    id: "dcmeter.alarm", group: "Şebeke / Ortam", target: "dcmeter", label: "DC metre alarm word",
    expect: "DJSF1352 alarm word (addr 19) ham değer.",
    params: [{ key: "w", label: "Alarm word", type: "number", default: 1, min: 0, max: 65535 }],
    apply: (p, t, a) => legacy<DcMeterSimulator>(p, t).setMeasurements({ alarmWord: num(a.w, 1) }),
    clear: (p, t) => legacy<DcMeterSimulator>(p, t).setMeasurements({ alarmWord: 0 }),
  },
];

/** Aktif arızaları yöneten kayıt. */
export class FaultManager {
  private seq = 0;
  readonly active: ActiveFault[] = [];
  constructor(private readonly plant: Plant) {
    plant.activeFaultTag = (tag) => this.active.some((a) => `${a.defId}:${a.target}` === tag);
  }
  def(id: string): FaultDef {
    const d = FAULTS.find((f) => f.id === id);
    if (!d) throw new Error(`Bilinmeyen arıza: ${id}`);
    return d;
  }
  inject(defId: string, target: string, params: Record<string, unknown> = {}): ActiveFault {
    const d = this.def(defId);
    const merged: Record<string, unknown> = {};
    for (const pd of d.params ?? []) merged[pd.key] = params[pd.key] ?? pd.default;
    d.apply(this.plant, target, merged);
    const oneShot = d.oneShot === true;
    const af: ActiveFault = { uid: ++this.seq, defId, target, params: merged, since: Date.now(), simSince: this.plant.simT, label: d.label };
    this.plant.events.push("fault", target, `⚡ Enjeksiyon: ${d.label}${Object.keys(merged).length ? ` (${Object.entries(merged).map(([k, v]) => `${k}=${String(v)}`).join(", ")})` : ""}`);
    if (!oneShot) this.active.push(af);
    return af;
  }
  clear(uid: number): void {
    const i = this.active.findIndex((a) => a.uid === uid);
    if (i < 0) return;
    const a = this.active[i]!;
    this.def(a.defId).clear(this.plant, a.target, a.params);
    this.active.splice(i, 1);
    this.plant.events.push("info", a.target, `✓ Temizlendi: ${a.label}`);
  }
  clearAll(): void {
    for (const a of [...this.active]) this.clear(a.uid);
  }
  clearMatching(defId: string, target?: string): void {
    for (const a of [...this.active]) if (a.defId === defId && (!target || a.target === target)) this.clear(a.uid);
  }
}
