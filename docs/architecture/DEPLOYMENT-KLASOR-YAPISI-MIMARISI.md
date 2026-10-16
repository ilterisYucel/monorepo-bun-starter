---
status: active
space: architecture
tags: [mimari, deployment, klasor-yapisi, kapsulleme, spec]
review_date: 2026-10-12
---

# Deployment Klasör Yapısı — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** 🟢 Doğrulanmış (2026-10-12) — implementasyon + KAPANIŞ tamam.
> **Kaynak istek:** `/home/ilteris/Downloads/deployment-klasör-yapılandırılması.md` (kullanıcı SPEC taslağı).
> **İlişkili:** [AGENTS.md](../../AGENTS.md) (Docker/deployment + DI kuralları), [AGENTS-INFRA.md](../../AGENTS-INFRA.md), [AGENTS-WS-TUNNEL.md](../../AGENTS-WS-TUNNEL.md).

## 1. Amaç ve Bağlam

`deployment/` ağacı bugün **ortam-öncelikli** (`deployment/{dev,prod,aws,office}/{container,field,boss}`) ve
uygulama klasörleri kardeş tier klasörlerine `../` ile, örnek dosyalara ise repo köküne `../../../` ile
bağlanıyor. Bu durum takibi zorlaştırıyor (kullanıcı sorunu #1) ve kapsüllemeyi (encapsulation) ihlal
ediyor (#2). Amaç, `deployment/` ağacını **proje-öncelikli** ve **kendi kendine yeten (self-contained)**
hale getirmek; ileride aynı refaktörü tekrar gerektirmeyecek bir kuralı `AGENTS-DEPLOYMENT.md`'ye yazmak.

| Katman | Kapsam |
|:-------|:-------|
| **Dahil** | `deployment/**` dizin ağacı, `.env` / `.env.example` konumları, `package.json` deployment script yolları, `AGENTS-DEPLOYMENT.md` kural dokümanı, `demo-backend` kaldırma (uygulama + deployment + referanslar), dokümanlardaki `deployment/...` yol güncellemeleri |
| **Hariç** | Compose servis tanımlarının *içeriği* (imaj, env değişkeni, kaynak) — yalnızca yol/mount güncellenir; Dockerfile içerikleri; gerçek sırların değerleri; CI/CD pipeline değişimi (§11); uygulama kod davranışı; `services/*/deployment/` Dockerfile konumu (korunur) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K-1 | Deployment ağacı **proje-öncelikli** olur: `deployment/{proje}/…` | `v1` (klasik container/field/boss stack) ve `v2` (demo-field) proje kökleri açılır |
| K-2 | Ortam (tier) **proje klasörünün içinde** ayrılır (SPEC madde 6) | `deployment/<proje>/{dev,prod,aws,office}/{container,field,boss}` |
| K-3 | Uygulama klasörleri kardeş klasörden/örnek dosyadan compose, config, `.env` çekemez; **kendi klasöründe** barındırır (SPEC madde 1-2) | `../…` ve `../../../deployment/…` cross-ref'ler kaldırılır |
| K-4 | Zorunlu paylaşım yalnızca `<proje>/common/` altında (SPEC madde 3) | `customer-plugins` → `v1/common/customer-plugins` |
| K-5 | Device config / maneuvers / rules/docker config'ler repo kökü `configs/`'ten **kopyalanıp düzenlenir** (SPEC madde 4) | Tier app klasörlerinde kendi `device-configs/`, `maneuvers/`, `rules/` kopyaları |
| K-6 | Yalnızca **Dockerfile**'lar servis/app kod klasörlerinden referans alabilir (SPEC madde 4) | Compose'lardaki `dockerfile: services/…`, `apps/…` yolları korunur |
| K-7 | Env dosyası compose'un **yanında** yaşar | `<proje>/<tier>/<app>/.env` (gitignore'lu) + `.env.example` (commit'li) |
| K-8 | AWS edge'in birleşik container+field compose'u **ikiye bölünür**, ortak **external network** ile çalışır (kullanıcı onayı) | `v1/aws/{container,field}` ayrı compose + paylaşılan ağ |
| K-9 | `office/boss` ve `office/field` (compose'suz artıklar) **silinir** (kullanıcı onayı) | `office/container` aktif kalır |
| K-10 | `demo-backend` **tamamen kaldırılır** — app + deployment + workspace + referanslar (kullanıcı onayı) | `apps/demo-backend`, `deployment/dev/demo-backend`, `vitest.workspace.ts` girdisi vb. silinir |
| K-11 | Doğrulayıcı kural `AGENTS-DEPLOYMENT.md`'ye yazılır ve `AGENTS.md` referans tablosuna eklenir (SPEC madde 5) | Yeni geliştirmede çapraz referanslı deployment yasağı kalıcı |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B-1 | `dev/demo-edge` compose'u container **ve** field config'lerini kardeş tier klasörlerinden çekiyor (çift cross-ref) | `deployment/dev/demo-edge/docker-compose.yml#volumes` (`../container/device-configs`, `../field/device-configs`) |
| B-2 | Boss compose'ları proje-dışı ortak `customer-plugins`'e referans veriyor | `deployment/dev/boss/docker-compose.yml#volumes`, `deployment/aws/boss/docker-compose.yml#volumes`, `deployment/prod/boss/docker-compose.yml#volumes` |
| B-3 | Gerçek `.env` dosyaları kökte (`.env.container`, `.env.boss`, `.env.field`, `.env.aws-boss`, `.env.aws-edge`) ama script'ler tier klasöründe arıyor — hedef dosyalar yok | `package.json#scripts` (`--env-file deployment/dev/container/.env` …) |
| B-4 | AWS edge ve demo-edge, container+field servislerini tek klasör/tek compose'da birleştiriyor | `deployment/aws/edge/docker-compose.yml#services`, `deployment/aws/demo-edge/docker-compose.yml#services` |
| B-5 | `demo-backend` uygulaması ve deployment klasörü hâlâ mevcut | `apps/demo-backend/project.json#name`, `deployment/dev/demo-backend/docker-compose.yml` |
| B-6 | `office/boss` ve `office/field` yalnızca config/plugin taşıyor, compose yok | `deployment/office/boss/plugins/epias-market-prices.example.json`, `deployment/office/field/rules/rules.json` |
| B-7 | `.env.example` şablonları tutarsız konumda (kök + bazı tier'lar) | `deployment/.env.container.example` (kök) vs `deployment/office/container/.env.example` (tier) |

## 4. Mimari

### 4.1 Hedef ağaç

```text
deployment/
├── v1/                         # K-1: klasik container/field/boss projesi
│   ├── common/
│   │   └── customer-plugins/   # K-4: proje-içi paylaşım (boss mount)
│   ├── dev/
│   │   ├── container/          # compose + device-configs/ + maneuvers/ + rules/ + .env.example
│   │   ├── field/
│   │   └── boss/               # compose + plugins/
│   ├── prod/{container,field,boss}/
│   ├── office/container/       # K-9: boss/field artıkları silindi
│   └── aws/
│       ├── container/          # K-8: aws/edge container yarısı + nginx/
│       ├── field/              # K-8: aws/edge field yarısı + nginx/
│       └── boss/
├── v2/                         # K-1: demo-field projesi
│   ├── dev/{container,field}/  # dev/demo-edge bölünmüş (B-1 cross-ref giderildi)
│   └── aws/{container,field}/  # aws/demo-edge bölünmüş
├── k6/                         # proje bağımsız araç — kökte kalır
├── wiki/                       # proje bağımsız araç — kökte kalır
└── docker-compose.wiki.yml     # wiki ile birlikte kökte kalır
```

### 4.2 Kapsülleme kuralı (K-3 / K-4 / K-6)

```text
deployment/<proje>/<tier>/<app>/     ──►  kendi compose + config + .env
        │
        ├─ ALLOWED : Dockerfile referansı (../../../services/*/deployment/Dockerfile*)
        └─ FORBIDDEN: ../../<başka-app>/* , ../../../deployment/<başka-proje>/*

deployment/<proje>/common/*          ──►  proje içi zorunlu paylaşım (K-4)
```

### 4.3 AWS edge olarak iki compose (K-8)

```text
v1/aws/container/docker-compose.yml   →  edge-network (name: v1-aws-edge-network) tanımlar
v1/aws/field/docker-compose.yml       →  networks.edge-network.external: true ile katılır
```

## 5. Purity Kuralları (ZORUNLU)

1. `deployment/<proje>/<tier>/<app>/` kendi `docker-compose.yml`, config dizinleri ve `.env`'ini barındırır; kardeş app klasörüne `../` referansı **YASAK**.
2. Servisler kod klasörlerindeki örnek compose/config/env dosyalarından referans **alamaz**; yalnızca Dockerfile referansı serbest (K-6).
3. Proje-içi zorunlu paylaşım yalnızca `deployment/<proje>/common/` altından yapılır (K-4).
4. Device config, maneuvers ve rules `configs/` kökünden kopyalanıp düzenlenir; runtime'da kök `configs/`'e referans verilmez (K-5).
5. Env dosyası `.env` compose ile aynı klasörde; `.env.example` commit'lenir, gerçek `.env` gitignore'lu kalır (K-7).
6. Proje bağımsız araçlar (`k6/`, `wiki/`, `docker-compose.wiki.yml`) `deployment/` kökünde kalır.
7. Kaynak kodda ve dokümanlarda `demo-backend` referansı kalmaz (K-10).

## 6. Use Case'ler

### 6.1 UC-1 — Kural dokümanı `AGENTS-DEPLOYMENT.md`

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: kapsülleme kuralları (madde 1-4), Dockerfile istisnası, env kuralı, yol şeması, `AGENTS.md` kaydı
- hariç: otomatik ihlal denetleyici lint script'i (§11 ileri iş)

**Akış:**
1. Kullanıcı SPEC'i onaylar.
2. `AGENTS-DEPLOYMENT.md` hedef yapı + yasak/serbest tablosuyla yazılır.
3. `AGENTS.md` referans tablosuna `deployment/**` tetikleyicisiyle satır eklenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | System MUST `deployment/` kapsülleme kurallarını (cross-ref yasağı, common paylaşımı, Dockerfile istisnası) içeren `AGENTS-DEPLOYMENT.md` oluşturur | AK-1.1 |
| FR-1.2 | System MUST `AGENTS.md` "Detay referansları" tablosuna `deployment/**` tetikli satırı ekler | AK-1.2 |
| FR-1.3 | System MUST env dosyası konum kuralını (`<proje>/<tier>/<app>/.env`) dokümante eder | AK-1.3 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** `AGENTS-DEPLOYMENT.md` yok **WHEN** T-1 uygulanır **THEN** dosya kapsülleme yasağı + common paylaşımı + Dockerfile istisnasını maddeler halinde içerir.
2. **AK-1.2 — GIVEN** `AGENTS.md` referans tablosu **WHEN** T-2 uygulanır **THEN** tabloda `AGENTS-DEPLOYMENT.md` satırı `deployment/**` tetikleyicisiyle görünür.
3. **AK-1.3 — GIVEN** `AGENTS-DEPLOYMENT.md` **WHEN** env kuralı okunur **THEN** `.env`'in compose yanında yaşadığı ve `.env.example`'ın commit'lendiği açıkça yazılıdır.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | `AGENTS-DEPLOYMENT.md` mevcut ve kapsülleme + common + Dockerfile istisnası bölümlerini içerir | gözle | ⬜ |
| AK-1.2 | `AGENTS.md` tablosunda AO tetikli satır var | kod inceleme | ⬜ |
| AK-1.3 | Env konum kuralı dokümante | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `AGENTS-DEPLOYMENT.md` kapsülleme + env + Dockerfile istisnası kurallarıyla oluştur
- [ ] T-2: `AGENTS.md` referans tablosuna `AGENTS-DEPLOYMENT.md` satırı ekle
- [ ] T-3: `AGENTS.md` "Docker / deployment" bölümünü yeni yapıya göre güncelle

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| İleride yeni proje eklenirse | Kural proje-agnostik yazılır; `<proje>` yer tutucusu kullanılır |
| Yeni app tipi (örn. relay) | `<app>` yer tutucusu genişletilebilir kalır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `AGENTS-DEPLOYMENT.md` | Yeni kural dokümanı |
| `AGENTS.md` | Referans tablosu + deployment bölümü güncellemesi |

### 6.2 UC-2 — v1 projesi taşıma ve `common` paylaşımı

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: `dev/prod/{container,field,boss}`, `office/container`, `aws/boss` → `v1/…`; `customer-plugins` → `v1/common`; office artıklarının silinmesi
- hariç: `aws/edge` bölme (UC-3), v2 taşıma (UC-4)

**Akış:**
1. `v1/` iskeleti oluşturulur.
2. Mevcut klasörler `git mv` ile taşınır (tarihçe korunur).
3. Boss compose'larındaki `customer-plugins` mount yolu `common` konumuna çevrilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | System MUST klasik stack tier/app klasörlerini `v1/<tier>/<app>` altına taşır | AK-2.1 |
| FR-2.2 | System MUST `customer-plugins`'i `v1/common/customer-plugins`'e taşır | AK-2.2 |
| FR-2.3 | System MUST compose'suz `office/boss` ve `office/field` artıklarını siler | AK-2.3 |
| FR-2.4 | System MUST boss compose mount yollarını `common` konumuna günceller | AK-2.4 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** `deployment/dev/container`, `prod`, `office/container`, `aws/boss` mevcut **WHEN** T-4/T-5 uygulanır **THEN** dosyalar `deployment/v1/<tier>/<app>/` altında ve eski yollarda kopya kalmaz.
2. **AK-2.2 — GIVEN** `deployment/customer-plugins` mevcut **WHEN** T-7 uygulanır **THEN** dizin `deployment/v1/common/customer-plugins` altındadır.
3. **AK-2.3 — GIVEN** compose'suz `office/boss`, `office/field` **WHEN** T-6 uygulanır **THEN** iki klasör ağaçtan kaldırılmıştır.
4. **AK-2.4 — GIVEN** boss compose'ları `../../../deployment/customer-plugins` mount ediyor **WHEN** T-8 uygulanır **THEN** mount `../../common/customer-plugins` biçimindedir ve `docker compose config` geçer.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Tüm v1 tier/app klasörleri yeni konumda, eskileri yok | gözle | ⬜ |
| AK-2.2 | customer-plugins `v1/common` altında | gözle | ⬜ |
| AK-2.3 | office boss/field artıkları silinmiş | gözle | ⬜ |
| AK-2.4 | Boss compose mount yolu güncel ve compose geçerli | e2e | ⬜ |

**T Görev Listesi:**
- [ ] T-4: v1 iskeleti + `dev/prod/{container,field,boss}` taşı (git mv)
- [ ] T-5: `office/container` → `v1/office/container` taşı
- [ ] T-6: `office/boss` + `office/field` artıklarını sil
- [ ] T-7: `customer-plugins` → `v1/common/customer-plugins` taşı
- [ ] T-8: dev/prod/aws boss compose `customer-plugins` mount yolarını güncelle

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| `git mv` hedefi mevcut | Çakışma öncesi elle çözülür; üzerine yazılmaz |
| Boş dizin (customer-plugins `.gitkeep`) | `.gitkeep` birlikte taşınır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/dev|prod/**/docker-compose.yml` | Yol taşıma |
| `deployment/office/container/**` | Taşıma |
| `deployment/customer-plugins/**` | `v1/common`'a taşıma |
| `deployment/{dev,prod,aws}/boss/docker-compose.yml#volumes` | Mount yolu güncelleme |

### 6.3 UC-3 — AWS edge container/field bölme

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: `aws/edge` birleşik compose'unun `v1/aws/container` + `v1/aws/field` olarak bölünmesi, ortak network, nginx ve config dizin adlarının app'e göre düzenlenmesi
- hariç: v2 demo-edge (UC-4), aws/boss (UC-2)

**Akış:**
1. Birleşik compose'dan container servisleri `container/`'a, field servisleri `field/`'a alınır.
2. `container/` compose'u ortak ağı tanımlar; `field/` compose'u `external: true` ile katılır.
3. `container-*`/`field-*` config dizinleri sadeleştirilir (`device-configs/`, `maneuvers/`, `rules/`).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | System MUST `aws/edge` compose'unu container ve field olarak iki dosyaya böler | AK-3.1 |
| FR-3.2 | System MUST ortak Docker ağını container compose'da tanımlayıp field compose'da `external: true` ile paylaştırır | AK-3.2 |
| FR-3.3 | System MUST nginx conf'larını ilgili app klasörüne (`container/nginx`, `field/nginx`) taşır | AK-3.3 |
| FR-3.4 | System MUST `container-*`/`field-*` config dizin adlarını app-içi sade adlara (`device-configs`, `maneuvers`, `rules`) çevirir | AK-3.4 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** birleşik `aws/edge/docker-compose.yml` **WHEN** T-9 uygulanır **THEN** `v1/aws/container` ve `v1/aws/field` altında iki geçerli compose vardır.
2. **AK-3.2 — GIVEN** iki compose ayrıldı **WHEN** T-10 uygulanır **THEN** field compose ortak ağı `external: true` olarak referanslar ve iki stack birlikte ayağa kalkar.
3. **AK-3.3 — GIVEN** `aws/edge/nginx/*.conf` **WHEN** T-12 uygulanır **THEN** container/field conf'ları ilgili app klasöründedir.
4. **AK-3.4 — GIVEN** `container-device-configs`, `field-device-configs` **WHEN** T-11 uygulanır **THEN** dizinler `<app>/device-configs` adını taşır.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | İki ayrı geçerli aws edge compose | e2e | ⬜ |
| AK-3.2 | Ortak external network iki stack'i bağlar | gözle | ⬜ |
| AK-3.3 | nginx conf'ları app klasörlerinde | gözle | ⬜ |
| AK-3.4 | Config dizin adları sadeleşmiş | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-9: `aws/edge` compose'unu container/field olarak ikiye böl
- [ ] T-10: Ortak external network tanımını iki compose'a işle
- [ ] T-11: `container-*`/`field-*` config dizinlerini `device-configs|maneuvers|rules` olarak yeniden adlandır
- [ ] T-12: nginx conf'larını container/field app klasörlerine böl
- [ ] T-13: `v1/aws/{container,field}` compose'larını `docker compose config` ile doğrula

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Field stack container'a bağımlıysa | Ortak external network korunur; bağımlılık ağ üzerinden çözülür |
| İki compose aynı volume adını kullanırsa | Volume adları app-önekli tutulur, çakışma önlenir |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/aws/edge/docker-compose.yml` | Silinir (ikiye bölünür) |
| `deployment/v1/aws/container/docker-compose.yml` | Yeni |
| `deployment/v1/aws/field/docker-compose.yml` | Yeni |
| `deployment/aws/edge/nginx/**` | App klasörlerine dağıtılır |

### 6.4 UC-4 — v2 (demo-field) taşıma ve çapraz referansın giderilmesi

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: `dev/demo-edge` + `aws/demo-edge` → `v2/{dev,aws}/{container,field}`; B-1 cross-ref'inin kendi kopyalarla kaldırılması; birleşik compose'ların bölünmesi
- hariç: v1 taşıma (UC-2), env/script (UC-5)

**Akış:**
1. `v2/` iskeleti oluşturulur; demo-edge compose'ları taşınır.
2. Her app kendi `device-configs/`, `maneuvers/`, `rules/` kopyasını alır; `../container` ve `../field` referansları kaldırılır.
3. Birleşik container+field compose'ları UC-3 ile aynı desende bölünür.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | System MUST demo-edge klasörlerini `v2/{dev,aws}/{container,field}` altına taşır | AK-4.1 |
| FR-4.2 | System MUST her v2 app'e kendi config kopyalarını koyup `../container`/`../field` referanslarını kaldırır | AK-4.2 |
| FR-4.3 | System MUST v2 birleşik compose'larını container/field olarak böler | AK-4.3 |
| FR-4.4 | System MUST v2 aws nginx conf'larını app klasörlerine böler | AK-4.4 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** `deployment/dev/demo-edge` ve `deployment/aws/demo-edge` **WHEN** T-14 uygulanır **THEN** içerik `deployment/v2/{dev,aws}/{container,field}` altındadır.
2. **AK-4.2 — GIVEN** `dev/demo-edge` compose'u `../container/device-configs` ve `../field/device-configs` çekiyor **WHEN** T-15 uygulanır **THEN** compose yalnızca kendi klasör içi config'leri mount eder; `../` referansı kalmaz.
3. **AK-4.3 — GIVEN** v2 birleşik compose'ları **WHEN** T-16 uygulanır **THEN** container ve field ayrı compose dosyalarıdır.
4. **AK-4.4 — GIVEN** `aws/demo-edge/nginx/aws-*.conf` **WHEN** T-17 uygulanır **THEN** conf'lar ilgili app klasöründedir.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | v2 klasörleri yeni konumda | gözle | ⬜ |
| AK-4.2 | v2 compose'larında `../container`/`../field` referansı yok | kod inceleme | ⬜ |
| AK-4.3 | v2 compose'ları bölünmüş | e2e | ⬜ |
| AK-4.4 | v2 nginx conf'ları app klasörlerinde | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-14: v2 iskeleti + demo-edge klasörlerini taşı
- [ ] T-15: v2 compose `../container`/`../field` referanslarını kaldır; her app'e kendi config kopyasını koy
- [ ] T-16: v2 dev + aws birleşik compose'larını container/field olarak böl
- [ ] T-17: v2 aws nginx conf'larını app klasörlerine böl
- [ ] T-18: v2 compose'larını `docker compose config` ile doğrula

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Demo container config'i root `configs/`'te eşdeğeri yok | Mevcut demo JSON'ları kopyalanır (kaynak: v1 demo seti) |
| demo-bridge bağımlılığı | Bölmede ortak external ağ ile korunur |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/dev/demo-edge/**` | `v2/dev` altına taşınır, bölünür |
| `deployment/aws/demo-edge/**` | `v2/aws` altına taşınır, bölünür |
| `deployment/v2/**/docker-compose.yml` | `../` cross-ref temizliği |

### 6.5 UC-5 — Env dosyaları ve script yolları

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: gerçek `.env`'lerin tier/app klasörlerine taşınması, `.env.example` şablonlarının yeniden konumlandırılması, `.gitignore` istisnalarının sadeleştirilmesi, `package.json` script yollarının güncellenmesi
- hariç: sır değerlerinin değiştirilmesi, yeni env anahtarı eklenmesi

**Akış:**
1. Kök `.env.*` gerçek dosyaları ilgili `<proje>/<tier>/<app>/.env` konumuna taşınır; birleşik olanlar bölünür.
2. `.env.*.example` şablonları `.env.example` olarak tier klasörlerine yerleştirilir.
3. `package.json` deployment script'leri ve `DEVICE_CONFIG_DIR` ortam değişkeni yolları yeni yapıya çevrilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | System MUST gerçek `.env` dosyalarını `<proje>/<tier>/<app>/.env` konumuna taşır | AK-5.1 |
| FR-5.2 | System MUST şablonları `.env.example` olarak ilgili app klasörüne yerleştirir | AK-5.2 |
| FR-5.3 | System MUST `package.json` deployment script yollarını yeni yapıya günceller | AK-5.3 |
| FR-5.4 | System MUST `.gitignore`'daki kök `!.env.*.example` istisnalarını sadeleştirir | AK-5.4 |

**Kabul Senaryoları (GWT):**
1. **AK-5.1 — GIVEN** kök `.env.container` gerçek dosyası **WHEN** T-19 uygulanır **THEN** `deployment/v1/dev/container/.env` mevcut ve kökte artık `.env.container` yok.
2. **AK-5.2 — GIVEN** `deployment/.env.field.example` **WHEN** T-20 uygulanır **THEN** şablon `deployment/v1/dev/field/.env.example` olarak commit'lenebilir konumdadır.
3. **AK-5.3 — GIVEN** `package.json` `dev:container` script'i **WHEN** T-22 uygulanır **THEN** script `deployment/v1/dev/container/...` yollarını kullanır ve hedef dosya mevcuttur.
4. **AK-5.4 — GIVEN** `.gitignore` kök istisnaları **WHEN** T-21 uygulanır **THEN** `git check-ignore` gerçek `.env`'i yok sayar, `.env.example`'ı izler.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Gerçek env'ler compose yanında, kökte artık yok | gözle | ⬜ |
| AK-5.2 | Şablonlar `.env.example` olarak app klasörlerinde | gözle | ⬜ |
| AK-5.3 | Script yolları yeni yapıya hizalı ve hedefler mevcut | kod inceleme | ⬜ |
| AK-5.4 | gitignore davranışı doğru (ignore/izin) | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-19: Kök gerçek `.env.*` dosyalarını ilgili `<proje>/<tier>/<app>/.env` konumlarına taşı/böl
- [ ] T-20: `.env.*.example` şablonlarını `.env.example` olarak tier klasörlerine yerleştir
- [ ] T-21: `.gitignore` kök istisnalarını temizle
- [ ] T-22: `package.json` tüm deployment script yollarını güncelle
- [ ] T-23: `dev:field-web-service` `DEVICE_CONFIG_DIR` yolunu güncelle

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Birleşik aws-edge env'i ikiye bölünürken değişken paylaşımı | İlgili değişken her iki `.env`'e kopyalanır; eksik değişken bırakılmaz |
| Script hedefi taşımada bozulursa | `docker compose config` ile doğrulanır, kırık script bırakılmaz |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/.env.*` / `.env.*.example` | Taşıma/bölme |
| `deployment/<proje>/<tier>/<app>/.env(.example)` | Yeni konum |
| `package.json#scripts` | Yol güncelleme |
| `.gitignore` | İstisna sadeleştirme |

### 6.6 UC-6 — demo-backend kaldırma ve doküman taraması

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: `apps/demo-backend` + `deployment/dev/demo-backend` silinmesi, kod/doküman referanslarının temizlenmesi, kalan `deployment/...` yol referanslarının güncellenmesi, final kapsülleme denetimi
- hariç: `demo-field` uygulaması (v2, aktif kalır)

**Akış:**
1. demo-backend uygulaması ve deployment klasörü silinir; workspace referansı kaldırılır.
2. Repo genelinde kalan `deployment/dev|prod|aws|office` yol referansları yeni yapıya güncellenir.
3. Çapraz referans grep denetimi ve compose doğrulama sweep'i yapılır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | System MUST `apps/demo-backend` ve `deployment/dev/demo-backend`'i siler | AK-6.1 |
| FR-6.2 | System MUST demo-backend kod referanslarını (`vitest.workspace.ts`, eslint plugin, shared-utils yorumu) temizler | AK-6.2 |
| FR-6.3 | System MUST dokümanlardaki `deployment/...` yollarını mekanik olarak günceller | AK-6.3 |
| FR-6.4 | System MUST görev sonunda kalan cross-ref + `demo-backend` referansı denetimini çalıştırır | AK-6.4 |

**Kabul Senaryoları (GWT):**
1. **AK-6.1 — GIVEN** `apps/demo-backend` ve `deployment/dev/demo-backend` mevcut **WHEN** T-24 uygulanır **THEN** her iki dizin ağaçtan kaldırılmıştır.
2. **AK-6.2 — GIVEN** `vitest.workspace.ts`, `no-raw-console-log.ts`, `shared-utils` yorumu **WHEN** T-25 uygulanır **THEN** hiçbirinde `demo-backend` geçmez.
3. **AK-6.3 — GIVEN** `README.md`, `docs/process/AWS-DEPLOYMENT.md`, `AGENTS-INFRA.md` **WHEN** T-27/T-28 uygulanır **THEN** belirtilen deployment yolları yeni yapıya işaret eder.
4. **AK-6.4 — GIVEN** görev tamamlandı **WHEN** T-29 çalıştırılır **THEN** `deployment/` altında kural-dışı `../` config/compose/env referansı ve `demo-backend` referansı bulunmaz.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | demo-backend app + deployment yok | gözle | ⬜ |
| AK-6.2 | Kod referansları temiz | kod inceleme | ⬜ |
| AK-6.3 | Doküman yolları güncel | gözle | ⬜ |
| AK-6.4 | Final denetim temiz | e2e | ⬜ |

**T Görev Listesi:**
- [ ] T-24: `deployment/dev/demo-backend` ve `apps/demo-backend` sil
- [ ] T-25: `vitest.workspace.ts` + eslint-plugin + shared-utils referanslarını temizle
- [ ] T-26: `AGENTS.md` quick commands demo-backend satırını kaldır
- [ ] T-27: `README.md` + `docs/process/AWS-DEPLOYMENT.md` + `AGENTS-INFRA.md` yollarını güncelle
- [ ] T-28: Repo geneli `deployment/...` yol referanslarını mekanik tara ve güncelle
- [ ] T-29: Kapsülleme ihlali + `demo-backend` + `docker compose config` final denetimini çalıştır

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Bir doküman tarihsel kayıt niteliğinde | Yol güncellemesi yapılır ama içerik anlatımı korunur |
| `demo-backend` başka testte referanslıysa | Sadece referans temizlenir; ilgisiz test silinmez |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-backend/**` | Silinir |
| `deployment/dev/demo-backend/**` | Silinir |
| `vitest.workspace.ts` | Girdi kaldırma |
| `packages/eslint-plugin-energy/src/rules/no-raw-console-log.ts#BACKEND_SERVICE_DIRS` | Değer güncelleme |
| `packages/shared-utils/src/config/types.ts` | Yorum güncelleme |
| `README.md`, `docs/process/AWS-DEPLOYMENT.md`, `AGENTS-INFRA.md`, `AGENTS.md` | Yol güncelleme |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Taşıma öncesi | Mevcut ağaç referans alınır; `git status` temiz başlangıç doğrulanır |
| Taşıma sırası | Dosyalar `git mv` ile taşınır (tarihçe korunur); hedefte çakışma reddedilir |
| Taşıma sonrası | Her compose `docker compose config` ile doğrulanır; kırık yol bırakılmaz |
| Env bölme | Birleşik env ikiye ayrılırken ilgili değişkenler her iki dosyaya eksiksiz kopyalanır |
| Doğrulama hatası (beklenen) | Eksik hedef konum / geçersiz yol → hata bildirilir, görev durur, düzeltilir |
| Doğrulama hatası (beklenmeyen) | `docker compose config` parse hatası → `DomainError`/görev blokajı olarak raporlanır |
| Kısmi taşıma | Ara durumda eski+yeni yol karışık bırakılmaz; UC tamamlanana kadar iş sürer |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | `deployment/` altında app klasörleri arası `../` config/compose/env referansı **0** | grep denetimi (T-29) |
| SC-2 | Tüm `deployment/**/docker-compose.yml` `docker compose config` ile geçerli | T-13, T-18, T-29 |
| SC-3 | `package.json` deployment script'lerinin hedef dosyaları mevcut | script hedef kontrolü |
| SC-4 | Repoda `demo-backend` referansı **0** | grep denetimi (T-29) |
| SC-5 | `AGENTS-DEPLOYMENT.md` mevcut ve `AGENTS.md` tablosunda kayıtlı | gözle (T-1, T-2) |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman (onay bekliyor) |
| 2. JSDoc | N/A (kod modülü değil; yol/kural sözleşmeleri §5 Purity + §7 ile yazılı) |
| 3. TEST | `docker compose config` doğrulamaları + cross-ref/demo-backend grep denetim script'leri |
| 4. IMPL | T-1 … T-29 taşıma/güncelleme görevleri |
| 5. KAPANIŞ | `DEPLOYMENT-KLASOR-YAPISI-KAPANIS.md` (Doğrulama + Test Kapsamı) |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A-1 | Kapsülleme ihlalini CI'da yakalayan otomatik lint script'i | §11 ileri iş; SC-1 grep denetimi manuel kalır |
| A-2 | `configs/` kökünün kopyalama kaynağı olarak kalıcı rolü | K-5 ile kabul edildi; senkronizasyon otomasyonu ileri iş |
| A-3 | Gerçek proje isimlerine (polatlı-ges vb.) geçiş | Prod aşamasında ayrı paket |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. `deployment/` kapsülleme ihlalini denetleyen otomatik lint/CI kapısı (A-1).
2. `configs/` → tier app klasörleri kopyalama senkronizasyon aracı (A-2).
3. Gerçek müşteri projesi klasörlerine migrasyon rehberi (A-3).

## 12. T Görev Özeti

| Kod | Görev | UC |
|:----|:------|:---|
| T-1 | `AGENTS-DEPLOYMENT.md` kapsülleme + env + Dockerfile istisnası kurallarıyla oluştur | UC-1 |
| T-2 | `AGENTS.md` referans tablosuna `AGENTS-DEPLOYMENT.md` satırı ekle | UC-1 |
| T-3 | `AGENTS.md` "Docker / deployment" bölümünü yeni yapıya göre güncelle | UC-1 |
| T-4 | v1 iskeleti + `dev/prod/{container,field,boss}` taşı (git mv) | UC-2 |
| T-5 | `office/container` → `v1/office/container` taşı | UC-2 |
| T-6 | `office/boss` + `office/field` artıklarını sil | UC-2 |
| T-7 | `customer-plugins` → `v1/common/customer-plugins` taşı | UC-2 |
| T-8 | dev/prod/aws boss compose `customer-plugins` mount yolarını güncelle | UC-2 |
| T-9 | `aws/edge` compose'unu container/field olarak ikiye böl | UC-3 |
| T-10 | Ortak external network tanımını iki compose'a işle | UC-3 |
| T-11 | `container-*`/`field-*` config dizinlerini `device-configs|maneuvers|rules` olarak yeniden adlandır | UC-3 |
| T-12 | nginx conf'larını container/field app klasörlerine böl | UC-3 |
| T-13 | `v1/aws/{container,field}` compose'larını `docker compose config` ile doğrula | UC-3 |
| T-14 | v2 iskeleti + demo-edge klasörlerini taşı | UC-4 |
| T-15 | v2 compose `../container`/`../field` referanslarını kaldır; her app'e kendi config kopyasını koy | UC-4 |
| T-16 | v2 dev + aws birleşik compose'larını container/field olarak böl | UC-4 |
| T-17 | v2 aws nginx conf'larını app klasörlerine böl | UC-4 |
| T-18 | v2 compose'larını `docker compose config` ile doğrula | UC-4 |
| T-19 | Kök gerçek `.env.*` dosyalarını ilgili `<proje>/<tier>/<app>/.env` konumlarına taşı/böl | UC-5 |
| T-20 | `.env.*.example` şablonlarını `.env.example` olarak tier klasörlerine yerleştir | UC-5 |
| T-21 | `.gitignore` kök istisnalarını temizle | UC-5 |
| T-22 | `package.json` tüm deployment script yollarını güncelle | UC-5 |
| T-23 | `dev:field-web-service` `DEVICE_CONFIG_DIR` yolunu güncelle | UC-5 |
| T-24 | `deployment/dev/demo-backend` ve `apps/demo-backend` sil | UC-6 |
| T-25 | `vitest.workspace.ts` + eslint-plugin + shared-utils referanslarını temizle | UC-6 |
| T-26 | `AGENTS.md` quick commands demo-backend satırını kaldır | UC-6 |
| T-27 | `README.md` + `docs/process/AWS-DEPLOYMENT.md` + `AGENTS-INFRA.md` yollarını güncelle | UC-6 |
| T-28 | Repo geneli `deployment/...` yol referanslarını mekanik tara ve güncelle | UC-6 |
| T-29 | Kapsülleme ihlali + `demo-backend` + `docker compose config` final denetimini çalıştır | UC-6 |
