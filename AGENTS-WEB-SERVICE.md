---
status: active
space: agents
tags: [agents, referans, web-service, hexagonal, katman, tier, fastify]
review_date: 2026-12-01
---

# AGENTS Detay Referansı — Web-Service Katmanlama ve Tier Kuralları

> Bu doküman `AGENTS.md`'den ayrılan **referans** içeriktir; her oturumda yüklenmez.
> `services/web-service/**` altına dokunacaksan **önce bu dokümanı oku** (MANDATORY).
>
> **Authoritative:** [WEB-SERVICE-KATMANLAMA-MIMARISI.md](docs/architecture/WEB-SERVICE-KATMANLAMA-MIMARISI.md)
> (K1–K16, UC-1..UC-7, göç M1–M7) + [WEB-SERVICE-HUB-ENVANTERI.md](docs/analysis/WEB-SERVICE-HUB-ENVANTERI.md).
> Çelişkide SPEC üstündür.

## 1. Katman modeli (ZORUNLU)

```
presentation (Fastify plugin'leri; HTTP giriş adaptörü)
        │            infrastructure (DB/hub/mq çıkış + driving adaptörler)
        ▼                        ▼
   application (use-case'ler) ──► domain (saf TS: entity/VO + portlar)
```

| Katman | İzinli import | Yasak |
|:-------|:--------------|:------|
| `domain` | `@gd-monorepo/shared-types` (yalnız `import type`), saf TS kütüphaneleri (`result`) | fastify, awilix, bullmq, pg, jose, tamper-logger, hub/ws-tunnel, env |
| `application` | `domain`, `shared-types`, saf TS kütüphaneleri | framework/I-O paketleri, HTTP istemcileri |
| `infrastructure` | `domain` portlarını uygular; driving adaptörler `application` use-case'lerini çağırır; 3rd-party serbest | `presentation` (kardeş halka) |
| `presentation` | `application` use-case'leri, DTO tipleri | `infrastructure`, doğrudan `postgres`/`timescale`/hub client |
| `config` | hepsi (composition root) | iş mantığı |

- Bağımlılık **her zaman içe doğru**; presentation ve infrastructure **kardeştir** (birbirini import etmez).
- Portlar **`domain/ports/`** (veya auth'ta `domain/services`, `domain/repositories`) içinde; application giden portları tüketir, gelen tarafı use-case imzalarıdır.
- **Purity kapıları:** `domain/`+`application/` içinde framework/I-O paket import = 0
  (izinli: `shared-types`, `result`, yerel domain).

## 2. İsimlendirme

- Port: `I`-önekli arayüz (`IContaTelemetryPort`, `IAuditLog`), `domain/ports/`.
- Use-case: `*UseCase` (`GetFieldContainersUseCase`), `application/<alan>/`.
- Adaptör: `*Adapter` veya somut ad (`HubConsumerClient`, `LogEventFeed`), `infrastructure/` veya `tiers/<tier>/infrastructure/`.
- DTO: `application/<alan>` içinde; dış sözleşme şekilleri **DEĞİŞMEZ**.
- Yasak: `*Manager`, `*Processor`, `*Helper`, `*Utils` (Elegant Object kural 7).

## 3. Tier modeli

```
src/core/{domain,application,infrastructure,presentation}   # ortak
src/core/infrastructure/hub-tunnel/                          # generic hub taşıması + plugin
src/tiers/container/{infrastructure,...}                     # container-only
src/tiers/field/{infrastructure,...}                         # field-only
src/tiers/boss/{infrastructure,...}                          # boss-only
src/config/                                                  # composition root
```

- `serviceTier` **yalnız** `config/` ve `tiers/` kompozisyon/lifecycle dosyalarında kullanılır;
  route/plugin/use-case/adaptör içinde YASAK.
- Tier'a özgü bileşen `tiers/<tier>/` altında yaşar; kaydı `register<Tier>Tier(container)` ile
  (`tiers/<tier>/registrations.ts`). `buildContainer()` core + üç tier kaydını çağırır.
- Tier lifecycle: `tiers/lifecycles.ts#buildTierLifecycles` — `index.ts` yalnız orkestre eder.

## 4. Fastify

- Her route grubu bir **plugin**'dir; `app.register(xRoutes, { prefix, ...opts })` ile doğrudan kaydedilir
  (anonim sarmalayıcı YOK).
- Tier koşulu **registration'da**; plugin içinde `serviceTier` YOK.
- Security hook'ları (rbac, request-context, error) **global**'dir (tüm route'lara uygulanır) — kapsüllemeyin.
- `hubTunnelPlugin` (`infrastructure/hub-tunnel/plugin.ts`): `{ baseUrl, token }` ile takılır,
  `fastify.hubTunnel` (`IHubTunnelPort`) decorator'ını sunar; iş mantığı içermez.

## 5. Hub / tünel

- Tüm hub erişimi **`IHubTunnelPort`** üzerinden (`peers/access/openSession`); tüketiciler
  `HubConsumerClient`'ı doğrudan import etmez.
- Konteyner telemetri görünümü (`HubContainerView` + cache + publisher) **field tier**'dadır.
- Hub'a anlamsız WS metotları (`sendControl/sendBinary/registerContainer`) **port yüzeyinde yoktur**.
- Yeni bağlantı yolu (hub dışı) gerekirse: port sabit, **yeni adapter** yazılır (transport-switch makinesi kurulmaz).

## 6. Test ve doğrulama

- Route testleri: use-case + **fake port** (doğrudan DB/SQL mock'u değil); adaptör testleri SQL parametreleri/eşleme.
- Yeni modül: JSDoc → kırmızı test → minimal impl (AGENTS.md iş akışı).
- Kapılar: `nx run web-service:test`, `bun run test`, `bun run test:demo-integration` (108/108).
- Purity grep:
  ```bash
  grep -rnE 'from "(fastify|awilix|bullmq|pg|jose|@gd-monorepo/tamper-logger)' services/web-service/src/domain services/web-service/src/application
  grep -rn "serviceTier" services/web-service/src/presentation services/web-service/src/application
  ```
  İkisi de **boş** dönmelidir.
