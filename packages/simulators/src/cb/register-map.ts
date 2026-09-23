// CB Register Map — DC Şalter (SYW6GZ-4000) sözleşmesi — K2.
// Kaynak: KONTEYNER-MANEVRA-KATALOGU-REV03-MIMARISI.md §2.0 (K2):
//   Kesici (CB) → ŞALTER modeli: trip/akım/sıcaklık/eşik semantiği YOKTUR.
//   open  = shunt trip coil (uzaktan açma), close = closing coil.
//   Durum: aux kontaklar — DI 0 = Is Closed (NC), DI 1 = Is Open (NO).
//
// Sözleşme:
// - COILS: OPEN (0), CLOSE (1). RESET kaldırıldı (şalterde trip yok).
// - DISCRETE INPUTS: IS_CLOSED (0), IS_OPEN (1) — biri diğerinin değili.
// - INPUT REGISTERS / HOLDING REGISTERS: YOKTUR (okuma döndürmez).

export const COILS = {
  OPEN: 0,
  CLOSE: 1,
} as const;

export const DISCRETE = {
  IS_CLOSED: 0,
  IS_OPEN: 1,
} as const;
