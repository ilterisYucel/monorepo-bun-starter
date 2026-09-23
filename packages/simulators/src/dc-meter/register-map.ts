// DC Metre register map — DJSF1352-RN (ACREL) sözleşmesi.
// Kaynak: KONTEYNER-MANEVRA-KATALOGU-REV03-MIMARISI.md §2.6 (K1):
//   FC03 (input register), salt ölçüm — komut YOKTUR.
//   addr 50/52/54 = DC V/I/P (float32, kW) + alarm word addr 19.
//
// Sözleşme:
// - Tüm okumalar INPUT_REGISTER üzerinden; holding/coil/discrete YOKTUR.
// - DC Voltage  (addr 50, FLOAT32 BE — kelime çifti 50-51, V)
// - DC Current  (addr 52, FLOAT32 BE — kelime çifti 52-53, A)
// - DC Power    (addr 54, FLOAT32 BE — kelime çifti 54-55, kW)
// - Alarm Word  (addr 19, UINT16 — bit semantiği gerçek manual gelince
//   netleşir; v1: normal çalışmada 0, senaryo enjeksiyonunda ham değer).
// FL-08 kuralı alarm word'ü KULLANMAZ — eşikler V/I/P telemetrileri üzerinden
// değerlendirilir (1500 V / 1680 A / 1784 kW).

export const INPUT = {
  ALARM_WORD: 19,
  DC_VOLTAGE: 50,
  DC_CURRENT: 52,
  DC_POWER: 54,
} as const;
