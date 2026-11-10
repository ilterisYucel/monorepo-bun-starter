---
status: active
space: architecture
tags: [mimari, ws-tunnel, hub-servis, dogrulama, parity, e2e, v2, spec]
review_date: 2026-10-16
---

# ws-tunnel P4 Doğrulama (Aşamalı Parity + v2 Test) — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** 🟡 GELİŞTİRMEDE — KAPANIŞ yazıldı; UC-1/UC-2 tam, UC-3 kısmi (domain-flow + SPA render açık).
> **KAPANIŞ:** [WS-TUNNEL-P4-DOGRULAMA-KAPANIS.md](./WS-TUNNEL-P4-DOGRULAMA-KAPANIS.md)
> **İlişkili:** [WS-TUNNEL-HUB-SERVIS-MIMARISI.md](./WS-TUNNEL-HUB-SERVIS-MIMARISI.md), [WS-TUNNEL-HUB-CONSUMER-P3-MIMARISI.md](./WS-TUNNEL-HUB-CONSUMER-P3-MIMARISI.md), [WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md](./WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md), [AGENTS-DEPLOYMENT.md](../../AGENTS-DEPLOYMENT.md)

## 1. Amaç ve Bağlam

Hub-servis (P2) + consumer entegrasyonu (P3) tamam; P3'ün doğrulamaları (parity e2e, gerçek v2 stack, nginx alias) açık. P4, **aşamalı doğrulama** ile bunları kapatır ve hub imajının gerçek kullanımını kanıtlar: (1) loopback, (2) iki mini web uygulaması (domainsiz REST+WS), (3) tam v2 dev-stack parity. RevPi (Aşama 4) kapsam dışıdır (§10 A1).

**Kısıt:** P4 yeni protokol/ürün kodu getirmez; doğrulama + test + deployment config işidir. v1/v2 wire değişmez.

### Kapsam

| Katman | Bu SPEC'te |
|:-------|:-----------|
| Loopback demo + mini uygulamalar (docker'sız) | ✅ dahil |
| Compose parity (hub imajı + sahte v2 peer) | ✅ dahil |
| Gerçek v2 dev-stack parity + SPA/API/WS | ✅ dahil |
| nginx hub alias (yalnız v2 stack) | ✅ dahil |
| Gerçek RevPi (Aşama 4) | ❌ hariç — §10 A1 |
| Host-based erişim (A4), İP-4 paketleme | ❌ hariç |

## 2. Kararlar (kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Aşamalı sıra | Loopback → mini uygulamalar → compose parity → gerçek v2 stack |
| K2 | Docker yalnız 3. aşamada | Loopback/mini uygulamalar bun process (docker'sız) |
| K3 | Parity testleri `e2e/` katmanında | Hub'a HTTP/WS tüketici; hub koduna import YOK |
| K4 | nginx alias yalnız v2 stack (`deployment/v2/**`) | v2'de boss/superadmin yok: container-web + demo-field |
| K5 | Gerçek RevPi kapsam dışı | Gözle test, kontrollü; 1-3 geçince ayrıca planlanır |
| K6 | v1/v2 wire değişmez | Yeni protokol yok; mevcut frame'lerle parity |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Hub'a özel gözle koşulan demo scripti yok | `tools/` (peer-service/tunnel var; hub-demo yok) |
| B2 | Hub-servis `examples/` yok | `packages/ws-tunnel-hub/` (examples yok) |
| B3 | v2 compose'larında hub-servis servisi yok | `deployment/v2/dev/container/docker-compose.yml`, `deployment/v2/dev/field/docker-compose.yml` |
| B4 | v2 nginx hâlâ web-service'e proxy'liyor | `deployment/v2/aws/field/nginx/aws-demo-field.conf` (`location /containers/`) |
| B5 | P3 parity/gerçek-stack doğrulaması yok | `WS-TUNNEL-HUB-CONSUMER-P3-KAPANIS.md` §B.2 (G1-G4) |

## 4. Mimari

### 4.1 Aşamalı akış

```
UC-1 Loopback (docker'sız)      UC-2 Mini uygulamalar (docker'sız)
  hub process-içi + sahte peer    device-app (REST+WS) + consumer-app
        └───────────┬───────────────────────┘
                    ▼
UC-3a Compose parity (hub imajı + sahte v2 peer konteyneri)
   komut · telemetri · event · WS wire parity
                    ▼
UC-3b Gerçek v2 dev stack (container tier + container-web + demo-field)
   SPA asset/API/WS hub üzerinden · rollback tatbikatı
                    ▼
UC-3c nginx hub alias (deployment/v2/**)
```

### 4.2 Test katmanları

| Katman | Araç | Docker |
|:-------|:-----|:------|
| Loopback | `bun tools/hub-demo.mjs` | Hayır |
| Mini uygulamalar | `bun hub-servis/examples/run-demo.mjs` | Hayır |
| Parity (3a/3b) | `e2e/` spec | Evet |

## 5. Purity Kuralları

1. Hub-servis monorepo import ETMEZ; parity testleri hub'a HTTP/WS tüketicidir, kod import etmez.
2. P4 yeni protokol/ürün kodu eklemez; yalnız demo/test scripti + deployment config.
3. Sırlar demo'da env ile gelir; düz metin repoda tutulmaz.
4. v1/v2 wire şekilleri değişmez.
5. Mini uygulamalar domain-free: saf REST + WS; auth yalnız hub consumer token.

## 6. Use Case'ler

### 6.1 UC-1 — Loopback doğrulama (`tools/hub-demo.mjs`)

**Status:** 🟡 Geliştirmede (2026-10-16)

**Kapsam:**
- dahil: process-içi hub (sqlite) + sahte device peer + consumer; adım PASS/FAIL.
- hariç: docker; mini uygulamalar (UC-2); v2 stack (UC-3).

**Akış:**
1. Hub process-içi kurulur (bootstrap modu).
2. Bootstrap → claim → register (`/ws/peer`).
3. Keşif → oturum+cookie → opak REST → WS köprü → control + consumer relay.
4. Başarısızlık exit≠0.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Demo hub'ı process-içi kurup gerçek peer/consumer akışını koşturmalı | AK-1.1 |
| FR-1.2 | Kontroller: register, keşif, oturum+cookie, opak REST, WS köprü, control + consumer relay | AK-1.2 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** `bun tools/hub-demo.mjs` **WHEN** koşulur **THEN** tüm adımlar PASS, exit 0.
2. **AK-1.2 — GIVEN** sahte peer kayıtlı **WHEN** REST+WS+relay denenir **THEN** yanıtlar tünelden akar, `{peerId,message}` consumer'a ulaşır.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Loopback demo PASS | gözle | ⬜ |
| AK-1.2 | Akışlar uçtan uca | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `tools/hub-demo.mjs`

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Port çakışması | boş port (0) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `tools/hub-demo.mjs` | YENİ — loopback doğrulama |

### 6.2 UC-2 — İki mini uygulama (domainsiz REST + WS)

**Status:** 🟡 Geliştirmede (2026-10-16)

**Kapsam:**
- dahil: `device-app` (REST+WS upstream), `consumer-app` (opak REST+WS), koşucu.
- hariç: docker; SPA/login; v2 stack.

**Akış:**
1. Hub + device-app peer agent + consumer-app başlar.
2. consumer-app REST'i opak çağırır; WS gidiş-dönüş doğrular.
3. Hata yolları: offline peer → 503, bilinmeyen servis → 404.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | `device-app` saf REST (`/api/status`, `/api/actions/reboot`) + WS echo sunmalı; peer `local-admin` duyurmalı | AK-2.1 |
| FR-2.2 | `consumer-app` REST'i opak çağırmalı + WS doğrulamalı; offline→503, bilinmeyen servis→404 | AK-2.2 |
| FR-2.3 | Koşucu hub + A + B'yi tek komutta başlatıp PASS/FAIL dönmeli | AK-2.3 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** device-app ayağa kalktı **WHEN** peer register olur **THEN** `/peers` `local-admin` servisini gösterir.
2. **AK-2.2 — GIVEN** bağlı peer **WHEN** consumer REST/WS çağırır **THEN** yanıt tünelden akar; peer kapanınca 503, bilinmeyen servis 404.
3. **AK-2.3 — GIVEN** `run-demo.mjs` **WHEN** koşulur **THEN** tüm kontroller PASS.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Device REST+WS sunar | gözle | ⬜ |
| AK-2.2 | Opak REST+WS + hata yolları | gözle | ⬜ |
| AK-2.3 | Koşucu PASS | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-2: `examples/device-app.mjs`
- [ ] T-3: `examples/consumer-app.mjs`
- [ ] T-4: `examples/run-demo.mjs`

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Peer offline | 503 |
| Bilinmeyen servis | 404 |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ws-tunnel-hub/examples/device-app.mjs` | YENİ |
| `packages/ws-tunnel-hub/examples/consumer-app.mjs` | YENİ |
| `packages/ws-tunnel-hub/examples/run-demo.mjs` | YENİ |

### 6.3 UC-3 — Tam v2 dev-stack parity

**Status:** 🟡 Geliştirmede (2026-10-16)

**Kapsam:**
- dahil: (3a) hub imajı + sahte v2 peer compose parity (komut/telemetri/event/WS); (3b) gerçek v2 dev stack SPA/API/WS; (3c) v2 nginx hub alias.
- hariç: gerçek RevPi; A4 subdomain.

**Akış:**
1. 3a: compose hub imajı + sahte v2 peer; `e2e/` spec komut (execute-multi access + manevra), telemetri (push→relay→store), event (relay→collector) doğrular.
2. 3b: v2 dev compose (container+field+hub); container-web SPA asset/API/WS hub üzerinden akar; rollback tatbikatı.
3. 3c: v2 nginx config'lerine hub alias blokları.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Sahte v2 peer compose parity: komut/telemetri/event + WS wire, hub imajıyla | AK-3.1 |
| FR-3.2 | Gerçek v2 stack: container-web SPA asset/API/WS hub üzerinden çalışmalı; rollback veri kaybısız | AK-3.2 |
| FR-3.3 | v2 nginx config'leri hub alias içermeli (SPA base değişmez) | AK-3.3 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** sahte v2 peer hub'a bağlı **WHEN** parity koşulur **THEN** komut/telemetri/event akar.
2. **AK-3.2 — GIVEN** v2 dev stack **WHEN** SPA+API+WS denenir **THEN** hub üzerinden çalışır; rollback veri kaybısız.
3. **AK-3.3 — GIVEN** v2 nginx **WHEN** hub alias uygulanır **THEN** `/containers/<cid>/ui/*` hub peer/servis yoluna yönlenir.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Wire+komut/telemetri/event parity | e2e | ⬜ |
| AK-3.2 | v2 SPA/API/WS + rollback | e2e/gözle | ⬜ |
| AK-3.3 | nginx alias | gözle/kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-5: Compose parity (hub imajı + sahte v2 peer) — `deployment/v2/**` servis + `e2e/` spec
- [ ] T-6: Gerçek v2 dev-stack parity e2e (SPA/API/WS) + rollback tatbikatı
- [ ] T-7: v2 nginx hub alias (`deployment/v2/**`)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Hub imajı eski | health fail → deploy durur |
| Peer offline | 503 |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/v2/dev/container/docker-compose.yml` | hub-servis servisi |
| `deployment/v2/dev/field/docker-compose.yml` | hub-servis servisi |
| `deployment/v2/aws/field/nginx/aws-demo-field.conf` | hub alias |
| `deployment/v2/dev/container/container-web-static.conf` | hub alias |
| `e2e/hub-parity.spec.ts` | YENİ — parity e2e |

### 6.4 Paket Geneli Görevler

- [ ] T-8: `AGENTS-DEPLOYMENT.md` P4 doğrulama/menzil notu + P3 SPEC durumu 🟢'ye

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Loopback/mini demo başarısız | exit≠0, hangi adım raporlanır |
| Hub imajı erişilemez | parity önce health bekler, sonra fail |
| Peer offline | 503 (parity beklentisi) |
| Rollback | uç nokta geri alınır; veri kaybı yok |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Loopback + mini uygulamalar docker'sız PASS | `bun tools/hub-demo.mjs`, `run-demo.mjs` |
| SC-2 | Hub imajı ile komut/telemetri/event parity | `e2e/` parity spec |
| SC-3 | v2 SPA/API/WS hub üzerinden çalışır + rollback | e2e + gözle |
| SC-4 | Mevcut test setleri yeşil korunur | tüm suite'ler |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman (✅ Approved 2026-10-16) |
| 2. JSDoc | Demo/test script sözleşmeleri |
| 3. TEST | T-1..T-7 (demo'lar + e2e) |
| 4. IMPL | Uygulama + deployment config |
| 5. KAPANIŞ | `WS-TUNNEL-P4-DOGRULAMA-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Gerçek RevPi cihaz testi (Aşama 4) | 🟡 Geliştirmede — ajan+viewer hazır; RevPi gözleminde |
| A2 | Host-based erişim (A4) | 🟡 Geliştirmede — tetik gerçekleşti (RevPi dashboard kök-mutlak asset); port-tabanlı kök-montaj varyantı uygulandı (subdomain/DNS ikinci varyant) |
| A3 | nginx alias diğer tier'lar (v1/prod) | v2 doğrulaması sonrası |
| A4 | İP-4 paketleme/ayrı repo | Ayrı iş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Aşama 4 — gerçek RevPi saha testi (A1).
2. A4 — subdomain/host-based erişim (ikinci varyant: wildcard DNS + HTTPS).
3. İP-4 — isim/marka, LICENSE, npm+imaj publish, ayrı repo.

## 12. T Görev Özeti

| Kod | Görev | UC | Dosya |
|:----|:------|:---|:------|
| T-1 | Loopback doğrulama scripti | UC-1 | `tools/hub-demo.mjs` |
| T-2 | Sahte device uygulaması (REST+WS) | UC-2 | `packages/ws-tunnel-hub/examples/device-app.mjs` |
| T-3 | Consumer uygulaması (opak REST+WS) | UC-2 | `packages/ws-tunnel-hub/examples/consumer-app.mjs` |
| T-4 | Mini uygulama koşucusu | UC-2 | `packages/ws-tunnel-hub/examples/run-demo.mjs` |
| T-5 | Compose parity (hub imajı + sahte v2 peer) | UC-3 | `deployment/v2/dev/container/docker-compose.yml`, `deployment/v2/dev/field/docker-compose.yml`, `e2e/hub-parity.spec.ts` |
| T-6 | Gerçek v2 dev-stack parity + rollback | UC-3 | `e2e/hub-parity.spec.ts` |
| T-7 | v2 nginx hub alias | UC-3 | `deployment/v2/aws/field/nginx/aws-demo-field.conf`, `deployment/v2/dev/container/container-web-static.conf` |
| T-8 | Deployment/doğrulama notu + P3 SPEC durumu | Genel | `AGENTS-DEPLOYMENT.md`, `WS-TUNNEL-HUB-CONSUMER-P3-MIMARISI.md` |

**review_date:** 2026-10-16 — ilk sürüm; ✅ onaylandı, geliştirme sürüyor.
