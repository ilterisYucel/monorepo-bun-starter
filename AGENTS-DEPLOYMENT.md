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
├── <proje>/                       # örn. v1 (klasik stack), v2 (demo-field)
│   ├── common/                    # proje içi zorunlu paylaşım (nadir)
│   ├── dev/{container,field,boss}/
│   ├── prod/{container,field,boss}/
│   ├── aws/{container,field,boss}/
│   └── office/{container,field,boss}/
├── k6/                            # proje bağımsız araç — kökte kalır
└── wiki/ + docker-compose.wiki.yml  # proje bağımsız araç — kökte kalır
```

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
   (örn. `v1/common/customer-plugins`). App klasörü kendi kardeşine değil, `common`'a referans verir.
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

## AWS edge topolojisi

- Edge makinesinde container ve field **ayrı compose dosyalarıdır** ama aynı sunucuda çalışır; ortak
  Docker ağını container compose tanımlar (`name:` sabit), field compose `external: true` ile katılır.

## Yeni deployment eklerken kontrol listesi

- [ ] Dosya `deployment/<proje>/<tier>/<app>/` altında mı?
- [ ] Compose/config/env referansları yalnızca kendi klasörü veya `<proje>/common/` mu?
- [ ] Dockerfile dışında kod klasörüne referans var mı? (olmamalı)
- [ ] Config'ler kök `configs/`'ten kopyalanıp düzenlendi mi?
- [ ] `.env.example` commit'li, gerçek `.env` gitignore'lu mu?
