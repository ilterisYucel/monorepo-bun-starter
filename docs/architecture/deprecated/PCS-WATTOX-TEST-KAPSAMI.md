---
status: active
space: architecture
tags: [test-kapsami, pcs, wattox, simulator]
review_date: 2026-09-15
---

# Wattox PCS — Test Kapsamı (Aşama 6/6)

> **Yaşayan doküman** (AGENTS hibrit kural): test genişletileceği zaman üzerinde çalışılır; değişiklikte `test-envanteri.md` ile birlikte güncellenir.
> Kapsam: `packages/simulators/src/wattox-pcs/*` + `validate-expect` + `config-field/pcs-1.json` + device-service validation döngüsü.

## 1. validate-expect (shared-types) — `validate-expect.test.ts` (7)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| Sözcük tanıma | negative/positive/zero/nonzero | true; diğer string/sayı/boolean false |
| negative | −100, −0.5 / 0, 5, "−5", true | ilk ikisi tutar, kalanı tutmaz |
| positive | 100 / 0, −1, "5" | yalnız ilki |
| zero / nonzero | 0 / 1, −1, 0, "x" | birebir |
| Birebir eşitlik | sayı/string/boolean; "2" vs 2 | `===` (kesin) |

## 2. Device-service validation — `device-service.test.ts` (3 yeni)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| İlişki sağlanıyor | read-back 100, expect "positive" | `{success:true, validated:true}` |
| İlişki sağlanmıyor | read-back −100 | timeout sonuna kadar poll → `validated:false` |
| Eşitlik geriye uyumlu | expect "open", read-back "open" | validated true |

## 3. WattoxPcsSimulator — `wattox-pcs.test.ts` (17)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| İlk değerler | nominal: anma 1725/1500/1900, Stop, 50Hz, 400V, fault/alarm 0, maks şarj raw 63811 (−1725) | birebir |
| start | SET_START=1 (Stop'ta) | Standby; komut register yazılanı tutar |
| negatif setpoint | SET_ACTIVE_POWER=−500 | Charging; grid güç −500; charging=1/discharging=0 |
| pozitif setpoint | +800 | Discharging |
| sıfır setpoint | 0 (şarjdayken) | Standby; güç 0 |
| stop | SET_STOP=1 | Stop + setpoint 0 |
| standby | SET_STANDBY=1 | Standby (işletmeden) |
| fault/reset | fault word1 bit5 → reset | fault durumu 1 + Fault; reset → 0 + Standby |
| islanding alarmı | alarm word3 bit9 | alarm durumu 1 |
| fault word adresleri | word10=0x1234 | FAULT_WORD_1+9 okunur |
| E-stop bitleri | local+remote+bms | 0b101 |
| EMS RO / BMS yazım | writeHolding(BMS) yok sayılır; setBmsRegister yazar | izolasyon |
| setBmsRegister aralık | 767 / 791 | throw |
| komut kaynağı | SET_COMMAND_SOURCE=1 | okunur |
| tick kararlılığı | tick(1) | durum değişmez |
| BMS varsayılanları | SOC 500, voltaj 15000 | birebir |
| çoklu okuma | 3 register | sıralı |

## 4. BmsPortServer — `bms-port-server.test.ts` (8)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| FC 0x03 | BMS bloğu okuma | değer + fonksiyon kodu |
| FC 0x06 | yazım | simülatör deposuna uygulanır |
| FC 0x10 | çoklu yazım | birebir |
| aralık dışı yazım | 767/791 | exception 0x02 (0x86) |
| aralık dışı okuma | REG_OP_STATUS | exception 0x02 (0x83) |
| bilinmeyen FC | 0x05 | exception 0x01 |
| start idempotent | 2× start | aynı port |
| stop sonrası | bağlantı | reddedilir |

## 5. Config — `config-field.test.ts` (8)

| Durum | Beklenen |
|:------|:---------|
| Şema geçerliliği | PCS-1, simulator/wattox-pcs |
| Komut/validate ad referansları | tümü telemetride |
| Şarj NEGATİF konvansiyonu | `-{{powerKw}}` / `{{powerKw}}` |
| İlişki sözcükleri | ≥3 |
| Bitfield adresleri | telemetride kayıtlı |
| B01-B23 | 23 kayıt (768-790) |
| Alarm bitfield'ları | 8 sözcük |
| S-register'ları | HOLDING + INT16 |

## KAPSANMAYAN (boşluklar)

| # | Boşluk | Neden | Öncelik |
|:--|:-------|:------|:--------|
| B1 | Fault word'leri (D01-D10) bitfield çözümlemesi | S4 sapması — App.2 tam bit listesi gerekli | Orta |
| B2 | A87-A89 versiyon register'ları | S2 — önceliksiz metadata | Düşük |
| B3 | Rampa davranışı (S11 güç değişim hızı) simüle edilmiyor (anında setpoint) | AGENTS "komut anında uygulanır" kuralı | — |
| B4 | FC 0x03 BMS portunda çoklu-çerçeve/pipelining | tek istek-tek yanıt MVP | Düşük |
