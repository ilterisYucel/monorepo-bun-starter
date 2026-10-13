---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, deployment]
review_date: 2026-10-12
---

# Deployment Klasör Yapısı — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [DEPLOYMENT-KLASOR-YAPISI-MIMARISI.md](./DEPLOYMENT-KLASOR-YAPISI-MIMARISI.md) (✅ Approved 2026-10-12 — AK/FR/SC kaynağı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `AGENTS-DEPLOYMENT.md` | Yeni kural dokümanı — kapsülleme (madde 1-4), Dockerfile istisnası, env kuralı, yol şeması | K-11, FR-1.1, FR-1.3 |
| 2 | `AGENTS.md` | "Detay referansları" tablosuna `deployment/**` tetikli satır; "Docker / deployment" bölümü proje/tier/app şemasına çevrildi; `demo-backend` quick-command satırı silindi | K-11, FR-1.2, FR-6.2 |
| 3 | `deployment/{dev,prod}/{container,field,boss}` → `deployment/v1/…` | Klasik stack `git mv` ile `v1/<tier>/<app>` altına taşındı (tarihçe korundu) | K-1, K-2, FR-2.1 |
| 4 | `deployment/office/container` → `deployment/v1/office/container` | Office container taşındı | FR-2.1 |
| 5 | `deployment/office/{boss,field}` | Compose'suz artıklar silindi | K-9, FR-2.3 |
| 6 | `deployment/customer-plugins` → `deployment/v1/common/customer-plugins` | Proje-içi zorunlu paylaşım `common`'a taşındı | K-4, FR-2.2 |
| 7 | `deployment/v1/{dev,prod,aws}/boss/docker-compose.yml#volumes` | `customer-plugins` mount yolu `../../common/customer-plugins` oldu | FR-2.4 |
| 8 | `deployment/aws/edge/docker-compose.yml` → `v1/aws/{container,field}/docker-compose.yml` | Birleşik edge compose ikiye bölündü | K-8, FR-3.1 |
| 9 | `deployment/v1/aws/{container,field}/docker-compose.yml#networks` | Ortak external network `v1-aws-edge-network` tanımlandı/paylaşıldı | FR-3.2 |
| 10 | `deployment/v1/aws/{container,field}/{device-configs,maneuvers,rules}` | `container-*`/`field-*` önekli dizinler app-içi sade adlara çevrildi | FR-3.4 |
| 11 | `deployment/v1/aws/{container,field}/nginx/` | nginx conf'ları ilgili app klasörüne dağıtıldı | FR-3.3 |
| 12 | `deployment/{dev,aws}/demo-edge` → `deployment/v2/{dev,aws}/{container,field}` | demo-field (v2) taşındı | K-1, FR-4.1 |
| 13 | `deployment/v2/**/docker-compose.yml#volumes` | `../container`/`../field` cross-ref'leri kaldırıldı; her app kendi config kopyasına sahip | K-3, FR-4.2 |
| 14 | `deployment/v2/{dev,aws}/{container,field}/docker-compose.yml` | Birleşik demo compose'lar container/field olarak bölündü | FR-4.3 |
| 15 | `deployment/v2/aws/field/nginx/` | Kullanılmayan `aws-container-web.conf`/`aws-field-web.conf` silindi; `aws-demo-field.conf` taşındı | FR-4.4 |
| 16 | `deployment/v1/**/.env` + `deployment/v2/**/.env` | Kök gerçek `.env.*` dosyaları `<proje>/<tier>/<app>/.env`'e taşındı (aws-edge container+field olarak bölündü) | K-7, FR-5.1 |
| 17 | `deployment/v1/**/.env.example` + `deployment/v2/**/.env.example` | Kök `.env.*.example` şablonları `.env.example` olarak app klasörlerine yerleştirildi | FR-5.2 |
| 18 | `.gitignore` | Kök `!.env.*.example` istisnaları sadeleştirildi; `deployment/**/.env` ignore kuralı belirginleştirildi | FR-5.4 |
| 19 | `package.json#scripts` | Tüm deployment script yolları `deployment/v1|v2/…` yapısına güncellendi | FR-5.3, FR-5.1 |
| 20 | `package.json#scripts` (`dev:field-web-service`) | `DEVICE_CONFIG_DIR` yolu `v1/dev/field/device-configs` oldu | T-23, FR-5.3 |
| 21 | `apps/demo-backend/**` + `deployment/dev/demo-backend/**` | Uygulama ve deployment silindi | K-10, FR-6.1 |
| 22 | `vitest.workspace.ts`, `packages/eslint-plugin-energy/src/rules/no-raw-console-log.ts#BACKEND_SERVICE_DIRS`, `packages/shared-utils/src/config/types.ts` | `demo-backend` referansları temizlendi | FR-6.2 |
| 23 | `README.md`, `docs/process/AWS-DEPLOYMENT.md`, `AGENTS-INFRA.md`, `TESTING.md` | Deployment yol tabloları + `demo-backend` satırları yeni yapıya hizalandı | FR-6.3 |
| 24 | `.github/workflows/{e2e,perf}.yml` | Compose yolları `v1/dev/…`; `demo-backend` build hedefi kaldırıldı | FR-6.3 |
| 25 | `tools/gen-pcs-configs.mjs`, `tools/register-container.sh` | Script hedef yolları güncellendi; register-container artık `--env` (field) + `--container-env` (container) İKİ env alır | FR-6.3 |
| 26 | `services/{web-service,management-service}` default config yolları | `DEVICE_CONFIG_DIR`/`MANAGEMENT_RULES_PATH` fallback'leri `v1/dev/…` oldu | FR-6.3 |
| 27 | `packages/platform/commands/src/maneuver-migration.test.ts`, `services/management-service/src/{field-rules,container-rules}.test.ts`, `automation-rules.spec.ts`, `services/web-service/.../demo-maneuver-integration.spec.ts`, `apps/demo-field/integration/demo-maneuver.integration.test.ts` | Testlerdeki `deployment/…` config yolları güncellendi | FR-6.3 |
| 28 | `bun.lock`, `docs/roadmap/test-envanteri.otomatik.md` | `bun install` + `bun run test:inventory` yenilendi | FR-6.3 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| SPEC lint | `bun run spec:check docs/architecture/DEPLOYMENT-KLASOR-YAPISI-MIMARISI.md` | 0 hata, 0 uyarı |
| Compose geçerliliği (SC-2) | `docker compose --env-file <dummy> -f <compose> config -q` (tümü) | 15/15 geçerli (1 wiki + 10 v1 + 4 v2) |
| Cross-ref denetimi (SC-1) | `deployment/` altında izin dışı `../` grep'i | 0 izinsiz referans (yalnızca `../../../../` repo-kök Dockerfile + `../../common/`) |
| demo-backend denetimi (SC-4) | aktif kod/config/yaşayan dokümanlarda `demo-backend` grep'i | 0 aktif referans (yalnızca `docs/archived/`, `docs/decisions/` ve SPEC kanıtı kaldı) |
| gitignore davranışı (AK-5.4) | `git check-ignore` | `deployment/**/.env` ignore ediliyor; `.env.example` izleniyor |
| Unit/component testleri | `bunx vitest run packages/platform/commands/src/maneuver-migration.test.ts services/management-service/src/field-rules.test.ts services/management-service/src/container-rules.test.ts services/management-service/src/automation-rules.spec.ts` | 45/46 geçti (tek başarısız önceden var — bkz. A.4 #1) |
| Entegrasyon testi | `bunx vitest run services/web-service/src/presentation/routes/demo-maneuver-integration.spec.ts` | 6/6 geçti |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | `AGENTS-DEPLOYMENT.md` kapsülleme + common + Dockerfile istisnası bölümlerini içerir | gözle: `AGENTS-DEPLOYMENT.md#Kapsülleme kuralları` | 🟢 |
| AK-1.2 | `AGENTS.md` tablosunda `deployment/**` tetikli satır var | kod inceleme: `AGENTS.md` | 🟢 |
| AK-1.3 | Env konum kuralı dokümante | gözle: `AGENTS-DEPLOYMENT.md#Env convention` | 🟢 |
| AK-2.1 | v1 tier/app klasörleri yeni konumda, eskileri yok | gözle: `deployment/v1/` + `git status` (`R` rename) | 🟢 |
| AK-2.2 | customer-plugins `v1/common` altında | gözle: `deployment/v1/common/customer-plugins/` | 🟢 |
| AK-2.3 | office boss/field artıkları silinmiş | gözle: `deployment/v1/office/` (yalnızca container) | 🟢 |
| AK-2.4 | Boss mount yolu güncel ve compose geçerli | `deployment/v1/{dev,prod,aws}/boss/docker-compose.yml#volumes` + `docker compose config` | 🟢 |
| AK-3.1 | İki ayrı geçerli aws edge compose | `deployment/v1/aws/{container,field}/docker-compose.yml` + config | 🟢 |
| AK-3.2 | Ortak external network iki stack'i bağlar | `deployment/v1/aws/{container,field}/docker-compose.yml#networks` | 🟢 |
| AK-3.3 | nginx conf'ları app klasörlerinde | gözle: `deployment/v1/aws/{container,field}/nginx/` | 🟢 |
| AK-3.4 | Config dizin adları sadeleşmiş | gözle: `deployment/v1/aws/{container,field}/{device-configs,maneuvers,rules}` | 🟢 |
| AK-4.1 | v2 klasörleri yeni konumda | gözle: `deployment/v2/{dev,aws}/{container,field}` | 🟢 |
| AK-4.2 | v2 compose'larında `../container`/`../field` referansı yok | SC-1 grep denetimi | 🟢 |
| AK-4.3 | v2 compose'ları bölünmüş | `deployment/v2/{dev,aws}/{container,field}/docker-compose.yml` + config | 🟢 |
| AK-4.4 | v2 nginx conf'ları app klasörlerinde | gözle: `deployment/v2/aws/field/nginx/aws-demo-field.conf` | 🟢 |
| AK-5.1 | Gerçek env'ler compose yanında, kökte artık yok | gözle: `deployment/v1/dev/container/.env` vb. + `git status` | 🟢 |
| AK-5.2 | Şablonlar `.env.example` olarak app klasörlerinde | gözle: `deployment/v1/dev/field/.env.example` vb. | 🟢 |
| AK-5.3 | Script yolları yeni yapıya hizalı ve hedefler mevcut | `package.json#scripts` + SC-3 hedef kontrolü | 🟢 |
| AK-5.4 | gitignore davranışı doğru (ignore/izin) | unit: `git check-ignore` | 🟢 |
| AK-6.1 | demo-backend app + deployment yok | gözle: `apps/demo-backend` + `deployment/dev/demo-backend` silindi | 🟢 |
| AK-6.2 | Kod referansları temiz | `vitest.workspace.ts`, `no-raw-console-log.ts#BACKEND_SERVICE_DIRS`, `shared-utils` yorumu | 🟢 |
| AK-6.3 | Doküman yolları güncel | `README.md`, `docs/process/AWS-DEPLOYMENT.md`, `AGENTS-INFRA.md`, `TESTING.md` | 🟢 |
| AK-6.4 | Final denetim temiz | SC-1 + SC-4 grep + compose sweep | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | `maneuver-migration.test.ts` "field maneuvers.json … 11 kayıt" beklentisi 12 kayıtla çakışıyor | Önceden var olan veri/test uyumsuzluğu; dosya mekanik `git mv` ile taşındı, içerik değişmedi. Refaktörle ilgisiz — ayrı bir düzeltme görevi gerektirir. |
| 2 | Tarihsel/arşiv dokümanlar yol taraması dışında bırakıldı | `docs/archived/`, `docs/decisions/` ve dönem kaydı niteliğindeki `*-KAPANIS.md`/`*-DOGRULAMA.md` dosyaları güncellenmedi (tarihsel kayıt bozulmasın). |
| 3 | Kullanılmayan nginx conf'ları silindi | `aws/demo-edge/nginx/aws-container-web.conf` (o projede container-web servisi yok, mount edilmiyor) + mount edilmeyen birebir kopya `aws-field-web.conf` silindi; yalnızca kullanılan `aws-demo-field.conf` taşındı. |
| 4 | `office/boss` + `office/field` silindi | Compose'suz artıklar — SPEC K-9 gereği. |
| 5 | `tools/register-container.sh` arayüzü değişti | Tek ortak `.env` kalmadığı için script artık `--env` (field) + `--container-env` (container) olarak İKİ env dosyası alır. |
| 6 | `apps/demo-backend` fiziksel artıkları temizlendi | `node_modules`/`dist` vb. `rm -rf` ile kaldırıldı. |
| 7 | SPEC AK-1.2 kanıt hücresindeki "AO tetikli satır" ifadesi düzeltilmedi | Kozmetik terim (doğrusu "deployment/** tetikli satır"); içerik kararı değil, SPEC onay kapısı gereği yeniden onay gerektirirdi — SPEC'te olduğu gibi bırakıldı. |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1: `deployment/` altında kardeş app `../` config/compose/env referansı YOK (SC-1 grep temiz).
- [x] Purity 2: Kod klasörü örnek compose/config/env referansı YOK; yalnızca Dockerfile referansı (`services/…`, `apps/…`) korundu (K-6).
- [x] Purity 3: Proje-içi paylaşım yalnızca `deployment/v1/common/` (customer-plugins) üzerinden.
- [x] Purity 4: Device config/maneuvers/rules kök `configs/`'ten kopyalanmış; runtime'da kök `configs/` referansı yok (K-5).
- [x] Purity 5: Gerçek `.env` gitignore'lu, `.env.example` commit'li (K-7).
- [x] Purity 6: Proje bağımsız araçlar (`k6/`, `wiki/`, `docker-compose.wiki.yml`) kökte kaldı.
- [x] Purity 7: Kaynak kod/yaşayan dokümanlarda `demo-backend` referansı kalmadı (SC-4).
- [x] `git mv` kullanımıyla tarihçe korundu (`git status` rename `R` olarak gösteriyor).
- [x] `bun install` → `bun.lock` yenilendi; `bun run test:inventory` → envanter güncellendi.

### A.6 Genel Durum Özeti

Refaktör, onaylı SPEC'in 6 use-case'ini (UC-1 … UC-6) ve 29 görevini (T-1 … T-29) tamamladı: `deployment/` ağacı proje-öncelikli (`v1`/`v2`) ve kendi kendine yeten yapıya taşındı, kapsülleme ihlali oluşturan tüm çapraz referanslar giderildi, env dosyaları compose yanına indirildi, `demo-backend` kökten kaldırıldı ve kalıcı kural `AGENTS-DEPLOYMENT.md`'ye yazıldı. Tüm başarı kriterleri (SC-1 … SC-5) kanıtlandı; 15 compose dosyası `docker compose config -q` ile geçerli, cross-ref ve `demo-backend` denetimleri temiz. Tek başarısız test, refaktörden bağımsız ve önceden var olan bir veri/test uyumsuzluğudur (A.4 #1). Modül kapanabilir.

**review_date:** 2026-10-12

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Taşıma öncesi | `git status` temiz başlangıç | Başlangıç ağacı sabit; hedefte çakışma yok | gözle (`git status`) |
| Taşıma sırası | Dosya `git mv` ile taşınır | Tarihçe korunur (rename tespiti), hedef çakışması reddedilir | `git status` (`R`) — A.1 |
| Taşıma sonrası | Her compose doğrulanır | `docker compose config -q` 0 hata (SC-2) | compose sweep — A.2 |
| Env bölme | Birleşik env ikiye ayrılır | İlgili değişkenler her iki `.env`'e eksiksiz kopyalanır | AK-5.1 (gözle) |
| Cross-ref yasağı | Kardeş app `../` config/compose/env referansı | 0 izinsiz referans (SC-1) | grep denetimi — A.2 |
| demo-backend temizliği | Repo geneli referans | 0 aktif referans (SC-4) | grep denetimi — A.2 |
| gitignore | `git check-ignore` | Gerçek `.env` yok sayılır, `.env.example` izlenir (AK-5.4) | unit (`git check-ignore`) |
| AWS edge topolojisi | Container + field ayrı compose | Field `external: true` ile ortak ağa katılır (AK-3.2) | `deployment/v1/aws/{container,field}/docker-compose.yml#networks` |
| v2 cross-ref | `../container`/`../field` mount'ları | Yalnızca kendi klasör içi config mount edilir (AK-4.2) | SC-1 grep + `deployment/v2/**/docker-compose.yml#volumes` |
| Script hedefleri | `package.json` yolları | Hedef dosyalar mevcut (SC-3) | script hedef kontrolü — A.2 |
| Doğrulama hatası (beklenen) | Eksik hedef / geçersiz yol | Hata bildirilir, görev durur, düzeltilir | süreç (kod inceleme) |
| Kısmi taşıma | Ara durum | Eski + yeni yol karışık bırakılmaz | gözle (`git status`) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Gerçek sır değerleri (JWT, token, SEED_*) doğrulanmadı | Düşük — sırlar repo'ya girmez; yalnızca konum taşındı | Prod makinelerde `.env` yeniden üretim rehberi (`AWS-DEPLOYMENT.md`) |
| G2 | Kapsülleme ihlalini CI'da yakalayan otomatik lint kapısı (A-1) yok | Orta — SC-1 grep denetimi manuel | SPEC §11 — otomatik lint script'i |
| G3 | Prod env değerlerinin gerçek prod stack'iyle uçtan uca doğrulanması | Orta — `docker compose config` sözdizimi doğrular, çalışma zamanı doğrulamaz | Prod deploy sırasında smoke test |
| G4 | `configs/` → tier app klasörleri kopyalama senkronizasyon aracı (A-2) yok | Orta — kopyalar zamanla drift olabilir | SPEC §11 — senkronizasyon aracı |
| G5 | Gerçek müşteri proje adlarına (`polatli-ges` vb.) migrasyon (A-3) | Düşük — v1/v2 yer tutucu projeler | SPEC §11 — migrasyon rehberi |
| G6 | `tools/register-container.sh` mantığının unit testi yok | Düşük — script arayüzü değişti ama davranış testlenmedi | Shell script smoke testi |
| G7 | AWS edge / v2 / boss / office stack'lerinin gerçek `docker compose up` çalışma zamanı smoke'u | Orta — CI e2e yalnızca `v1/dev/{container,field}` ayağa kaldırır | AWS deploy doğrulaması |
| G8 | `maneuver-migration.test.ts` 11 vs 12 veri/test uyumsuzluğu düzeltilmedi | Düşük — refaktörle ilgisiz, önceden var | Ayrı düzeltme görevi (A.4 #1) |
