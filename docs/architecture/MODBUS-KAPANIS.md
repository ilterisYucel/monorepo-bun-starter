---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, modbus]
review_date: 2026-11-10
---

# Modbus — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer, GLM-5.3).
> **SPEC:** [MODBUS-MIMARISI.md](./MODBUS-MIMARISI.md) (onaylı — AK/FR kaynağı).
> **Kapsam:** SPEC↔kod doğrulaması — bu turda kaynak değişikliği YOK; kanıtlar kod incelemesi + otomatik test envanteridir.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

> Doğrulama kapanışı: onaylı SPEC, mevcut implementasyonla karşılaştırıldı. Kaynak dosya değişmedi.

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/core/src/modbus/device.ts#ModbusDevice` | (doğrulama) `read()` tüm telemetriyi döner — alt küme verilirse yalnız o + bitfield her durumda eklenir (JSDoc sözleşme) | K2/FR-1.1 |
| 2 | `packages/core/src/modbus/device.ts#read` | (doğrulama) sıra: HOLDING→INPUT→COIL→DISCRETE→bitfield; tip içi adrese göre sıralı; `priority` okumada yok | K3/FR-1.1 |
| 3 | `packages/core/src/modbus/device.ts#writeAtomic` | (doğrulama) ham backup → planlı yazım → hata halinde ham geri yükleme → orijinal hata fırlar; rollback hatası yutulur (JSDoc 50-53) | K4/FR-3.1..3.3 |
| 4 | `packages/core/src/modbus/device.ts#_isInvalidValue` | (doğrulama) sentinel 0x7FFF/0x8000/0xFFFF + FLOAT NaN/Inf elenir | K5/FR-1.2 |
| 5 | `packages/core/src/modbus/device.ts` | (doğrulama) `MAX_REGISTERS_PER_REQUEST=125`; bitfield ≤32 bit; yazma yalnız HOLDING+COIL; INPUT-only → writeAtomic no-op | K6/K7/FR-1.3 |
| 6 | `packages/core/src/modbus/device.ts#validateBitfieldConfigs` | (doğrulama) constructor'da fail-fast: bit aralığı 0-31, `bitEnd>=bitStart`, registerType HOLDING/INPUT | K8 |
| 7 | `packages/core/src/modbus/device.ts` | (doğrulama) transport enjekte (`IModbusTransport`); varsayılan TCP istemci kurulumu — simülatör kavramı YOK | K9/Purity 1-3 |
| 8 | `packages/core/src/modbus/client.ts#reconnect` | (doğrulama) exponential `2^n·base`, tavan 30000 ms; jitter `randomFloat()·delay·0.3` | K11/FR-4.2 |
| 9 | `packages/core/src/modbus/device.ts#ensureConnected` | (doğrulama) 10 sn reconnect cooldown → `reconnect cooldown active` | K11/FR-4.1 |
| 10 | `packages/core/src/modbus/client-rtu.ts` | (doğrulama) `bun:ffi` yalnız `connect()` anında dinamik import (`defaultRtuPortFactory`); `ModbusRtuPortFactory` enjekte; `parity` none/even/odd fail-fast | K10/FR-4.3 |
| 11 | `packages/core/src/modbus/transport/modbus-client-transport.ts` | (doğrulama) tek eleman → `writeSingle*`, çoklu → `writeMultiple*` eşlemesi | K12 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri (otomatik) | `bun run test:inventory` | modbus: **72 test / 6 dosya**, it-by-it listeli |
| Cihaz sözleşmesi | `device.test.ts` (31 test) | ISP birleşik dönüş, sentinel 4 dal, scale/offset yazma, transactional rollback 6 dal (TEİAŞ #22), gruplama/sıra/tek-timestamp, tag alt küme, config doğrulama 3 dal, ham backup, 125 limiti, cooldown |
| Decoder | `decoder.test.ts` (20 test) | 4 byte order, 16/32/64-bit, negatif değerler, 4Q_FP_PF, sequential, scale/offset |
| TCP istemci | `client.test.ts` (8 test) | connect/error/timeout, Not connected, sarmalama, reconnect cleanup |
| RTU istemci | `client-rtu.test.ts` (7 test) | varsayılanlar, open/error/timeout, Not connected, close/error düşürme |
| Serial adapter | `serial-socket-adapter.test.ts` (5 test) | olay köprüsü, Uint8Array→Buffer, callback sözleşme |
| Jitter | `utils.test.ts` (1 test) | [0,1) aralığı — 100 örneklem |
| Donanımsız RTU | `tools/rtu-loopback-check.mjs` | kod inceleme — socat PTY çifti; bu turda koşulmadı (B.2/G4) |
| Taze test koşusu | `vitest run` (core/modbus) | **İLETİLMEDİ** — reviewer salt-okuma (B.2/G1) |
| Mutasyon | `bun run test:mutation` | **verisi yok** — bu turda değişen üretim kodu 0 |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Birleşik dönüş + tek timestamp | `device.test.ts` #1, #21 — envanter | 🟡 |
| AK-1.2 | Sentinel değerler çıktıya girmez | `device.test.ts` #4-7 — envanter | 🟡 |
| AK-1.3 | 125 register limiti aşımı hata üretir | `device.test.ts` #30 — envanter | 🟡 |
| AK-2.1 | Yazma sırası `priority` (0 en yüksek) | kod inceleme: JSDoc 48-49 (`priority` yalnız yazma) + #18 (okuma gruplaması priority'den bağımsız) | 🟡 |
| AK-2.2 | INPUT/DISCRETE yazılmaz | `device.test.ts` #17 (INPUT-only no-op) — envanter | 🟡 |
| AK-2.3 | Scale/offset yazma yolunda | `device.test.ts` #8 — envanter | 🟡 |
| AK-3.1 | Yazma hatasında ham geri yükleme | `device.test.ts` #13, #15, #16 — envanter | 🟡 |
| AK-3.2 | Orijinal hata fırlar; rollback hatası yutulur | `device.test.ts` #14 — envanter | 🟡 |
| AK-3.3 | Backup ham register değerleriyle (float kayma yok) | `device.test.ts` #28-29 — envanter | 🟡 |
| AK-4.1 | Bağlantısız çağrı `Not connected` | `client.test.ts` #4, `client-rtu.test.ts` #5 — envanter | 🟡 |
| AK-4.2 | Backoff üstel, 30 sn tavan + jitter | kod inceleme: `client.ts#reconnect` (2^n, min 30000, jitter %30) | 🟢 |
| AK-4.3 | Node tabanlı testte `bun:ffi` yüklenmez | kod inceleme: `client-rtu.ts#defaultRtuPortFactory` dinamik import + `client-rtu.test.ts` (7 test Node'da koşar — kanıt) | 🟡 |
| AK-5.1 | Tip/byte order matrisi | `decoder.test.ts` #1-18 — envanter | 🟡 |
| AK-5.2 | 4Q_FP_PF Schneider eşlemesi | `decoder.test.ts` #19 bloğu — envanter | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | Bayt sırası tutarsızlığı (SPEC B1) | Okuma (`decoder.ts#applyByteOrder`) ile yazma (`device.ts#applyByteOrderToBuffer`) 16-bit `*_SWAP` semantiği uyuşmuyor — SPEC İleri İş/A1; kod bu turda değişmedi |
| S2 | `decoder.ts#RegisterTableType` ölü tip (SPEC B2) | Hiçbir yerde kullanılmıyor — İleri İş/A2 |
| S3 | `decoder.ts#RegisterDataType` yapısal kopya (SPEC B3) | `shared-types` ile çift tanım — İleri İş/A3 |
| S4 | `bun-serialport.d.ts` elle yazılmış shim (SPEC B4) | Build artifacts kuralının belgelenmiş istisnası — dokunulmadı |
| S5 | Taze test koşusu iletilmedi | Reviewer salt-okuma; envanter + kod inceleme kanıtı |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity: `packages/core` jenerik — simülatör/connector kavramı yok (K9; `device.ts` transport enjeksiyonu)
- [x] `jsmodbus`/`node:net`/`bun-serialport` yalnız taşıma katmanında (Purity 3)
- [x] `shared-types` bağımlılığı yalnız `import type` (Purity 4)
- [x] Tek poll = tek `timestamp` (test #21)
- [x] `writeAtomic` cihaz içi TEK rollback noktası (JSDoc + 6 test)
- [x] RTU parity fail-fast; `ModbusRtuPortFactory` DI (K10/K13)

### A.6 Genel Durum Özeti

**MODÜL UYGUN — onay önerisi:** Onaylı SPEC'in 13 kararı implementasyonla birebir doğrulandı; 14 AK'dan 1'i kod incelemeyle 🟢, 13'ü envanter (72 test) + incelemeyle 🟡 — davranış sapması YOK. Güvenlik-kritik yol (`writeAtomic` — fiziksel komut) 6 testle sabit; sentinel filtresi sahte değer koruması 4 testle kanıtlı. Bilinen borçlar (bayt sırası, ölü tip, kopya tip) SPEC'te kayıtlı İleri İş. SPEC'in `⬜` kolonları ve `✏️ Specified` satırları ana agent tarafından `🟢 Doğrulanmış`'a güncellenmeli. **review_date: 2026-11-10**

**NIS-2 uyumluluk kontrolü:** `writeAtomic` fiziksel yazma güvenliği ve sentinel filtresi güvenlik ilgili değişikliklerdir. SPEC'te tehdit modeli TANIMLI DEĞİLDİR (davranış kuralları var, kimden-neyi-korur modeli yok) — **uyumluluk boşluğu olarak işaretlendi**. Öneri: "yanlış değerle fiziksel yazma / arızalı sensör sahte tetiklemesi"ne karşı mevcut korumaların (rollback + sentinel) tek paragraf tehdut modeli olarak SPEC'e eklenmesi; kararı developer.

**Mutasyon öldürme oranı:** verisi yok (bu turda değişen üretim kodu 0). Güvenlik-kritik yol (`device.ts#writeAtomic`) bir sonraki davranış değişikliğinde `--break 90` ile koşmalı.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Register + bitfield cihaz | `read()` | birleşik + tek timestamp | `device.test.ts` #1, #21 |
| UINT16 0xFFFF | okuma | satır elenir | `device.test.ts` #4 |
| INT16 0x7FFF/0x8000 | okuma | elenir | `device.test.ts` #5 |
| FLOAT32 NaN | okuma | elenir | `device.test.ts` #6 |
| 126 register grubu | yazma planı | `Batch too large` hatası | `device.test.ts` #30 |
| Atomic 2. adım hatası | `writeAtomic` | 1. adım ham değerine döner + orijinal hata | `device.test.ts` #13 |
| Rollback sırasında hata | `writeAtomic` | orijinal hata fırlar | `device.test.ts` #14 |
| FLOAT32 rollback | `writeAtomic` | ham register round-trip (kayma yok) | `device.test.ts` #16, #29 |
| INPUT-only girdi | `writeAtomic` | no-op | `device.test.ts` #17 |
| Kopuk bağlantı ×2 (10 sn) | `ensureConnected` | cooldown hatası | `device.test.ts` #31 |
| Bağlı değilken okuma | istemci | `Not connected` | `client.test.ts` #4 / `client-rtu.test.ts` #5 |
| Ardışık reconnect | `client.ts#reconnect` | üstel + 30 sn tavan | **KAPSANMAYAN** (G3 — matematik kodda, doğrudan test yok) |
| Node ortamında RTU import | test çalışır | `bun:ffi` yüklenmez | `client-rtu.test.ts` (dolaylı — 7 test Node'da yeşil) |
| LITTLE_ENDIAN / *_SWAP | decoder | doğru dönüşüm | `decoder.test.ts` #2-4 |
| 4Q_FP_PF | decoder | Schneider eşlemesi | `decoder.test.ts` (4Q bloğu) |
| RTU loopback (donanım) | `tools/rtu-loopback-check.mjs` | 4/4 PASS | **KAPSANMAYAN** (G4 — koşulmadı) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze test koşusu iletilmedi (72 test envanterde) | Düşük | Ana agent `nx run core:test` koşar |
| G2 | Bayt sırası okuma/yazma tutarsızlığı (S1) testle sabitlenmemiş | Orta — düzeltme paketinde karakterizasyon testi gerekir | İleri İş A1 (ayrı paket) |
| G3 | Backoff matematiği doğrudan test yok (yalnız kod inceleme) | Düşük | Küçük unit test (`2^n`, tavan, jitter ≥0) |
| G4 | RTU donanım loopback koşulmadı | Orta — saha donanım yolu | `bun tools/rtu-loopback-check.mjs` (donanım gerekli) |
| G5 | 16-bit `*_SWAP` yazma yolu decoder matrisinde yok | Orta — S1 ile bağlantılı | A1 paketi kapsamında |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: SPEC↔kod doğrulaması (kaynak değişikliği yok); NIS-2 boşluğu işaretlendi | (yok — SPEC değişmedi) |
