// Hazır test senaryoları — saha anormal kondisyonları. Zamanlar simülasyon saniyesidir.
// "autostart" adımı EMS bağlı değilken sistemi devreye alır; EMS bağlıysa çıkarın ve
// devreye almayı EMS'ten yapın (EMS'in tepkisi de test edilmiş olur).

import type { Scenario } from "./engine";

export const BUILTIN_SCENARIOS: Scenario[] = [
  {
    id: "hvac-kompresor-ariza",
    name: "HVAC-3 kompresör arızası (sıcak gün, tam güç deşarj)",
    description: "Dış ortam +10 °C, iki PCS 1600 kW deşarjda. HVAC-3 kompresörü arızalanır: klima Fault (0x1000=3) verir, zon 3 havası diğer zonlardan 8–10 °C yukarı çıkar ve R3 rafları BSC'nin en sıcak rafı olur. Not: raf ısıl kütlesi büyüktür (~1.9 MJ/K/raf); tek klima arızası bir deşarj boyunca rafı 40 °C'ye taşımaz. TPC/OTW davranışını görmek için 'Paket iç ısınma' arızasını ekleyin.",
    speed: 20,
    steps: [
      { at: 0, do: "autostart", powerKw: 1600 },
      { at: 5, do: "inject", fault: "env.heatwave", target: "SITE", params: { dC: 10 } },
      { at: 60, do: "inject", fault: "hvac.compressor", target: "HVAC-3" },
      { at: 60, do: "expect", label: "HVAC-3 durum = 3 (fault)", probe: { kind: "hvacStatus", target: "HVAC-3", equals: 3 }, within: 30 },
      { at: 60, do: "expect", label: "BSC-1/R3 maks. sıcaklık > 27 °C", probe: { kind: "rackTemp", target: "BSC-1/R3", gt: 27 }, within: 1800 },
      { at: 1900, do: "clearAll" },
    ],
  },
  {
    id: "ems-heartbeat-kaybi",
    name: "EMS heartbeat kaybı (BSC S-C LOC)",
    description: "Heartbeat denetimi açılır ve 40000 yazımı kesilir (EMS yardımcısı kapalı). 10 s'de 30043 b0 alarm, 20 s'de b2 fault → limitler 0, tüm raf kontaktörleri açılır; PCS DC gerilimini kaybeder ve 'battery voltage too low' fault verir.",
    speed: 1,
    steps: [
      { at: 0, do: "autostart", powerKw: 800 },
      { at: 15, do: "log", msg: "Heartbeat denetimi açılıyor, yardımcı heartbeat kesiliyor" },
      { at: 15, do: "realism", patch: { bscHeartbeatCheck: true } },
      { at: 15, do: "inject", fault: "assist.noHeartbeat", target: "SITE" },
      { at: 15, do: "expect", label: "BSC-1 S-C LOC fault (30043 b2)", probe: { kind: "bscDiag", target: "BSC-1", code: "BSCEMSLOC", equals: true }, within: 40 },
      { at: 15, do: "expect", label: "BSC-1 online raf = 0", probe: { kind: "bscOnline", target: "BSC-1", equals: 0 }, within: 45 },
      { at: 15, do: "expect", label: "PCS-1 Fault (op=6)", probe: { kind: "pcsOp", target: "PCS-1", equals: 6 }, within: 50 },
      { at: 80, do: "clearAll" },
      { at: 80, do: "realism", patch: { bscHeartbeatCheck: false } },
    ],
  },
  {
    id: "bms-link-kopmasi",
    name: "BSC → PCS BMS bağlantısı kopması",
    description: "Konnektör bağlantısı kesilir; PCS BMS bloğu güncellenmez, C61 (10 s) sonra Fault Word 6 b0 BMS communication fault ile PCS durur.",
    speed: 1,
    steps: [
      { at: 0, do: "autostart", powerKw: 1000 },
      { at: 20, do: "inject", fault: "link.broken", target: "BSC-PCS-CONNECTOR-1" },
      { at: 20, do: "expect", label: "PCS-1 FW6.b0 BMS communication fault", probe: { kind: "pcsFaultBit", target: "PCS-1", word: 6, bit: 0, equals: true }, within: 20 },
      { at: 60, do: "clear", fault: "link.broken" },
    ],
  },
  {
    id: "sebeke-frekans",
    name: "Şebeke aşırı frekans (51.8 Hz)",
    description: "Frekans 51.8 Hz'e çıkar → PCS FW3 b1 Grid AC overfrequency fault. Frekans normale dönünce otomatik toparlanma süresi (hızlı profil 30 s) sonra Stop'a döner; EMS'in yeniden başlatması gerekir.",
    speed: 1,
    steps: [
      { at: 0, do: "autostart", powerKw: 600 },
      { at: 20, do: "inject", fault: "grid.freq", target: "SITE", params: { hz: 51.8 } },
      { at: 20, do: "expect", label: "PCS-1 FW3.b1 overfrequency", probe: { kind: "pcsFaultBit", target: "PCS-1", word: 3, bit: 1, equals: true }, within: 10 },
      { at: 40, do: "clear", fault: "grid.freq" },
      { at: 40, do: "expect", label: "PCS-1 otomatik toparlanma → Stop (op=0)", probe: { kind: "pcsOp", target: "PCS-1", equals: 0 }, within: 90 },
    ],
  },
  {
    id: "hucre-dengesizlik-sarj-sonu",
    name: "Hücre dengesizliği — şarj sonunda aşırı gerilim",
    description: "Tesis %86 SOC'den başlar; BSC-1/R5'te bir hücre +5 % önde. Tam güçte şarj edilirken bu hücre diğerlerinden önce üst gerilime ulaşır: VPC devreye girer, BSC şarj limiti daralır ve PCS (BMS bloğu üzerinden) gücü düşürür. Limitlere uyulduğu sürece hücre 3.70 V OVW eşiğine çıkmaz; EMS limitleri aşan setpoint gönderse bile PCS BMS limitini uygular.",
    speed: 30,
    baseline: { soc: 86 },
    steps: [
      { at: 0, do: "inject", fault: "rack.cellSocStep", target: "BSC-1/R5", params: { cell: 120, delta: 5 } },
      { at: 1, do: "autostart", powerKw: -1600 },
      { at: 600, do: "expect", label: "BSC-1 şarj limiti VPC ile daralır (0 < limit < 1200 kW)", probe: { kind: "bscLimit", target: "BSC-1", dir: "chg", lt: 1200, gt: 1 }, within: 5400 },
      { at: 600, do: "expect", label: "PCS-1 şarj gücü BSC limitine iner (|P| < 1200 kW)", probe: { kind: "pcsPower", target: "PCS-1", gt: -1200 }, within: 5400 },
    ],
  },
  {
    id: "pcs-sogutma-yaz",
    name: "PCS soğutma arızası + yaz sıcağı",
    description: "Dış ortam +16 °C; PCS-1 pompa/fan arızası. IGBT ısınır → Derated (A52 b2/b3), 80 °C üstünde PCS gücünü kendisi düşürür (95 °C'de sıfır). Derating, IGBT'yi 95 °C over-temperature fault eşiğinin (FW2 b3) altında tutar; EMS setpoint ile gerçekleşen güç arasındaki farkı ve Derated bitini göstermeli.",
    speed: 10,
    steps: [
      { at: 0, do: "autostart", powerKw: 1700 },
      { at: 10, do: "inject", fault: "env.heatwave", target: "SITE", params: { dC: 16 } },
      { at: 30, do: "inject", fault: "pcs.cooling", target: "PCS-1" },
      { at: 300, do: "expect", label: "PCS-1 derating ile güç düşer (< 1200 kW)", probe: { kind: "pcsPower", target: "PCS-1", lt: 1200 }, within: 3300 },
      { at: 3700, do: "clearAll" },
    ],
  },
  {
    id: "raf-gerilim-sapmasi",
    name: "Raf gerilim sapması — kapanmayan raf",
    description: "BSC-1/R7 %85 SOC'ye çekilir (diğerleri %55). Start + Close Contactors: R7 ±10 V dışında kalır ve kapatılmaz (7/8 raf online). EMS online raf sayısını ve 'offline raf' durumunu göstermeli.",
    speed: 1,
    steps: [
      { at: 2, do: "inject", fault: "rack.setSoc", target: "BSC-1/R7", params: { soc: 85 } },
      { at: 4, do: "write", device: "BSC-1", address: 40010, value: 2 },
      { at: 15, do: "write", device: "BSC-1", address: 40010, value: 5 },
      { at: 15, do: "expect", label: "BSC-1 online = 7", probe: { kind: "bscOnline", target: "BSC-1", equals: 7 }, within: 20 },
    ],
  },
  {
    id: "kontaktor-kaynama",
    name: "Raf kontaktör kaynaması (COF)",
    description: "BSC-1/R2 kontaktörü kaynamış. Güç verilirken raf aşırı sıcaklıkla açılmak istenir ama akım kesilmez → 10 s MCOF → bölüm limitleri 0. EMS PCS'i durdurmalı.",
    speed: 2,
    steps: [
      { at: 0, do: "autostart", powerKw: 900 },
      { at: 15, do: "inject", fault: "rack.contactorWeld", target: "BSC-1/R2" },
      { at: 16, do: "inject", fault: "rack.forceDiag", target: "BSC-1/R2", params: { code: "OTF1" } },
      { at: 16, do: "expect", label: "BSC-1/R2 MCOF", probe: { kind: "rackDiag", target: "BSC-1/R2", code: "MCOF", equals: true }, within: 30 },
      { at: 16, do: "expect", label: "BSC-1 deşarj limiti = 0", probe: { kind: "bscLimit", target: "BSC-1", dir: "dis", lt: 1 }, within: 35 },
    ],
  },
  {
    id: "acil-durdurma",
    name: "PCS yerel acil durdurma",
    description: "PCS-1 kabin acil durdurma butonuna basılır: anında Fault, 12128 b0, FW6 b15. Buton bırakılıp Fault Reset gelene kadar Fault kalır.",
    speed: 1,
    steps: [
      { at: 0, do: "autostart", powerKw: 1200 },
      { at: 20, do: "inject", fault: "pcs.estop.local", target: "PCS-1" },
      { at: 20, do: "expect", label: "PCS-1 Fault (op=6)", probe: { kind: "pcsOp", target: "PCS-1", equals: 6 }, within: 3 },
      { at: 40, do: "clear", fault: "pcs.estop.local" },
      { at: 41, do: "write", device: "PCS-1", address: 0x0e16, value: 1 },
      { at: 41, do: "expect", label: "Fault Reset sonrası Stop (op=0)", probe: { kind: "pcsOp", target: "PCS-1", equals: 0 }, within: 5 },
    ],
  },
  {
    id: "klima-enerji-kesintisi",
    name: "Klima enerji kesintisi",
    description: "HVAC-5 beslemesi kesilir: klima durur ve Modbus'tan düşer (TCP bağlantısı yok). EMS iletişim kaybı alarmı vermeli. Raflar ısıl kütleleri büyük olduğu için (~1.9 MJ/K/raf) zon havası raflarla birlikte saatte 1–2 °C ısınır; 3 saat sonunda zon 5 ve R5 rafları klimalı zonlardan birkaç derece sıcaktır.",
    speed: 60,
    steps: [
      { at: 0, do: "autostart", powerKw: 1000 },
      { at: 60, do: "inject", fault: "hvac.powerLoss", target: "HVAC-5" },
      { at: 60, do: "expect", label: "Zon 5 havası > 27 °C", probe: { kind: "zoneTemp", target: "HVAC-5", gt: 27 }, within: 10800 },
      { at: 60, do: "expect", label: "BSC-1/R5 sıcaklığı yükselir (> 27 °C)", probe: { kind: "rackTemp", target: "BSC-1/R5", gt: 27 }, within: 10800 },
      { at: 10900, do: "clear", fault: "hvac.powerLoss" },
    ],
  },
];
