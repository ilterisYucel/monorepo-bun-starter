---
status: active
space: architecture
tags: [rapor, modbus, trace, komut, manevra, web-service, device-service, admin]
review_date: 2026-10-08
---

# Modbus Trace — Komut/Manevra Yazımlarının Kaydı (Analiz + Plan Raporu)

> **Amaç:** Admin › Modbus trace'in bugünkü durumunu, komut yürütme akışını, manevra adım
> yazımlarının neden henüz kapsanmadığını ve önerilen çözümü tek yerde toplamak.
> **Durum:** Analiz + plan (uygulama onayı bekliyor). Kod referansları `#sembol` çapasıyla.

## 1. Bugüne kadar yapılan (İş 1 — doğrudan komutlar)

- `services/web-service/src/presentation/routes/command-routes.ts#makeCommandRoutes` — `POST /commands/execute`
  ve `POST /commands/execute-multi` **başarılı/başarısız** yürütmelerinde çözülen her yazımı
  `command_writes`'a kaydeder.
- `services/web-service/src/infrastructure/persistence/command-write-store.ts#CommandWriteStore` — tablo
  (`ts, device_id, command, label, name, register_address, register_table_type, value, success`) + `GET /commands/writes`.
- Kayıt **fire-and-forget** (`void recordWrites(...)`) → endpoint yanıtı gecikmez (canlı: `http=200 time=0.17s`).
- Frontend: `apps/demo-field/src/features/demo-data/demoApi.ts#listCommandWrites` +
  `packages/ui/src/nova/demo-admin-live.ts#commandWriteTraceRows` → Admin trace'in birincil kaynağı
  (adresler **decimal**); `commandTraceRows` yedeği korunur.

**Kapsam:** yalnızca HTTP `/commands/execute(-multi)` ile gönderilen **doğrudan** komutlar.

## 2. Komut yürütme akışı (mevcut mimari)

```
İstemci
  └─ POST /api/commands/execute            (web-service)
       ├─ CommandJobBuilder.build(deviceId, command, params)   # komut → telemetri yazımları
       │     ({{powerKw}} / {{divideTotal}} ÇÖZÜMLENİR; name + değer)
       ├─ mq.executeAndWait(job)            (BullMQ / Redis)   # COMMAND_DEVICE job'ı
       └─ dönen sonuç → yanıt

  device-service (ayrı servis, worker)
       └─ COMMAND_DEVICE job'ı tüketir → GERÇEK Modbus yazımı (simülatör/TCP) → sonucu döner

Kayıt noktası (bugün): command-routes — job'ı kuran ve adresi (config'ten) bilen katman.
```

**Önemli:** Manuel/operasyon yürütmesi bu HTTP ucundan **geçmez**:

```
POST /api/maneuvers/:name/execute | /api/operations/:name/execute   (web-service)
  └─ OperationExecutor.run(...)                    packages/platform/commands#OperationExecutor
       └─ ICommandChannel.execute(ResolvedCommandStep)
            └─ services/web-service/src/infrastructure/commands/command-channel.ts#CommandChannel
                 ├─ CommandJobBuilder.build(deviceId, command, params)   # çözümleme burada
                 └─ mq.executeAndWait(job) → device-service (yukarıdaki aynı hat)
```

Yani **komut** ile **manevra** aynı alt hattı (CommandJobBuilder → BullMQ → device-service) kullanır,
ama manevra `command-routes`'u değil `CommandChannel`'ı kullanır. İş 1 kaydı bu yüzden manevra
adımlarını kapsamaz.

## 3. Neden manevra adımları şu an trace'te yok

- Kayıt `command-routes`'ta; manevra yürütmesi `CommandChannel`'dan geçiyor → iki ayrı kod yolu.
- Manevra/operasyon adımları `{{divideTotal}}` gibi şablonları `OperationExecutor#resolveStep` +
  `CommandChannel` içinde çözümler; web-service job'ı kurarken **name + değeri ve adresi** yine bilir.
- Uzak adımlar (`system: container-1`, örn. BSC) **konteyner tarafındaki kendi web-service'inden**
  job üretir → bu yazımlar field'daki `command_writes`'a düşmez (kapsam dışı, bkz. §5).

## 4. Önerilen çözüm (revize plan)

1. **`CommandWriteRecorder`** (web-service infrastructure): `DeviceConfigFileSource` ile
   `name → registerAddress/registerTableType` çözümü + `CommandWriteStore.record(...)` **fire-and-forget**
   (hata yutulur). `command-routes#recordWrites` mantığı buraya taşınır → tek kod yolu.
2. **`CommandChannel`**'a opsiyonel `recorder` enjekte edilir; `execute()` sonucunda (isimli komut **ve**
   ham `telemetries` yolu) `void recorder.record({ deviceId, command, telemetries, success })` çağrılır.
   `schedule()` (zamanlı stop planlama) kapsam dışı — planlama yazım değildir.
   → **Manevra + operasyon + rollback + ham zincir** yerel adımlarının tamamı tek noktadan yakalanır;
   `packages/platform/commands` **değişmez**.
3. **Kablolama:** `container.ts`'te `commandWrites` (store) + recorder singleton; `CommandChannel` recorder
   ile kurulur. `server.ts`/`index.ts` → `makeCommandRoutes` da aynı store/recorder'ı kullanır.
4. **Testler:** `command-channel.test.ts` (başarılı adım → recorder çağrılır; başarısız → `success=false`;
   ham yol da kaydedilir), `CommandWriteRecorder` birim testi (adres çözümü + etiket), `command-routes.test.ts`
   recorder'a uyarlanır.
5. **Canlı doğrulama:** `charge` çalıştır → `GET /api/commands/writes`'te **PCS-1 + PCS-2** satırları
   (setpoint + charge komutları, gerçek adres/değer); **BSC satırı YOK** (uzak adım).
6. **Regresyon:** `web-service` + `platform-commands` + `ui` testleri, build; `field-web-service` rebuild;
   e2e 14/14; KAPANIŞ A.4#13 kapsam notu güncellenir; branch push.

## 5. Kapsam dışı ve ileri iş

| # | Konu | Durum / plan |
|:--|:------|:-------------|
| İ1 | **Konteyner-tier yazımlar** (BSC/HVAC/CB…) | Kapsam dışı. Konteyner web-service'i aynı `CommandWriteRecorder` ile kaydedebilir (konteyner DB'sine) → field Admin'in görmesi için tünelden okuma ucu gerekir. Ayrı iş. |
| İ2 | **Uzak adımların trace'te görünmesi** | Operasyon uzak adımı (`system`) yerel tabloya girmez; ileride İ1 ile birleştirilir. |
| İ3 | **Gerçek yazılan register değeri vs komut değeri** | Trace, komutun **istediği** değeri gösterir (web-service çözümü). Device-service'in scale/offset sonrası register'a yazdığı nihai değer farklı olabilir; istenirse device-service audit'i (`logCommand`) zenginleştirilip ikinci kaynak olarak eklenebilir. |
| İ4 | **Retention/limit** | `command_writes` sınırsız büyür; `GET /commands/writes` 500 cap'li. İleride periyodik temizlik/politika. |
| İ5 | **X3/X4 (tünel config / gerçek cihaz listesi)** | Admin Devices sekmesinin gerçek config'ten beslenmesi; `device-query` tünel frame'i + responder. Ayrı iş. |
| İ6 | **X2 (site params)** | `site_settings` + `GET/PUT /api/admin/settings`; erteleme. |

## 6. Açık kararlar (tartışma)

- **A1 — Kayıt katmanı:** web-service (önerilen: config + çözümlenmiş değer elinde, tek nokta) vs
  device-service (gerçek yazımın olduğu yer; konteyner tier'ı da doğal kapsar ama değer/scale farkı +
  iki DB'de dağınık trace). Öneri: **web-service** (bu tur), İ1/İ3 ileride.
- **A2 — Trace anlamı:** "gönderilen komut" mu (mevcut) yoksa "register'a yazılan nihai değer" mi
  gösterilsin? Öneri: komut (referansla aynı), nihai değer İ3'te opsiyonel.
- **A3 — Uzak adımların gösterimi:** şimdilik yok sayılsın mı, yoksa trace'te "remote (container)" olarak
  işaretlenip adressiz mi gösterilsin? Öneri: şimdilik yok say (kapsam net).

## 7. Riskler

- **Düşük:** `CommandChannel`'a enjekte edilen opsiyonel recorder tanımsızken davranış birebir (Open-Closed).
- **Düşük:** fire-and-forget kayıt hata yutar → trace eksik kalabilir ama komut akışı asla bozulmaz.
- **Orta (İ1):** konteyner yazımları kapsanmadıkça trace "tam" değildir — kullanıcıya kapsam notu gösterilir
  (Admin trace başlığında mevcut).

## 8. Özet

Komut ve manevra **aynı alt hattı** (CommandJobBuilder → BullMQ → device-service) kullanır; fark, komutun
`command-routes`'tan, manevranın `CommandChannel`'dan geçmesidir. Kaydı `CommandChannel`'a (paylaşılan
`CommandWriteRecorder` ile) taşıyınca manevra/operasyon/rollback yerel adımları da `command_writes`'a
düşer; `platform/commands` değişmez. Konteyner-tier yazımlar kapsam dışıdır (İ1).
