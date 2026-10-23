---
status: active
space: agents
tags: [agents, referans, deployment, kapsulleme, compose]
review_date: 2026-12-01
---

# AGENTS Detay Referansı — Deployment Klasör Yapısı

> Bu doküman `AGENTS.md`'den taşınan **referans** içeriktir; her oturumda yüklenmez.
> `deployment/**` altında dizin/klasör yapısı, compose/config/env dosyası ekleyeceksen oku.
> Kapsam: deployment ağacının kapsülleme (encapsulation) kurallarıdır.

## Amaç

`deployment/` ağacı **proje-öncelikli** ve **kendi kendine yeten (self-contained)** olur: her uygulama
klasörü ihtiyaç duyduğu compose, config ve `.env` dosyalarını kendi içinde barındırır. Çapraz referans
takibi zorlaştırdığı ve encapsulation'ı bozduğu için YASAKTIR. Bu kural, ileride aynı refaktörün tekrar
gerekmesini önlemek için kalıcıdır.

## Yol şeması (MANDATORY)

```text
deployment/
├── <proje>/                       # bugün: v2 (demo-field)
│   └── <tier>/                    # bugün: dev
│       └── <app>/                 # container, container2, field
├── k6/                            # proje bağımsız araç — kökte kalır
└── wiki/ + docker-compose.wiki.yml  # proje bağımsız araç — kökte kalır
```

Bugünkü tek stack: `deployment/v2/dev/{container,container2,field}/` (v1/AWS/office kaldırıldı).

- Ortam (tier) **proje klasörünün içinde** ayrılır: `deployment/<proje>/<tier>/<app>/`.
- Her `<app>` klasörü kendi `docker-compose.yml`, `device-configs/`, `maneuvers/`, `rules/`,
  `plugins/` (varsa) ve `.env`'ini barındırır.
- Gerçek müşteri projelerinde `<proje>` yerine proje adı kullanılır (örn. `polatli-ges`).

## Kapsülleme kuralları (MANDATORY)

1. **App'ler arası çapraz referans YASAK.** Bir app klasörü kardeş app klasöründen (`../<başka-app>/…`)
   compose, config veya `.env` çekemez; ihtiyacı olanı kendi klasöründe bulundurur.
2. **Kod klasörü örneklerinden referans YASAK.** App klasörleri servis/app kod klasörlerindeki örnek
   `docker-compose`, config ve `.env` dosyalarına referans veremez.
3. **Paylaşım yalnızca `<proje>/common/` altından** yapılır ve yalnızca çok zaruri hallerde kullanılır
   (örn. `<proje>/common/customer-plugins`). App klasörü kendi kardeşine değil, `common`'a referans verir.
4. **Device config / maneuvers / rules** repo kök `configs/` (source of truth) dizininden **kopyalanıp**
   projeye özgü değişkenler (`connection.host`, `port`, `slaveId`, instance adları) düzenlenir. Runtime'da
   kök `configs/`'e referans verilmez.
5. **Tek istisna — Dockerfile.** Zorunluluk gereği app'ler servis/app kod klasörlerindeki Dockerfile'lara
   referans verebilir: `dockerfile: services/…/deployment/Dockerfile*`, `apps/…/deployment/Dockerfile*`.
   Compose `build.context` repo köküdür; Dockerfile yolu repo köküne görelidir.

## Env convention (MANDATORY)

- Env dosyası ilgili app klasöründe, compose'un yanında yaşar: `deployment/<proje>/<tier>/<app>/.env`
  (gitignore'lu). Her `docker compose` çağrısı `--env-file deployment/<proje>/<tier>/<app>/.env` ile geçer.
- Commit'lenen tek şablon ilgili klasördeki `.env.example`'dır (sır yok). Gerçek `.env` asla commit'lenmez.
- Tier/app dosyasına ait olmayan alan YAZILMAZ (örn. `CONTAINER_TOKEN` yalnızca `container/.env`'de).

## Yeni deployment eklerken kontrol listesi

- [ ] Dosya `deployment/<proje>/<tier>/<app>/` altında mı?
- [ ] Compose/config/env referansları yalnızca kendi klasörü veya `<proje>/common/` mu?
- [ ] Dockerfile dışında kod klasörüne referans var mı? (olmamalı)
- [ ] Config'ler kök `configs/`'ten kopyalanıp düzenlendi mi?
- [ ] `.env.example` commit'li, gerçek `.env` gitignore'lu mu?

## Hub-servis (P3) — cutover runbook

> SPEC: [WS-TUNNEL-HUB-CONSUMER-P3-MIMARISI.md](docs/architecture/WS-TUNNEL-HUB-CONSUMER-P3-MIMARISI.md)

- **İmaj:** `docker build -f packages/ws-tunnel-hub/Dockerfile -t ws-tunnel-hub:<tag> .` (monorepo kök bağlamı). Compose'da `HUB_IMAGE` ile seçilir.
- **Servis:** field stack'te `hub-servis` (port 5003 iç, dış 5009). Volume `/data` (sqlite modunda; env modunda gerekmez).
- **Kimlik (tier-bazlı, HUB_MODE flag'i YOK):**
  - `container` tier → hub **peer**'ıdır, ancak kayıt **agent üzerinden** yapılır (SPEC KONTEYNER-AGENT-KAYIT): `ws-tunnel-agent` (`PEER_TYPE=container`, `PEER_ID`, `SERVICE_ID=container-api`, `LOCAL_TARGET`, `HUB_PEER_TOKEN` hub `PEER_TOKEN` ile aynı, `HUB_SECRET`=web-service `JWT_SECRET`). Web-service peer bağlantısı/session server/tunnel client TAŞIMAZ; `container_session` JWT'sini stateless doğrular. Natif `HUB_PEER_ENABLED` modeli kaldırıldı.
  - `field`/`boss` tier → hub **consumer**'dır: `HUB_CONSUMER_URL` + `HUB_CONSUMER_TOKEN` **zorunlu** (eksikse açılış fail-fast — `config/default.ts#hubConsumerConfig`).
- **Agent (peer):** `ws-tunnel-agent` imajı ile uygulama hub'a peer olarak kaydedilir; `PEER_TOKEN` hub ile aynı, `LOCAL_TARGET` tünellenen uygulama. Üretimde konteyner stack'lerinin kaydı YALNIZ agent iledir; demoda da `container-agent`/`container2-agent` kullanılır. İlk açılışta config yoksa setup UI (8080) açılır.
- **Rollback:** peer URL'ini eski hedefe çevir + consumer env'lerini kaldır (tier-gating nedeniyle field/boss consumer zorunludur; geri dönüş için hub-servis servisini kaldırıp legacy hedefe dönülür).

### P3 — nginx hub alias sözleşmesi

Hub modunda tarayıcı erişimi hub-servis'ten geçer (aynı origin). Her stack'in web nginx'ine eklenir:

| Yol (mevcut) | Hedef (hub-servis) |
|:---|:---|
| `/peers/*` | `http://hub-servis:5003` (opak peer/servis erişimi — WS upgrade başlıkları) |
| `/fields/<fid>/ui/*` (boss stack) | `http://hub-servis:5003/peers/<fid>/services/field-api/$1` |
| `/containers/<cid>/ui/*` (field stack) | `http://hub-servis:5003/peers/<cid>/services/container-api/$1` |

- Alias servis kimliği, hub config `HUB_CONTAINER_SERVICE_ID` (ve container peer'ının duyurduğu `services[].id`) ile eşleşmelidir.
- WS/SSE için `Upgrade`/`Connection` başlıkları açık; `proxy_read_timeout` yüksek (uzun oturum).
- Örnek uygulama: `deployment/v2/dev/field/nginx/demo-field.conf` (app klasöründe, kapsülleme kuralına uygun).
