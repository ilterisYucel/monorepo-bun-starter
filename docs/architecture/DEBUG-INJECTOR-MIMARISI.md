# DEBUG-INJECTOR — Mimarisi (SPEC)

**Status:** ✅ Approved · **Sürüm:** 1.0 · **Tarih:** 2026-10-12
**Kapsam dosyası:** `services/device-service/src/debug-injector.ts`

> Kanonik format: `docs/architecture/SPEC-SABLONU.md`. Onay: v2/dev denetim test
> paketi planının developer onayı ("Go") ile birlikte verildi.

## 1. Amaç ve Bağlam

Vendor denetim raporu (`Düzeltmeler.pdf`) bulgularının **entegrasyon/e2e**
seviyesinde doğrulanabilmesi için, saha simülatörlerine arıza/durum enjekte
edilmesi gerekir (örn. IMD izolasyon arızası → FL-11, kapı açık → FL-07).
Simülatörler zaten tip-güvenli enjeksiyon metotları taşır (`setFault`,
`setDoorState`, `setMeasurements`), ancak bunlar yalnızca in-process çağrılabilir.

**DebugInjector**, device-service içinde çalışan, **yalnızca dev/debug** akışında
açılan küçük bir HTTP ucudur; `SimulatorHost` üzerinden çalışan simülatöre senaryo
enjekte eder. Prod'da hiç başlatılmaz.

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Gerekçe |
|:----|:------|:--------|
| K-1 | Enjeksiyon **HTTP ucu** olarak device-service içinde (ek süreç değil). | Simülatörlere `SimulatorHost` içinden erişim; ek kaynak yok. |
| K-2 | **Yalnızca dev**: `NODE_ENV != "production"` **ve** `DEBUG_INJECT_ENABLED=true`. | Prod saldırı yüzeyi açılmaz. |
| K-3 | Simülatör yüzeyi: `SelfHostedSimulator.inject?(scenario): boolean` + `SimulatorHost.inject(deviceId, scenario)`. | Polimorfik; `instanceof`/tip denetimi yok (Elegant #4). |
| K-4 | Senaryo sözlüğü simülatör-bazlı; bilinmeyen senaryo `false` → HTTP 404. | Sessiz yutma yok. |
| K-5 | Dev host'tan erişilebilirlik: `SIMULATOR_BIND_HOST=0.0.0.0` + loopback port yayını. | Konteyner içi `127.0.0.1` host'tan erişilemez. |

## 3. Mevcut Durum / Kök Nedenler

- Simülatör enjeksiyon metotları in-process'ti; stack seviyesinde test edilemiyordu.
- Kural motoru (43 kural) stack'te no-op'tu → koruma zinciri test edilemiyordu.

## 4. Mimari

```
Test (page.request / fetch) ──POST /inject {deviceId, scenario}──► DebugInjector
                                                                    │ (InjectionTarget)
                                                                    ▼
                                              SimulatorHost.inject(deviceId, scenario)
                                                                    │
                                                                    ▼
                                     SelfHostedSimulator.inject(scenario)  (opsiyonel)
```

- `DebugInjector(target: InjectionTarget, config, log)` — tek birincil ctor.
- `InjectionTarget` arayüzü — `SimulatorHost` bu sözleşmeyi karşılar.
- Uçlar: `GET /health` → 200 `{ok:true}`; `POST /inject` → 200/404/400.
- Gövde limiti 16 KiB; bozuk JSON → 400.

## 5. Purity Kuralları (ZORUNLU)

- Statik metot yok; `DebugInjector` örnek nesnesi.
- `null` dönmez; başarı `boolean`/HTTP durumu.
- Alanlar `private readonly`; durum `server` yaşam döngüsüyle sınırlı.
- `instanceof`/`typeof` ile davranış seçimi yok; `inject` opsiyonel metot üzerinden
  polimorfik çağrı (`ELEGANT-EXCEPTION`: opsiyonel yetenek).
- Command/query ayrımı: `start()`/`stop()` komut; `port()` sorgu.

## 6. Use Case'ler

### 6.1 UC-1 — Senaryo enjeksiyonu

**Status:** 🟢 Doğrulanmış · ✅ Approved

**Kapsam:**
- dahil: bilinen senaryoyu simülatöre uygulamak; sağlık ucu.
- hariç: prod'da çalışma; kimlik doğrulama (yalnız loopback/dev).

**Akış:**
1. Test `POST /inject {deviceId, scenario}` gönderir.
2. `DebugInjector` gövdeyi doğrular.
3. `target.inject(deviceId, scenario)` çağrılır.
4. `true` → 200 `{applied:true}`; `false` → 404 `{applied:false}`; geçersiz → 400.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | System MUST `deviceId` ve `scenario` doğrulaması yapmak; eksikse 400 dönmek. | AK-1.1 |
| FR-1.2 | System MUST bilinen senaryoyu uygulayıp 200 dönmek. | AK-1.2 |
| FR-1.3 | System MUST bilinmeyen cihaz/senaryoda 404 dönmek (sessiz yutma yok). | AK-1.3 |
| FR-1.4 | System MUST `GET /health` ile 200 `{ok:true}` dönmek. | AK-1.4 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** çalışan injector **WHEN** gövdede `scenario` yok **THEN** 400.
2. **AK-1.2 — GIVEN** çalışan injector **WHEN** `BSC-1/overheat` **THEN** 200 `{applied:true}`.
3. **AK-1.3 — GIVEN** çalışan injector **WHEN** `BSC-1/yok` **THEN** 404 `{applied:false}`.
4. **AK-1.4 — GIVEN** çalışan injector **WHEN** `GET /health` **THEN** 200 `{ok:true}`.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Eksik gövde 400 döner | unit | ✅ |
| AK-1.2 | Bilinen senaryo 200 + uygulanır | unit + integration | ✅ |
| AK-1.3 | Bilinmeyen senaryo 404 | unit | ✅ |
| AK-1.4 | Sağlık ucu 200 | unit | ✅ |

**T Görev Listesi:**
- [x] T-1: `DebugInjector` + `InjectionTarget` (impl).
- [x] T-2: `SelfHostedSimulator.inject?` + `SimulatorHost.inject` (packages/simulators).
- [x] T-3: Simülatör `inject` metotları (IMD/CPIO/DC-METER/HVAC/BSC/PM5340).
- [x] T-4: `debug-injector.test.ts` + `injection.test.ts`.
- [x] T-5: run.ts wiring + compose env/port.

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| >16 KiB gövde | 400 (reddedilir) |
| Bozuk JSON | 400 |
| Bilinmeyen yol | 404 |
| Port 0 (test) | ephemeral port; `port()` ile okunur |

**Involved Files:**
| Dosya | Rol |
|:------|:----|
| `services/device-service/src/debug-injector.ts` | Yeni modül |
| `services/device-service/run.ts` | Wiring (dev guard) |
| `packages/simulators/src/host.ts` | `inject` yüzeyi |
| `deployment/v2/dev/{container,field}/docker-compose.yml` | Env + port |

## 7. Yaşam Döngüsü ve Hata Kategorileri

- `start()` idempotent; `stop()` idempotent; shutdown'da `stop()`.
- Beklenen hatalar: geçersiz gövde (400), bilinmeyen senaryo (404) — throw yok.
- Beklenmeyen: `listen` hatası → `start()` reject (bootstrap fail-fast).

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Kanıt |
|:----|:-------|:------|
| SC-1 | Prod'da başlamaz (guard). | `run.ts` koşulu |
| SC-2 | Enjeksiyon stack testlerinde fiziksel etki üretir. | FL-07/11/08/02 integration |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Çıktı |
|:------|:------|
| 1 SPEC | bu doküman |
| 2 JSDoc | `debug-injector.ts` başlığı |
| 3 TEST | `debug-injector.test.ts`, `injection.test.ts` |
| 4 IMPL | `debug-injector.ts` + host + simülatörler |
| 5 KAPANIŞ | `<MODUL>-KAPANIS.md` (`@reviewer`) |

## 10. Açık Kararlar

- A-1: Enjeksiyon senaryo sözlüğünün genişletilmesi (PCS E-stop, BSC latch testi) — Faz 5.

## 11. İleri İş (bu pakette YAPILMAZ)

- Kimlik doğrulamalı enjeksiyon (şu an yalnız dev/loopback).

## 12. T Görev Özeti

| Kod | Görev | Durum |
|:----|:------|:------|
| T-1 | `DebugInjector` + `InjectionTarget` (impl) | ✅ |
| T-2 | `SelfHostedSimulator.inject?` + `SimulatorHost.inject` | ✅ |
| T-3 | Simülatör `inject` metotları (IMD/CPIO/DC-METER/HVAC/BSC/PM5340) | ✅ |
| T-4 | `debug-injector.test.ts` + `injection.test.ts` | ✅ |
| T-5 | run.ts wiring + compose env/port | ✅ |
