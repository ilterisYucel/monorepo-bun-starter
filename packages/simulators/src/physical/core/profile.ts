// Gerçeklik profili — "uyumlu" (bugünkü EMS'i kırmadan gerçekçi fizik) ve
// "gercek" (cihaz dokümanlarına birebir; EMS hatalarını açığa çıkarır).
// Her esneklik bir uyumluluk uyarısı üretir (EventLog.compatWarn) — backend
// düzeltme listesi buradan çıkar.

export type ProfileName = "uyumlu" | "gercek";

export interface Realism {
  profile: ProfileName;
  /**
   * BSC raf blok adımı: "auto" device-config telemetrisinden çıkarır.
   * Rev AF gerçek değeri 150; bugünkü bsc-*.json telemetrisi 200 kullanıyor.
   */
  bscRackStride: "auto" | 150 | 200;
  /** FC politikası: lenient → desteklenmeyen FC de yanıtlanır + uyarı; strict → 0x01. */
  fcStrict: boolean;
  /** BSC: controller heartbeat (40000) denetimi — Rev AF/teşhis dokümanı: 20 s LOC → kontaktör açma. */
  bscHeartbeatCheck: boolean;
  /** Cihaza geçersiz değer yazımı: lenient → kabul + uyarı; strict → 0x03 (Illegal Data Value). */
  rejectInvalidValues: boolean;
  /** Zamanlama: fast → EMS zaman aşımlarına sığar; realistic → saha tipik süreleri. */
  timing: "fast" | "realistic";
  /** BSC→PCS BMS bağlantısı: internal (doğru eşleme) | mapping (repo'daki mapping dosyası birebir). */
  bmsLink: "internal" | "mapping";
  /** Wattox: komut kaynağı (S01) yerel/HMI iken EMS komutlarını yok say. */
  pcsEnforceCommandSource: boolean;
}

export function profileDefaults(name: ProfileName): Realism {
  if (name === "gercek") {
    return {
      profile: "gercek",
      bscRackStride: 150,
      fcStrict: true,
      bscHeartbeatCheck: true,
      rejectInvalidValues: true,
      timing: "realistic",
      bmsLink: "mapping",
      pcsEnforceCommandSource: true,
    };
  }
  return {
    profile: "uyumlu",
    bscRackStride: "auto",
    fcStrict: false,
    bscHeartbeatCheck: false,
    rejectInvalidValues: false,
    timing: "fast",
    bmsLink: "internal",
    pcsEnforceCommandSource: false,
  };
}

/** Zamanlama sabitleri (saniye). */
export interface Timings {
  bscInitPerRack: number; // Initializing sırasında raf başına
  bscInitBase: number;
  rackCloseStep: number; // Rev AF: kapama zaman aşımı = N*400 ms + 5 s → ~0.4 s/raf
  rackPrecharge: number;
  ackDoneToNone: number; // Rev AF: Done → 3 s sonra None
  pcsSelfCheck: number;
  pcsSoftStart: number; // Stop → Standby (DC/AC ön şarj + röle kontrolleri)
  pcsFaultAutoRecover: number;
  hvacCompressorStartDelay: number;
  hvacCompressorMinOff: number;
  hvacServerTempTimeout: number; // EMS sunucu sıcaklığı yazmazsa dönüş havasına geçiş
}

export function timings(t: Realism["timing"]): Timings {
  if (t === "realistic") {
    return {
      bscInitPerRack: 1.5,
      bscInitBase: 6,
      rackCloseStep: 0.4,
      rackPrecharge: 0.3,
      ackDoneToNone: 3,
      pcsSelfCheck: 8,
      pcsSoftStart: 12,
      pcsFaultAutoRecover: 60,
      hvacCompressorStartDelay: 30,
      hvacCompressorMinOff: 180,
      hvacServerTempTimeout: 120,
    };
  }
  return {
    bscInitPerRack: 0.4,
    bscInitBase: 2,
    rackCloseStep: 0.25,
    rackPrecharge: 0.15,
    ackDoneToNone: 3,
    pcsSelfCheck: 2,
    pcsSoftStart: 1.5,
    pcsFaultAutoRecover: 30,
    hvacCompressorStartDelay: 5,
    hvacCompressorMinOff: 30,
    hvacServerTempTimeout: 120,
  };
}
