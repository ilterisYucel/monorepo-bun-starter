---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, deployment, compose, env]
review_date: 2026-11-10
---

# Deployment — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [DEPLOYMENT-MIMARISI.md](./DEPLOYMENT-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Doğrulama + bu turun gerçek compose/env değişiklikleri (zero-trust mount taşınması, `{env}` EPIAS hattı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `deployment/v2/dev/{container,container2,field}/docker-compose.yml` | (değişiklik) ws-tunnel volume mount yolu `packages/ws-tunnel` → `zero-trust-application-tunnel/ws-tunnel` — paket taşınmasıyla senkron | UC-4 edge "taşınan paket bağlamı güncel (T-3)" |
| 2 | `deployment/v2/dev/site/docker-compose.yml` | (değişiklik) integration-service'e `EPIAS_USERNAME/PASSWORD: ${...:-}` env hattı | K3/FR-2.1 (T-18) |
| 3 | `deployment/v2/dev/site/.env.example` | (değişiklik) `EPIAS_USERNAME=/EPIAS_PASSWORD=` boş şablon satırları — sır yok | K3 |
| 4 | Tier düzeni | (doğrulama) `v2/dev/{container,container2,field}`; her tier'da compose + `.env(.example)` + `device-configs/ maneuvers/ rules/` (+plugins, nginx, topology.json ekleri) | K1/K2/FR-1.1, FR-3.1 |
| 5 | Env hijyeni | (doğrulama) `.gitignore`: `.env`, `.env.*`, `!.env.example`, `deployment/**/.env`; diskte `field/.env` var ama takipsiz (git status dışı) | K3/FR-2.1 |
| 6 | Scriptler | (doğrulama) `start/dev:stack:down` üç compose'u da `--env-file` ile çağırıyor | FR-2.2/AK-2.2 |
| 7 | `deployment/v2/common/customer-plugins/` | (SAPMA) DİZİN YOK; compose `INTEGRATION_PLUGIN_DIR=/app/customer-plugins` setting eder ama bu yere volume mount'lanmıyor → runtime dizin yükleme fiilen boş | K6/FR-3.2 — S1 |
| 8 | `deployment/simlab/` | (SAPMA) yok — export KODDA (ems-export) ama çıktı artifacts'ı henüz üretilmemiş | K8/UC-5 — S2 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Yapı doğrulaması | dizin okumaları + grep | A.1 #4–6 ✓ |
| Sır taraması | gitignore kuralları + git status | `.env` takipsiz ✓; `.env.example` boş şablon ✓ |
| Compose diffs | `git diff -- deployment/` | 3 dosya; mount taşıma + env hattı; başkaca değişiklik yok |
| E2E | `bun run test:e2e` | bu kapanışta KOŞULMADI (docker stack gerektirir) — G1 |
| Mutasyon | — | compose/yml üretim .ts değil — uygulanmaz |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt | Durum |
|:----|:--------------------|:------|:------|
| AK-1.1 | compose + .env.example + config dizinleri bir arada | gözle: 3/3 tier | 🟢 |
| AK-2.1 | repo'da sır içeren .env yok | gitignore + `.env.example` boş; taze secret-scan koşusu yapılmadı | 🟡 |
| AK-2.2 | her compose çağrısı `--env-file` | package.json scriptleri | 🟢 |
| AK-3.1 | config'ler compose'un yanında tek kapsül | tier dizinleri | 🟢 |
| AK-3.2 | müşteri plugin mount'u | **implemente DEĞİL** (S1) | 🟡 |
| AK-4.1 | Dockerfile konumları (`services/*/deployment`, `apps/*/deployment`, zero-trust) | compose build satırları + dosya varlığı | 🟢 |
| AK-5.1 | simlab export çıktısı | diskte çıktı yok (S2); koda kanıt = SIMULATORS plant.test | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | `common/customer-plugins` yok + mount yok | K6/§4.2 ağacı gerçekte eksik; INTEGRATION `DirectoryPluginSource` boş dizin görür → müşteri plugin akışı uçtan uca KURULU DEĞİL (kod hazır, wiring eksik). Kompose'a `- ../../common/customer-plugins:/app/customer-plugins:ro` (veya tier-altı dizin) ek işi; karar developer |
| S2 | `deployment/simlab/` çıktısı yok | Export komutunun bir kez koşulması üretim dosyalarını getirir — İleri İş #1 (demo stack) |
| S3 | Boss tier compose yok | K10 "bilinen boşluk" — SPEC ile uyumlu, sapma DEĞİL (B1) |
| S4 | `${VAR:-}` boş-default | env tanımsızsa compose sessiz boş geçer — EPIAS-CLIENT S3 zinciriyle aynı "fail-hızlı değil" davranışı; karar tek yerde verilmeli |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1: ürün config'leri deployment'ta; servis `deployment/` yalnız örnek/Dockerfile
- [x] Purity 3: `HUB_PEER_TOKEN` iki tarafta aynı değer deseni korunuyor (container↔field `.env.example` satırları)
- [x] K5: tier'a ait olmayan alan yazılmamış (compose diff'leri hedef dosyaya ait satırlarla sınırlı)

### A.6 Genel Durum Özeti

**MODÜL UYGUN — iki wiring boşluğuyla:** env/sır sözleşmesi ve tier kapsüllemesi sağlam; K6 müşteri-plugin mount'u ile K8 simlab çıktısı henüz fiziksel değil (S1/S2). **NIS-2:** K3 sır sözleşmesi bu modülün güvenlik AK'sıdır ve tutuluyor; S4 (boş env default'u) zincir kararına bağlı. Compose değişiklikleri bu turda davranıştır ama yaml test kapsamı dışı — E2E (G1) tek anlamlı kanıt.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi

| Durum | Koşul | Beklenen (THEN) | Kanıt ref'i |
|:------|:------|:----------------|:------------|
| Yeni tier | kurulur | compose+env+config bir arada | A.2 gözle |
| Repo | `.env` taranır | yalnız `.env.example` | A.2 |
| Script | compose çağrısı | `--env-file` geçer | package.json |
| Müşteri plugin | host başlar | dizinden yüklenir | **KAPSANMAYAN** (S1) |
| Export | koşar | simlab/<site>/ + deviceId sabit | SIMULATORS plant.test (kod); çıktı yok (S2) |
| ws-tunnel mount | container başlat | güncel yoldan bind | compose diff (runtime E2E G1) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Stack'li E2E/compose smoke bu turda koşulmadı | Orta — mount yolu yanlışsa container sessiz eski kodu görür | `bun run test:e2e` veya `dev:stack:up` smoke |
| G2 | customer-plugins wiring + örnek plugin ile uç-uca test (S1) | Orta | INTEGRATION A1 rehberiyle birlikte |
| G3 | Secret-scan'ın komut kanıtı (gitleaks vb.) yok | Düşük-orta | İleri İş A2 (secret yönetimi) |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: compose/env turu doğrulandı; S1 customer-plugins wiring + S2 simlab çıktı boşlukları raporlandı | (yok — SPEC değişmedi) |
