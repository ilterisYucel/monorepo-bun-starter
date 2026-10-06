# Grafana-Style Telemetri Dönüşümü — Aşamalı Plan

> **Karar tarihi:** 2026-10-05 · **Durum:** Taslak — developer incelemesi bekliyor (uygulama ayrı onayla).
> **Amaç:** Panel tarzı bileşenler (TelemetryChart, SingleTelemetryChart, DeviceGauges, cihaz kartları) tek soket + panel-spec modeliyle beslensin; veri akışı Grafana akıcılığına yaklaşsın; backend jenerik ve sabit kalsın.
> **Bağlam:** Tamamlanan ilk dilim `docs/architecture/TELEMETRI-PANEL-WS-RAPOR.md`'de (WS `names` filtresi). Bu plan kalan sütunları sıralar.

## 1. Bugünkü durum (baseline)

| Katman | Durum |
|:-------|:------|
| Tek WS soketi + multipleks (tek tünel stream) | ✅ |
| Panel başına abonelik (`deviceId` + `names`) | ✅ |
| Sunucu tarafı socket başına isim filtresi + sınırlı `initial` | ✅ |
| İstemci hook filtreleme + buffer budama | ✅ |
| REST `/telemetry/latest` `limit` + `DeviceRegistry` refresh TTL | ✅ |
| Kompakt frame, spec-driven provider, scheduler, diff-push, decimation | ❌ |

**Grafana skor kartı:** 5 sütundan **1'i tam** (backend filtre), 1'i kısmi (panel spec), 3'ü yok.

## 2. Maliyet özeti (tahmini)

| Adım | İş maliyeti | Kazanç | Risk |
|:-----|:-----------|:-------|:-----|
| P1 Kompakt frame | Küçük | Orta-yüksek (metadata tekrarı sıfır) | Düşük (opt-in bayrak) |
| P2 Spec-driven `useTelemetryProvider` + panel bağlama | Orta-büyük | Yüksek (asıl panel modeli) | Orta (mevcut sayfa hook'ları) |
| P3 Diff-push (yalnız değişen) | Orta | Yüksek (akıcılık) | Orta (sunucu state) |
| P4 Query scheduler + sonuç cache | Orta | Orta-yüksek (REST dedup) | Düşük-orta |
| P5 Chart decimation + global zaman aralığı | Orta | Yüksek (görsel akıcılık) | Düşük |
| P6 Çok-kullanıcı kotası | Küçük-orta | Güvenlik (EMS: rol başına oturum) | Düşük |

**Önerilen sıra:** P1 → P2 → P3 → P4 → P5 → P6. (P1+P2 "panel modeli"ni kurar; P3 akıcılığı bitirir.)

## 3. Aşamalar

### P1 — Kompakt frame (`{d,n,v,t}`)
- **Amaç:** WS satırlarından sabit metadata (`description/unit/tags/byteOrder`) çıkarılsın; meta `telemetry-config`'ten bir kez gelsin.
- **Kapsam:** `realtime-manager#broadcast` (format bayrağı), `ws-routes` subscribe `format:"compact"`, `WebSocketTransport` subscribe `format`, `useTelemetryStream` compact çözümü.
- **Maliyet/Kazanç:** küçük / satır ~300 B → ~40 B.
- **Risk:** Düşük — `format` opsiyonel, varsayılan eski biçim.
- **Kabul:** kompakt abone yalnız `{d,n,v,t}` alır; eski abone değişmez; testler.

### P2 — Spec-driven provider + panel bağlama
- **Amaç:** Paneller fetch mantığı taşımaz; `{deviceIds, names, range?}` spec bildirir; `TelemetryProvider` arayüzü tek resolver'la beslenir.
- **Kapsam:** `useTelemetryProvider` spec-driven; `TelemetryChart`/`SingleTelemetryChart`/`DeviceGauges`/cihaz kartları spec alır; `useDashboardData`/`useHvacData` bu modele taşınır.
- **Maliyet/Kazanç:** orta-büyük / asıl "Grafana panel" esnekliği.
- **Risk:** Orta — mevcut sayfa davranışını korumak; `keepPreviousData` + skeleton korunmalı.
- **Kabul:** yeni bileşen = spec + sunum; sayfa hook'ları geriler; regresyon yeşil.

### P3 — Diff-push (yalnız değişen satırlar)
- **Amaç:** Sunucu (deviceId,name) başına son değeri tutar; batch'te yalnız değişenler yollanır.
- **Kapsam:** `realtime-manager` (last-value map + changed filter), `initial` = tam snapshot.
- **Maliyet/Kazanç:** orta / BSC saniyede ~960 → birkaç satır.
- **Risk:** Orta — state yönetimi + reconnect'te `initial` ile senkron.
- **Kabul:** değişmeyen tick'te satır gitmez; yeni abone `initial` ile tam değeri alır.

### P4 — Query scheduler + sonuç cache
- **Amaç:** Global refresh + (opsiyonel) zaman aralığı; aynı `(deviceIds,names)` sorgusu tek DB sorgusuna düşer.
- **Kapsam:** `/unified/telemetry/latest` sonuç cache (TTL), `useDeviceTelemetry` global refresh context'i.
- **Maliyet/Kazanç:** orta / REST tarafı N panel → 1 sorgu.
- **Risk:** Düşük-orta — TTL bayatlığı; invalidation.
- **Kabul:** aynı spec'li paneller tek sorgu; cache TTL testi.

### P5 — Chart decimation + global zaman aralığı
- **Amaç:** Seri panelleri global zaman aralığı + LTTB/sunucu downsample ile sınırlı nokta çizer.
- **Kapsam:** `/telemetry/downsampled` doğrulama, chart tarafı decimation, global range context.
- **Maliyet/Kazanç:** orta / geniş aralıkta akıcı çizim.
- **Risk:** Düşük.
- **Kabul:** 1g/1h aralığında sabit nokta sayısı; render süresi eşiği.

### P6 — Çok-kullanıcı kotası
- **Amaç:** Rol başına eşzamanlı oturum sınırı (boss:1, container:1, field:1); üzeri red + `security` audit.
- **Kapsam:** hub/konteyner oturum katmanı, rate limiting.
- **Maliyet/Kazanç:** küçük-orta / EMS tek-kullanıcı varsayımını garanti altına alır.
- **Risk:** Düşük.
- **Kabul:** ikinci eşzamanlı oturum 429/503 + audit; ilk oturum etkilenmez.

## 4. Bağımlılık ve geri alma

- **Bağımlılık:** P2, P1'e dayanır (kompakt satır provider'da çözülür). P3, P2'den bağımsız uygulanabilir. P5, P4'ün zaman aralığı context'ini kullanır.
- **Geri alma:** Her aşama ayrı lokal commit; geri alma adımları aşama PR'ında + `TELEMETRI-PANEL-WS-RAPOR.md` formatında yazılır.
- **Kapsam dışı (sabit karar):** panel-başına ayrı WS soketi YOK; `ws-tunnel` 16-stream limitine dokunulmaz.

## 5. Genel kabul kriterleri (dönüşüm sonu)

1. Yeni panel = `{deviceIds, names}` spec + sunum bileşeni; fetch mantığı panelde yok.
2. BSC paneli için hat yükü < ~5 KB/sn (kompakt+diff sonrası).
3. Panel verisi değişmedikçe gereksiz render yok.
4. Aynı spec'li REST sorguları tek DB sorgusu.
5. `ws-tunnel` değişmez; tünelde panel başına ek stream yok.
