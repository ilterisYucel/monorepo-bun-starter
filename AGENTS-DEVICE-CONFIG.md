---
status: active
space: agents
tags: [agents, referans, telemetry, canonical, device-config]
review_date: 2026-12-01
---

# AGENTS Detay Referansı — Device Config (Telemetry / Canonical)

> Bu doküman `AGENTS.md`'den taşınan **referans** içeriktir; her oturumda yüklenmez.
> Cihaz config'ine telemetri/tag veya `canonical` alanı ekleyeceksen oku.
> Kapsam yalnız telemetry tagging + canonical metrics'tir.

## Telemetry tagging & canonical metrics (MANDATORY)

- **Config'lerde `device_id`/`container_id`/`field_id` tag'i yazmak YASAKTIR** — bu tag'lerin tek sahibi device-service `TelemetryTagger`'dır (`services/device-service/src/telemetry-tagger.ts`). Config yalnızca kendi alanına ait tag'leri (`rack_id`, `aggregation` vb.) taşır.
- **Canonical metric attr:** Config telemetry/bitfield girişine opsiyonel `"canonical"` alanı verilebilir (**serbest string** — örn: `soc`, `soh`, `voltage`, `battery_ready`). Değer, cihaz servisi tarafından `tags.canonical` olarak taşınır. **Konvansiyon:** canonical değeri = UI alan adı; frontend generic eşleme yapar (`if (canonical in target) target[canonical] = value` — tek istisnalar `battery_ready`→bool status ve `charge_power`/`discharge_power`→işaretli `power_kw`). Canonical verilmezse davranış değişmez (name ile gösterim). Enum/sabit liste YOKTUR — yeni canonical isim kullanmak için kod değişmez.
- **TODO:** `canonical` ileride tags yerine ayrı bir `TelemetryData` alanına taşınacak (DB kolonu + adapter eşleme + frontend kontratı ile birlikte).

## Device config kaynağı — source of truth (MANDATORY)

- **Yeni cihaz config'i ÖNCE kök `configs/`'e eklenir.** Kök `configs/` cihaz config'lerinin **source of truth**'udur; dosya adı cihazın **gerçek alet adıdır** (örn. `flex-bsc.json` = LG Flex BSC, `wattox-pcs.json` = Wattox MPCS). Register listesi, bitfield, alarm kuralları ve `canonical` alanları burada sabitlenir. Tip başına **tek örnek** tutulur (aynı tipin N instance'ı kökte değil, projede yaşar).
- **Projede kullanılırken buradan `deployment/<site>/<tier>/device-configs/`'e kopyalanır.** Projede yalnız **projeye özgü değişkenler** değiştirilir: `connection.host`, `connection.port`, `slaveId`, instance `deviceId`/`name` ve gerekirse `transport` (simülatör/gerçek). **Register listesi, bitfield, alarm ve canonical projeye göre DEĞİŞMEZ.**
- **Testler kök `configs/` (source of truth) üzerinden koşar.** Servis testleri `deployment/.../device-configs/` gibi proje bazlı yollara bağlanmaz; config'ler **dosya adına değil `deviceId`/içeriğe göre** çözülür (yeni cihaz eklenince test kırılmaz).
- Deployment dizinlerindeki instance dosya adları (`bsc-1.json`, `hvac-3.json` …) proje katmanına aittir; kök kanonik adları taşımaz.
