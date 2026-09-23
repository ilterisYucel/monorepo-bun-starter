// IMD Register Map — isoPV1685RTU (Bender) GERÇEK Modbus sözleşmesi — K4.
// Kaynak: docs/devices/isoPV1685RTU_D00007_A_XXEN_Modbus.pdf §3
// (Modbus Registerbelegung — 07.2023).
//
// Measuring values (FC03, input register, RO):
// - 0x2000 (8192) Insulation resistance          UInt32  2 regs  Ω
// - 0x2002 (8194) Leakage capacity               Float   2 regs  F
// - 0x2004 (8196) Prewarning (Insulation res.)   UInt16  1 reg   0-OK; 4-Warning
// - 0x2005 (8197) Alarm (Insulation res.)        UInt16  1 reg   0-OK; 4-Warning
// - 0x2006 (8198) net voltage                    Int16   1 reg   V
// - 0x2007 (8199) Voltage U+/Earth               Int16   1 reg   V
// - 0x2008 (8200) Voltage U-/Earth               Int16   1 reg   V
// - 0x2009 (8201) Temperature coupling L+        Int16   1 reg   °C
// - 0x200A (8202) Temperature coupling L-        Int16   1 reg   °C
// - 0x200B (8203) Alarm Overtemperature L+       UInt16  1 reg   0-OK; 4-Warning
// - 0x200C (8204) Alarm Overtemperature L-       UInt16  1 reg   0-OK; 4-Warning
// - 0x200D (8205) Connection Earth (E/KE)        UInt16  1 reg   0-OK; 2-Error
// - 0x200E (8206) Device error                   UInt16  1 reg   0-no error; >0 code
// - 0x200F (8207) Status Test                    UInt16  1 reg   0/1/2
//
// FL-11 kural girdileri: "Insulation Alarm" (8197) + "Device Error" (8206) —
// KONTEYNER-MANEVRA-KATALOGU-REV03 §2.8.

export const INPUT = {
  INSULATION_RESISTANCE: 8192, // uint32 (8192-8193), Ω
  PREWARNING: 8196, // uint16 — 0 OK · 4 Warning
  ALARM: 8197, // uint16 — 0 OK · 4 Warning
  DEVICE_ERROR: 8206, // uint16 — 0 yok · >0 hata kodu
} as const;
