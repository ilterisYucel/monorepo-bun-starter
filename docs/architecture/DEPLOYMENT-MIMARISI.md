---
status: active
space: architecture
tags: [mimari, deployment, compose, env, spec]
review_date: 2026-11-10
---

# Deployment — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `AGENTS-DEPLOYMENT.md` (kural referansı), `TELEMETRI-ZINCIRI-MIMARISI.md` (device-configs), `KOMUT-MANEVRA-OPERASYON-MIMARISI.md` (maneuvers), `MANAGEMENT-SERVICE-MIMARISI.md` (rules), `INTEGRATION-SERVICE-MIMARISI.md` (customer-plugins).

## 1. Amaç ve Bağlam

Deployment katmanı: proje/tier/app bazlı klasör yapısı, compose dosyaları, env sözleşmesi, site config kapsülleme (device-configs/maneuvers/rules/plugins), imaj/build bağlamları ve sim-lab/EMS export. Ürün katmanıdır — servis `deployment/` dizinleri yalnız örnek taşır.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Klasör düzeni, compose, env dosyası sözleşmesi, config kapsülleme, imaj bağlamları, sim-lab export |
| hariç | Servis içi config semantiği (birim SPEC'leri), CI pipeline (İleri İş) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Compose = ürün katmanı: `deployment/<proje>/<tier>/<app>/docker-compose.yml` (bugün `deployment/v2/dev/{container,container2,field}`) | Tier/app başına tek compose |
| K2 | Site config'leri compose'un YANINDA: `device-configs/`, `maneuvers/`, `rules/`, `plugins/` | Config ile compose aynı kapsülde |
| K3 | Env dosyası ilgili app klasöründe compose'un yanında yaşar (`deployment/<proje>/<tier>/<app>/.env`, gitignore'lu); her `docker compose` çağrısı `--env-file` ile geçer; commit'lenen tek şablon `.env.example` (sır yok) | Sır repo'ya girmez |
| K4 | Servis `deployment/` dizinleri yalnız ÖRNEK taşır (ör. `services/device-service/deployment/sample-config/`) | Ürün config'i deployment'ta |
| K5 | Kapsülleme: tier/app dosyasına ait olmayan alan YAZILMAZ; iki tarafta aynı olması gereken değer (ör. `HUB_PEER_TOKEN`) her iki dosyada aynı değerle yaşar | Sorumluluk net |
| K6 | Müşteri plugin'leri `deployment/<proje>/common/customer-plugins/` → integration-service'e runtime mount | Kod değişikliği olmadan eklenti |
| K7 | İmajlar: backend `services/*/deployment/` (prod) + `Dockerfile.dev` (hot-reload); web `apps/*/deployment/` | Tutarlı build |
| K8 | Sim-Lab/EMS export `deployment/simlab/<site>/` (config + compose overlay); `deviceId` korunur | Demo stack kurulumu |
| K9 | Config tüketicileri: `device-configs` → TELEMETRI-ZINCIRI, `maneuvers/operations` → KOMUT-MANEVRA, `rules` → MANAGEMENT-SERVICE, `plugins` → INTEGRATION-SERVICE | Tek sahip prensibi |
| K10 | Boss tier deployment'ı HENÜZ YOK (`SERVICE_TIER: boss` hiçbir compose'da değil) — bilinen boşluk | İleri İş |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Boss tier compose'u yok; boss birimleri kod+test var, çalışan ortam yok | `deployment/v2/dev/` |
| B2 | Örnek plugin config'inde düz metin credential (T-18 ile düzeltilecek) | `services/integration-service/config/plugins/` |
| B3 | Eski `DEPLOYMENT-KLASOR-YAPISI-*` dokümanları deprecated'ta; güncel kural AGENTS-DEPLOYMENT + bu SPEC | `docs/architecture/deprecated/` |

## 4. Mimari

```text
deployment/
├── v2/dev/
│   ├── container/   (compose + .env + device-configs/ + maneuvers/ + rules/)
│   ├── container2/  (aynı düzen)
│   └── field/       (compose + .env + device-configs/ + maneuvers/ + rules/ + plugins?)
├── v2/common/customer-plugins/     ← integration-service mount
└── simlab/<site>/                  ← sim-lab export (config + overlay)

services/*/deployment/{Dockerfile,Dockerfile.dev,sample-config/}
apps/*/deployment/{Dockerfile,Dockerfile.dev}
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `deployment/v2/dev/<tier>/docker-compose.yml` | Tier compose |
| `deployment/v2/dev/<tier>/.env.example` | Env şablonu |
| `deployment/v2/dev/<tier>/device-configs/` | Cihaz config'leri |
| `deployment/v2/dev/<tier>/maneuvers/` | Manevra/operasyon katalogları |
| `deployment/v2/dev/<tier>/rules/` | Otomasyon kuralları |
| `deployment/v2/common/customer-plugins/` | Müşteri plugin'leri |

## 5. Purity Kuralları (ZORUNLU)

1. Ürün config'i deployment'ta; servis dizininde yalnız örnek (K4).
2. Env dosyası app klasöründe; repo'da yalnız `.env.example` (K3).
3. Kapsülleme: dosyaya ait olmayan alan yazılmaz (K5).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Tier/App Compose Düzeni

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: klasör yapısı, compose isimleri, servisler, ağlar
- hariç: imaj build detayı (UC-4)

**Akış:**
1. Tier/app klasörü oluşturulur.
2. Compose + env + config dizinleri yerleştirilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Her tier/app için tek compose ve yanında config dizinleri bulunur | AK-1.1 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** yeni tier **WHEN** kurulur **THEN** compose + .env.example + config dizinleri birlikte gelir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Düzen | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıtını (dizin düzeni) eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Aynı değer iki dosyada | K5 kapsülleme |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `deployment/v2/dev/*/docker-compose.yml` | Compose |

### 6.2 UC-2 — Env Dosyası Sözleşmesi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: .env konumu, --env-file, .env.example, sır yasağı
- hariç: secret dağıtımı (İleri İş)

**Akış:**
1. `.env` app klasöründe oluşturulur (gitignore).
2. Compose `--env-file` ile çağrılır.
3. `.env.example` şablon olarak commit'lenir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Repo'da sır içeren `.env` yok; yalnız `.env.example` | AK-2.1 |
| FR-2.2 | Tüm compose çağrıları ilgili `--env-file` ile yapılır | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** repo **WHEN** `.env` aranır **THEN** yalnız `.env.example` bulunur
2. **AK-2.2 — GIVEN** script **WHEN** compose çağrılır **THEN** `--env-file` geçilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Sır yok | komut | ⬜ |
| AK-2.2 | Env-file | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıtını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Eksik env | Compose hata verir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `deployment/v2/dev/*/.env.example` | Şablon |

### 6.3 UC-3 — Site Config Kapsülleme

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: device-configs/maneuvers/rules/plugins dizinleri, tüketici eşlemesi, kapsülleme
- hariç: config semantiği (birim SPEC'leri)

**Akış:**
1. Config dosyaları tier klasöründe yaşar.
2. İlgili servis mount eder.
3. Kapsülleme kuralı uygulanır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Config dosyaları compose'un yanında ve tek kapsülde yaşar | AK-3.1 |
| FR-3.2 | Müşteri plugin'leri common/customer-plugins altında mount edilir | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** tier klasörü **WHEN** config aranır **THEN** compose yanında bulunur
2. **AK-3.2 — GIVEN** müşteri plugin'i **WHEN** integration-service başlar **THEN** runtime dizinden yüklenir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Kapsül | gözle | ⬜ |
| AK-3.2 | Mount | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıtını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Tier'a özgü kural | Yalnız o tier'da |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `deployment/v2/dev/*/{device-configs,maneuvers,rules}` | Config |
| `deployment/v2/common/customer-plugins/` | Plugin'ler |

### 6.4 UC-4 — İmaj ve Build Bağlamları

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: Dockerfile konumları, monorepo kök bağlamı, çok aşamalı build
- hariç: CI build cache

**Akış:**
1. Backend imajı servis Dockerfile'ından kök bağlamla build edilir.
2. Web imajı app Dockerfile'ından build edilir.
3. Hub/agent imajları zero-trust klasöründen build edilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Tüm imajlar repo'daki Dockerfile'lardan, belgelenmiş bağlamla build edilir | AK-4.1 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** imaj build **WHEN** Dockerfile yolu **THEN** `services/*/deployment` veya `apps/*/deployment` altındadır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Dockerfile yeri | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıtını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Taşınan paket (zero-trust) | Bağlam güncel (T-3) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/*/deployment/Dockerfile` | Backend |
| `apps/*/deployment/Dockerfile` | Web |
| `zero-trust-application-tunnel/*/Dockerfile` | Tunnel |

### 6.5 UC-5 — Sim-Lab / EMS Export

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `deployment/simlab/<site>/` çıktısı, compose overlay, deviceId korunumu
- hariç: simülatör modeli (SIMULATORS)

**Akış:**
1. `exportEmsConfigs` çıktısı yazılır.
2. Overlay ile demo stack ayağa kalkar.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Export host/port değiştirir, `deviceId` korunur | AK-5.1 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** site spec **WHEN** export **THEN** config'ler `deployment/simlab/<site>/` altındadır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Export | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-5: UC-5 kanıtını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Dizin yok | Oluşturulur |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `deployment/simlab/<site>/` | Export |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Eksik env | Compose hatası |
| Config eksik | Servis fail-fast (birim SPEC) |
| Boss tier | Yok (K10) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Repo'da sır içeren env yok | komut |
| SC-2 | Config kapsülleme korunur | gözle |
| SC-3 | İmaj bağlamları belgeli | gözle |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — compose/env doğrulaması |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-5 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `DEPLOYMENT-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Boss tier compose'u (B1) | İleri İş |
| A2 | Secret dağıtım stratejisi (vault/env) | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Boss tier deployment (A1).
2. Secret yönetimi (A2).
3. CI build cache optimizasyonu.

## 12. T Görev Özeti

| T-1 | UC-1 (compose düzeni) kanıtının eşleştirilmesi |
| T-2 | UC-2 (env sözleşmesi) kanıtının eşleştirilmesi |
| T-3 | UC-3 (config kapsülleme) kanıtının eşleştirilmesi |
| T-4 | UC-4 (imaj bağlamları) kanıtının eşleştirilmesi |
| T-5 | UC-5 (sim-lab export) kanıtının eşleştirilmesi |
