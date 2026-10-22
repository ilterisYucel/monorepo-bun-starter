---
status: active
space: architecture
tags: [mimari, ws-tunnel, agent, konteyner, deployment, spec]
review_date: 2026-10-22
---

# Konteyner Kaydı Agent Üzerinden — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ Approved (2026-10-22) — uygulandı; doğrulama KAPANIŞ'ta.
> **İlişkili:** [WS-TUNNEL-AGENT-MIMARISI.md](./WS-TUNNEL-AGENT-MIMARISI.md),
> [WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md](./WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md),
> [WEB-SERVICE-TUNNEL-SADELESTIRME-MIMARISI.md](./WEB-SERVICE-TUNNEL-SADELESTIRME-MIMARISI.md),
> [AGENTS-WS-TUNNEL.md](../../AGENTS-WS-TUNNEL.md), [AGENTS-DEPLOYMENT.md](../../AGENTS-DEPLOYMENT.md).

## 1. Amaç ve Bağlam

**Gerçek topoloji (üretim):** Üç ayrı bilgisayar — iki **konteyner** bilgisayarı (lokal ağda,
dışarıya kapalı) ve bir **field** bilgisayarı (internete açık). Field'da hub + field web-service
+ field SPA çalışır. Konteyner uygulamalarına (SPA/iframe ve API client) erişim **tünel
üzerinden** olur; v2 field frontend'i de konteyner API'lerini tünelden çeker.

**Sorun (dev-modu sapması):** Demo stack tek bilgisayarda 3 compose ile çalıştığı için konteyner
web-service'i **kendisi tunnel peer'ı** olarak kurulmuştur (`HUB_PEER_ENABLED=true`,
`TUNNEL_SERVICE_ID=container-api`). Bu, uygulamaya üretimde yeri olmayan tesisat taşır:
peer connector, session server, tunnel client. KALINTI-ARINDIRMA'da bu bileşenler "transport/
oturum" diye korunmuştur; üretim topolojisinde bunların tamamı **ws-tunnel-agent**'ın işidir
(agent tam bir peer'dır: register + akış proxy + oturum imzası).

**Çözüm:** Konteyner kaydı **yalnız agent** ile yapılır (`PEER_TYPE=container`,
`SERVICE_ID=container-api`). Container web-service'ten peer/session-server/tunnel-client
kaldırılır; yalnız **stateless oturum doğrulaması** kalır (agent'ın `HUB_SECRET` ile imzaladığı
`container_session` JWT'si). Demo compose'ları üretim topolojisini aynalar.

**Kapsam tablosu:**

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| `services/web-service` | Container tier peer/session-server/tunnel-client kaldırma; stateless session doğrulama | Field tier (hub/consumer/uplink hattı), iş mantığı |
| `packages/ws-tunnel*` | **0 satır** (K0) | — |
| `deployment/v2/dev/{container,container2}` | Agent servisi + web-service env temizliği | Field compose (değişmez) |
| API sözleşmeleri | — (dış şekiller aynı) | Yeni uç yok |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-10-22)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K0 | **`packages/ws-tunnel*` (tunnel/hub/agent) değişmez — 0 satır.** Agent mevcut yetenekleriyle kullanılır (`PEER_TYPE=container`, `HUB_SECRET`). Eksik çıkarsa iş DURUR; paket değişikliği ayrı SPEC/karar | UC-1, UC-2 |
| K1 | Konteyner kaydı **yalnız agent** ile; web-service natif peer bağlantısı kaldırılır | UC-1 |
| K2 | Oturum: agent `HUB_SECRET` = container `JWT_SECRET` (paylaşılan secret); agent HS256 `container-session` JWT'si üretir; web-service **stateless** doğrular (yerel oturum kaydı YOK) | UC-1 |
| K3 | Container web-service'ten `hubPeerConnector`, `containerSessionServer`, `tunnelClient`, `HUB_PEER_*` config kaldırılır; `ClientSessionStore` (stateful) kullanılmaz | UC-1 |
| K4 | Field tier değişmez (hub + consumer + FIELD_UPLINK/boss hattı); `demo-field-agent` kalır (tünel konuşamayan uygulama duyurusu) | UC-2 |
| K5 | Dış API şekilleri ve v2 app davranışı DEĞİŞMEZ | UC-3 |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Konteyner demo'sunda web-service natif peer olarak bağlanıyor (dev varsayımı) | `deployment/v2/dev/container/docker-compose.yml`, `deployment/v2/dev/container2/docker-compose.yml` (env blokları) |
| B2 | Container tier'da peer/session-server/tunnel-client DI kayıtları var | `config/container.ts#hubPeerConnector`, `#containerSessionServer`, `#tunnelClient` |
| B3 | rbac, `container_session` cookie'sini **stateful** store üzerinden doğruluyor — agent oturumu uygulamada yaşamadığı için bu model üretimde 401 üretir | `presentation/server.ts#sessionRbacOptions`; `presentation/middleware/rbac.ts#createRbacHook`; `packages/ws-tunnel/src/session/client-session-store.ts#ClientSessionStore.authenticate` |
| B4 | Agent üretim için hazır: register + akış proxy + oturum imzası tek süreçte | `packages/ws-tunnel-agent/src/run.ts#startAgent`; `#AgentTokenSigner` |
| B5 | KALINTI-ARINDIRMA bu bileşenleri "transport/oturum" diye korudu; üretim topolojisinde sorumluluk agent'a aittir | `docs/architecture/WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-KAPANIS.md` §A.1 |

## 4. Mimari

### 4.1 Üretim topolojisi

```
KONTEYNER PC (x2, lokal ag)                      FIELD PC (internete acik)
┌─────────────────────────────┐                  ┌──────────────────────────────────┐
│ container-web-service :5001 │                  │ hub-servis :5003                 │
│   (saf HTTP API + SPA)      │                  │ field web-service :5002          │
│ container-agent             │  outbound WS     │   (consumer: /peers/<pid>/... )  │
│   peerType=container ───────┼─────────────────►│ field SPA (nginx, :80/:443)      │
│   service=container-api     │   /ws/peer       │ demo-field-agent (opsiyonel)     │
│   localTarget=:5001         │                  └──────────────────────────────────┘
└─────────────────────────────┘                                ▲
                                                               │ tarayıcı
                                    iframe  /containers/<cid>/ui/*  → hub → agent → SPA
                                    API     /peers/<cid>/services/container-api/* → hub → agent → API
                                    field API → hub access → agent → container API
```

### 4.2 Sorumluluk ayrımı

| Bileşen | Sorumluluk |
|:--------|:-----------|
| Container web-service | HTTP API/SPA sunmak; agent'ın enjekte ettiği `container_session` JWT'sini **stateless** doğrulamak |
| `container-agent` | Hub'a peer kaydı, `container-api` duyurusu, HTTP/WS akış proxy'si, oturum token'ı imzası (`HUB_SECRET`) |
| Hub | Peer registry, opak erişim, oturum gateway'i, allowlist; peer session cookie enjeksiyonu |
| Field web-service | Consumer erişimi (`HubConsumerClient.access`), TTL cache, operasyon/olay HTTP yolu (değişmez) |

### 4.3 Oturum akışı

1. Erişim (tarayıcı cookie'si veya consumer token + `x-tunnel-user-*`) hub'a gelir.
2. Hub, peer (agent) üzerinde oturum açar — agent `ClientSessionServer` JWT'yi `HUB_SECRET` ile imzalar.
3. Hub, isteği `container_session=<JWT>` cookie'siyle agent'a, agent da container web-service'e iletir.
4. Web-service JWT'yi **stateless** doğrular (HS256 + `type=container-session`, `exp`); kullanıcıyı payload'dan çözer. Yerel oturum kaydı yoktur; iptal (revocation) hub tarafındadır.

### 4.4 Demo eşlemesi

`deployment/v2/dev/{container,container2}/docker-compose.yml`:

- `container-web-service` env'lerinden `HUB_PEER_ENABLED`, `HUB_PEER_URL`, `HUB_PEER_TOKEN`,
  `TUNNEL_SERVICE_ID`, `TUNNEL_API_UPSTREAM`, `TUNNEL_STATIC_UPSTREAM` kaldırılır.
- Yeni `container-agent` servisi:

```yaml
agent:
  image: ${AGENT_IMAGE:-ws-tunnel-agent:local}
  environment:
    HUB_URL: http://hub-servis:5003
    PEER_ID: ${CONTAINER_ID:-container-1}
    PEER_TYPE: container
    SERVICE_ID: container-api
    LOCAL_TARGET: http://container-web-service:5001
    PEER_TOKEN: ${HUB_PEER_TOKEN:-dev-hub-peer-token}
    HUB_SECRET: ${JWT_SECRET:?JWT_SECRET zorunlu}
```

### 4.5 Kaldırılacak bileşenler (web-service, container tier)

- `config/container.ts#hubPeerConnector`, `#containerSessionServer`, `#tunnelClient`
- `config/default.ts#hubPeerConfig` kullanımı + `HUB_PEER_ENABLED`/`HUB_PEER_URL`/`HUB_PEER_TOKEN` config tanımları
- `index.ts` start/stop/attach lifecycle'ları
- `presentation/server.ts#ServerDependencies.hubPeerConnector` + status route bağımlılığı
- `ClientSessionStore` kullanımı (stateful doğrulama) → stateless authenticator

## 5. Purity Kuralları (ZORUNLU)

1. `packages/ws-tunnel*` içine **0 satır** değişiklik (K0) — agent yetenekleri sabit kabul edilir.
2. Container web-service'te peer connector / session server / tunnel client **kalmaz**; bunlar
   agent'ın sorumluluğudur.
3. Agent'a domain kodu eklenmez; web-service'e transport/peer kodu eklenmez.
4. Oturum doğrulaması **stateless**'tir; paylaşılan secret yalnız aynı konteyner bilgisayarındaki
   agent + web-service arasındadır.
5. Dış API yanıt şekilleri değişmez; field tier davranışı aynı kalır.

## 6. Use Case'ler

### 6.1 UC-1 — Container tier'den peer/session/tunnel tesisatının kaldırılması

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: DI kayıtları/lifecycle silme, `HUB_PEER_*` config kaldırma, stateless session doğrulama
- hariç: field tier, agent paketi, dış API'ler

**Akış:**
1. `hubPeerConfig` ve `HUB_PEER_*` tanımları kaldırılır.
2. `hubPeerConnector`, `containerSessionServer`, `tunnelClient` kayıtları + lifecycle silinir.
3. Container tier rbac'i, agent imzalı JWT'yi stateless doğrulayan authenticator'a bağlanır.
4. Status route konnektör olmadan "kapalı" bildirir (endpoint korunur).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Container tier'da peer connector/session server/tunnel client kaydı ve lifecycle KALMAMALI | AK-1.1 |
| FR-1.2 | `HUB_PEER_*` config tanımları ve `hubPeerConfig` KALMAMALI | AK-1.2 |
| FR-1.3 | `container_session` doğrulaması stateless olmalı: HS256 + `type=container-session` + `exp`; yerel oturum map'i KULLANILMAMALI | AK-1.3 |
| FR-1.4 | Geçersiz/expired/yanlış etiketli token → 401 (fail-closed); geçerli token → `x-tunnel-user-*` yerine payload'dan kullanıcı | AK-1.4 |
| FR-1.5 | Bearer akışı ve field tier oturum davranışı DEĞİŞMEMELİ | AK-1.5 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** container tier açılışı **WHEN** DI kayıtları incelenir **THEN** `hubPeerConnector`/`containerSessionServer`/`tunnelClient` YOKTUR
2. **AK-1.2 — GIVEN** kod tabanı **WHEN** `HUB_PEER_` aranır **THEN** config tanımı/kullanımı yoktur (yalnız deployment geçmişi notları)
3. **AK-1.3 — GIVEN** agent imzalı `container_session` JWT'si **WHEN** rbac doğrular **THEN** kullanıcı payload'dan çözülür (yerel oturum kaydı aranmaz)
4. **AK-1.4 — GIVEN** süresi geçmiş/bozuk token **WHEN** istek gelir **THEN** 401 döner; geçerli token 200 ile devam eder
5. **AK-1.5 — GIVEN** Bearer'lı yerel istek **WHEN** çalıştırılır **THEN** davranış değişmez; field tier testleri yeşil

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | DI temiz | unit (container wiring) | ⬜ |
| AK-1.2 | Config kalıntısı yok | grep + `default.test.ts` | ⬜ |
| AK-1.3 | Stateless doğrulama | unit (stateless authenticator) | ⬜ |
| AK-1.4 | Fail-closed 401 | unit (rbac + authenticator) | ⬜ |
| AK-1.5 | Geri uyum | web-service test + integration | ⬜ |

**T Görev Listesi:**
- [ ] T-1: Stateless session authenticator (JWT verify + `toWebUser` eşlemesi)
- [ ] T-2: `container.ts`/`index.ts`/`server.ts` temizliği
- [ ] T-3: `hubPeerConfig` + `HUB_PEER_*` config tanımlarının kaldırılması
- [ ] T-4: Kırmızı→yeşil testler (authenticator, rbac, wiring, status-route)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| `HUB_SECRET` ≠ web-service `JWT_SECRET` | JWT doğrulanamaz → 401 (fail-closed; deployment hatası loglanır) |
| Oturum hub'da iptal edildi | App bunu bilmez (stateless) — erişim zaten hub üzerinden kesilir |
| Cookie yok, Bearer var | Mevcut Bearer akışı (değişmez) |
| Field tier `field_session` | Değişmez (uplink kendi peer'ı; stateful store geçerli) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/infrastructure/container-session/stateless-session-authenticator.ts` | YENİ |
| `services/web-service/src/config/container.ts` | Kayıt/lifecycle silme, authenticator bağlama |
| `services/web-service/src/config/default.ts` | `hubPeerConfig` + `HUB_PEER_*` kaldırma |
| `services/web-service/src/index.ts` | Lifecycle temizliği |
| `services/web-service/src/presentation/server.ts` | `hubPeerConnector` bağımlılığı kaldırma |

### 6.2 UC-2 — Demo deployment'ın üretim topolojisine çekilmesi

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: container/container2 compose'larına `container-agent`, web-service env temizliği, `.env.example`, runbook
- hariç: field compose (değişmez), ws-tunnel imajları

**Akış:**
1. Her konteyner compose'una `container-agent` servisi eklenir (peerType container, `SERVICE_ID=container-api`, `HUB_SECRET=${JWT_SECRET}`).
2. `container-web-service` env'lerinden tunnel/peer değişkenleri kaldırılır.
3. `.env.example` ve runbook güncellenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Her konteyner compose'unda agent servisi MUST bulunmalı (`PEER_TYPE=container`, doğru `PEER_ID`) | AK-2.1 |
| FR-2.2 | Web-service env'lerinde `HUB_PEER_*`/`TUNNEL_SERVICE_ID`/`TUNNEL_*_UPSTREAM` OLMAMALI | AK-2.2 |
| FR-2.3 | `.env.example` + runbook üretim modelini yansıtmalı | AK-2.3 |
| FR-2.4 | Field compose ve `demo-field-agent` DEĞİŞMEMELİ | AK-2.4 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** container/container2 compose **WHEN** servisler incelenir **THEN** agent servisi vardır, peer kimliği doğrudur
2. **AK-2.2 — GIVEN** web-service env bloğu **WHEN** incelenir **THEN** tunnel/peer değişkeni yoktur
3. **AK-2.3 — GIVEN** şablon + runbook **WHEN** okunur **THEN** agent'lı model anlatılır
4. **AK-2.4 — GIVEN** field compose **WHEN** diff alınır **THEN** değişiklik yoktur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Agent servisleri | `docker compose config` | ⬜ |
| AK-2.2 | Env temiz | compose inceleme | ⬜ |
| AK-2.3 | Doküman senkron | runbook + `.env.example` | ⬜ |
| AK-2.4 | Field değişmez | `git diff` | ⬜ |

**T Görev Listesi:**
- [ ] T-5: container/container2 compose + `.env.example` güncellemesi
- [ ] T-6: Runbook + AGENTS-WS-TUNNEL/AGENTS-DEPLOYMENT notları

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Agent imajı yok | Stack açılışında hata (ön koşul: `ws-tunnel-agent:local` build) |
| `HUB_SECRET` boş | Agent token imzalayamaz → erişim 401 (fail-closed) |
| Agent yeniden bağlanır | Peer kaydı yenilenir; field cache TTL ile kendini toparlar |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/v2/dev/container/docker-compose.yml` | Agent + env temizliği |
| `deployment/v2/dev/container2/docker-compose.yml` | Agent + env temizliği |
| `deployment/v2/dev/{container,container2}/.env.example` | Agent değişkenleri |
| `docs/process/DEMO-STACK-ISLETIM-RUNBOOK.md` | Model notu |

### 6.3 UC-3 — Doğrulama ve geri uyum

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: field davranışının ve dış API'lerin sabit kaldığının kanıtı, canlı hub erişimi
- hariç: yeni uç/alan

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Field API yanıt şekilleri DEĞİŞMEMELİ (`/fields/:id/containers`, telemetri, operasyon) | AK-3.1 |
| FR-3.2 | Agent üzerinden hub erişimi MUST çalışmalı (consumer token + `container_session` akışı) | AK-3.2 |
| FR-3.3 | Demo entegrasyon suite'i (108) yeşil kalmalı | AK-3.3 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** field API **WHEN** containers çağrılır **THEN** alanlar/veri aynıdır
2. **AK-3.2 — GIVEN** agent kayıtlı **WHEN** consumer token ile `/peers/<cid>/services/container-api/...` çağrılır **THEN** 200 döner ve oturum cookie'si doğrulanır
3. **AK-3.3 — GIVEN** hub stack **WHEN** `bun run test:demo-integration` **THEN** 108/108

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | API şekli sabit | integration | ⬜ |
| AK-3.2 | Agent üzerinden erişim | canlı curl + unit | ⬜ |
| AK-3.3 | 108/108 | `test:demo-integration` | ⬜ |

**T Görev Listesi:**
- [ ] T-7: Canlı doğrulama (peers listesi, consumer erişimi, oturum akışı)
- [ ] T-8: Tam test + KAPANIŞ

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Container peer geç bağlanır | Field cache TTL sonrası dolar; testlerde bekleme mevcut |
| Agent iki kez kaydolur | Hub peer kaydı tekilleştirir (paket davranışı, değişmez) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/integration/*` | Doğrulama (davranış aynı) |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Agent yok/bağlı değil | Peer offline; field `connectionStatus: disconnected`, latest boş (mevcut) |
| Geçersiz/expired oturum JWT'si | 401 (fail-closed; stateless doğrulama) |
| `HUB_SECRET` uyuşmazlığı | 401; deployment yapılandırma hatası |
| Hub restart | Peer'lar yeniden bağlanır; field cache TTL ile tazelenir |
| Bearer ile yerel erişim | Değişmez |
| Field tier (`field_session`) | Değişmez (kendi peer'ı + stateful store) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | `packages/ws-tunnel*` altında 0 satır değişiklik | `git diff` |
| SC-2 | Container tier'da peer/session-server/tunnel-client kalıntısı yok | grep + DI inceleme |
| SC-3 | Unit testler yeşil | `nx run web-service:test` |
| SC-4 | Tam test seti yeşil | `bun run test` |
| SC-5 | Demo entegrasyon 108/108 | `bun run test:demo-integration` |
| SC-6 | Canlı: agent üzerinden consumer erişimi + oturum doğrulaması | curl + log |
| SC-7 | `bun run spec:check` temiz | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | Stateless authenticator + kaldırılan bileşen sözleşmeleri |
| 3. TEST | T-4 (kırmızı) |
| 4. IMPL | T-1..T-7 |
| 5. KAPANIŞ | `KONTEYNER-AGENT-KAYIT-KAPANIS.md`; T-8 |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A-1 | Stateless doğrulamada app-side revocation yok | Kabul — iptal hub tarafında; token `exp` ile sınırlı |
| A-2 | Container SPA demo'da yok (v2 UI'suz) | Kabul — üretimde SPA agent arkasında; API yolu doğrulanıyor |
| A-3 | Field peer (`FIELD_UPLINK`) demo'da kapalı | Geçerli (WEB-SERVICE-TUNNEL-SADELESTIRME A-4) |
| A-4 | Agent'a çoklu servis (`SERVICE_ID` tek) | Ayrı iş — ihtiyaç doğarsa agent SPEC'i |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Boss tier'ın field servislerine hub üzerinden erişimi (`field-api` duyurusu) — ayrı SPEC.
2. Agent'ta çoklu servis/etiket desteği — paket değişikliği gerektirir (K0), ayrı karar.

## 12. T Görev Özeti

| # | Görev | UC |
|:--|:------|:---|
| T-1 | Stateless session authenticator | UC-1 |
| T-2 | `container.ts`/`index.ts`/`server.ts` temizliği | UC-1 |
| T-3 | `hubPeerConfig` + `HUB_PEER_*` kaldırma | UC-1 |
| T-4 | Kırmızı→yeşil testler | UC-1 |
| T-5 | Container compose'ları + `.env.example` | UC-2 |
| T-6 | Runbook + AGENTS notları | UC-2 |
| T-7 | Canlı doğrulama | UC-3 |
| T-8 | Tam test + KAPANIŞ | UC-3 |
