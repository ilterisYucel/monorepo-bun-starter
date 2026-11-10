---
status: active
space: architecture
tags: [mimari, core, canbus, stub, spec]
review_date: 2026-11-10
---

# CANBUS — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `MODBUS-MIMARISI.md` (IDevice kontratı), `DOKUMAN-YAPISI-MIMARISI.md` (K16 istisnası).

## 1. Amaç ve Bağlam

`packages/core/src/canbus` klasörü: CANBus cihaz ailesinin **stub**'ı. `IDevice` sözleşmesini karşılar; tüm metotlar "not implemented" fırlatır. Gerçek implementasyon geldiğinde bu doküman kendi SPEC'ine genişler (İleri İş).

| Katman | Kapsam |
|:-------|:-------|
| dahil | Stub sınıfın sözleşme uyumu ve bilinçli throw davranışı |
| hariç | Gerçek CANBus protokolü, donanım sürücüsü, cihaz config (gerçek implementasyonda) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | CANBus **stub**'dır: `IDevice` uyumlu, tüm metotlar `not implemented` fırlatır | Çalışma zamanında erişilebilir ama daima throw eder; `DeviceFactory` protokol dallanmasında üretilir |
| K2 | Stub durumu kalıcı bir SPEC açmaz; gerçek implementasyon kendi SPEC'ini alır | Bu doküman yalnız "planlanan cihaz ailesi" kaydıdır |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | CANbus "empty stub" olarak kayıtlı; test yok | `AGENTS-INFRA.md` "What's missing" |

## 4. Mimari

```text
DeviceFactory ──(type: canbus)──► CANBusDevice (stub)
                                    └ connect/read/write → throw "not implemented"
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/core/src/canbus/index.ts#CANBusDevice` | Stub (implements `IDevice`) |
| `packages/shared-types/src/device-interface.ts#IDevice` | Cihaz kontratı |

## 5. Purity Kuralları (ZORUNLU)

1. Stub, `IDevice` dışında sözleşme taşımaz; kısmi implementasyon eklenmez (ya stub ya gerçek).
2. Gerçek implementasyon geldiğinde bu doküman genişler; Modbus SPEC'ine karışmaz.
3. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Stub Sözleşme Davranışı

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `connect/read/write` throw davranışı, `IDevice` uyumu
- hariç: gerçek protokol

**Akış:**
1. `DeviceFactory` `canbus` tipini çözer.
2. Stub cihaz üretilir.
3. Herhangi bir metot çağrısı `not implemented` fırlatır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Stub, `IDevice` sözleşmesini eksiksiz uygular | AK-1.1 |
| FR-1.2 | Tüm metotlar `not implemented` fırlatır | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** CANBus cihaz tipi **WHEN** factory üretir **THEN** `IDevice` uyumlu nesne döner
2. **AK-1.2 — GIVEN** stub cihaz **WHEN** `read()` çağrılır **THEN** `not implemented` hatası fırlar

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Arayüz uyumu | kod inceleme | ⬜ |
| AK-1.2 | Bilinçli throw | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-1: Stub sözleşmesini ve plan notunu KAPANIŞ'a işle

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Stub'a bağlanma denemesi | Throw |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/canbus/index.ts` | Stub |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Herhangi metot | `not implemented` |
| Gerçek implementasyon | Yeni SPEC |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Stub durumu kayıtlı ve yanıltıcı değil | gözle |
| SC-2 | Gerçek implementasyon için tetik kaydı mevcut | gözle |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Stub — yeni davranış yok |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1 (kayıt) |
| 4. REVIEW (GLM-5.3) | `CANBUS-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Gerçek CANBus implementasyonu (donanım sürücüsü, config, testler) | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Gerçek CANBus implementasyonu: protokol + `IModbusTransport` benzeri taşıma portu + conformance testleri.

## 12. T Görev Özeti

| T-1 | Stub sözleşmesinin ve plan notunun KAPANIŞ'a işlenmesi |
