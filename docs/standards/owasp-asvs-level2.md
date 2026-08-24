---
status: active
space: standards
tags: [asvs, owasp, guvenlik, standart]
review_date: 2026-08-24
---

# OWASP ASVS Level 2 — Geliştirme ve Doğrulama Rehberi

**Hedef standart:** OWASP ASVS (Application Security Verification Standard) v4.0.3 — **Level 2**
**Kapsam:** GD-PMS monorepo'nun tüm katmanları (backend servisler, web/desktop uygulamalar, paylaşılan paketler)
**Statü:** Geliştirme ve check süreçleri bu hedefe göre yürütülür.

---

## 1. Neden Level 2?

| Seviye | Tanım | GD-PMS için uygunluk |
|:-------|:------|:---------------------|
| L1 | Genel amaçlı, düşük riskli uygulamalar (penetrasyon testine dirençli minimum) | Yetersiz |
| **L2** | **Hassas veri/işlem içeren uygulamalar** — yetkin bir saldırgana karşı savunma | **Hedef** — enerji depolama kontrolü, kritik altyapı |
| L3 | Kritik, saldırganın derin kaynaklarla hedef aldığı sistemler | Gelecek hedef |

L2 kapsamı: **V1–V8 + V13 + V14** kategorileri (V9–V12 ek kategorilerdir; ileride L3 kapsamında değerlendirilir).

---

## 2. Doğrulama Yöntemleri

Her ASVS kategorisi aşağıdaki mekanizmalardan biriyle doğrulanır. **Tek bir mekanizma tüm ASVS'yi karşılamaz** — SAST (SonarQube) yalnızca otomatize edilebilen kuralları görür; kimlik doğrulama akışı, erişim kontrolü tasarımı ve iş mantığı manuel inceleme/pentest gerektirir.

| Mekanizma | Ne doğrular | Ne zaman | Kanıt nerede |
|:----------|:------------|:---------|:-------------|
| **SAST — SonarQube/SonarCloud** ("NIS2 Compliance - TypeScript" profili) | Hard-coded secret, injection pattern'leri, zayıf kripto, güvensiz log çağrıları | Her PR + release | SonarCloud UI, `sonar-project.properties`, `.github/workflows/sonar.yml` |
| **Birim/entegrasyon testleri (Vitest)** | Auth use-case'leri, RBAC, token yaşam döngüsü, zod şema doğrulama, komut validasyonu, log zinciri | Her PR (Nx test) | `*.test.ts`, TESTING.md §8.3 kapıları |
| **E2E güvenlik testleri (Playwright)** | Yetkisiz erişim girişimleri, audit log üretimi, security headers, health check | CI | `e2e/security/` (nis-2.md Adım 14) |
| **SBOM + bağımlılık taraması** | Tedarik zinciri (CVE) | Her build | CycloneDX + Trivy (nis-2.md Adım 13) |
| **Manuel kod/ tasarım incelemesi** | Tehdit modelleme, yetkilendirme matrisi, kripto kullanımı, iş mantığı | Yeni servis/özellik | SSDF (nis-2.md Adım 16) |
| **Bağımsız pentest** | SAST'in göremedikleri, iş mantığı zafiyetleri | Yılda 1 + büyük sürüm | Harici rapor (nis-2.md Adım 17) |

---

## 3. ASVS Kategori → Check Eşleme Matrisi

| ASVS | Kategori | Repo'daki karşılık | Otomatik check | Manuel check |
|:-----|:---------|:-------------------|:---------------|:-------------|
| **V1** | Mimari, Tasarım, Tehdit Modelleme | Hexagonal mimari; tünel/oturum tasarımı (`KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md`) | — | Tehdit modellemesi (her yeni servis/özellik), tasarım incelemesi |
| **V2** | Kimlik Doğrulama | JWT (jose) + bcrypt; login/refresh/logout use-case'leri; WS token auth | Unit/integration: `LoginUseCase`, `TokenService`, `PasswordHasher`, `token-adapter` (≥%90 branch); SonarQube hard-coded secret | Parola politikası, hesap kilitleme, credential recovery akışı |
| **V3** | Oturum Yönetimi | JWT refresh (RealtimeProvider), WS bağlantı ömrü + dead-socket sweep, `ContainerSessionStore` + `session_audit`, kısa ömürlü container-JWT | Unit + E2E: token refresh, oturum limitleri, path allowlist | Session fixation/replay senaryoları (pentest) |
| **V4** | Erişim Kontrolü | RBAC middleware (admin/teknik/guest/boss), `fieldIds`, field→container rol eşlemesi, deny-by-default | Unit/integration: `rbac.ts` karakterizasyon testleri (Faz 1); Playwright yetkisiz erişim senaryoları | Erişim kontrol matrisi dokümanı + yıllık inceleme (iso-27001.md Adım 12) |
| **V5** | Girdi Doğrulama | Zod şemaları (`shared-types`), komut validasyonu (`device-service`), param sınırları (min/max) | Unit: tüm zod şemaları + `executeCommand` validasyon döngüsü; SonarQube injection kuralları | Fuzz (tunnel frame codec — Faz 3) |
| **V6** | Saklanan Kripto | bcrypt (parola), kendi kripto yok, `crypto.getRandomValues` (eslint `no-math-random` kuralı) | SonarQube zayıf kripto kuralları + ESLint | Kripto kullanım incelemesi; secret rotasyonu (JWT secret `.env`/CI secrets) |
| **V7** | Hata & Loglama | `DomainError` taksonomisi (Faz 0), `TamperEvidentLogger` (hash zinciri + imza), audit/security kanalı fail-closed, hatalarda iç yapı sızdırılmaz | Unit: `VerifyChain` (değişen satır → false), pipeline drop politikası; SonarQube ham `console.*` Blocker kuralı | Log inceleme; SIEM entegrasyonu |
| **V8** | Veri Koruma | Hassas veri minimizasyonu, DB'de parola yok (yalnızca bcrypt hash), backup şifreleme (GPG) | SonarQube hassas veri ifşası kuralları | **Bilinen açık:** JWT localStorage'da (README J4) — Faz sonrası httpOnly cookie'ye taşınacak; disk-at-rest şifreleme değerlendirmesi |
| **V13** | API & Web Service | REST (`auth-routes`, `command-routes`, `data-routes`) + WebSocket (`ws-routes`), rate limiting, security headers (CSP, HSTS — iso-27001.md Adım 8) | Unit: `command-routes` auth; Playwright security headers + rate limit; SonarQube | API inventory dokümanı (yetkisiz endpoint taraması) |
| **V14** | Konfigürasyon | Secrets yalnızca env/CI secrets (compose'da hard-coded yok), non-root container + `cap_drop` (iso-27001.md Adım 10), güncel bağımlılıklar | CI: SBOM + Trivy (0 Critical/High CVE); SonarQube hard-coded credential | `docker inspect` kanıtı; patch yönetimi |

---

## 4. SAST'in Doğrulayamadıkları (manuel/pentest zorunlu)

SonarQube sonucu "temiz" olsa bile aşağıdaki ASVS item'ları **otomatik olarak kanıtlanmış sayılmaz**:

- **V1:** Tehdit modelinin varlığı ve güncelliği
- **V2:** Parola sıfırlama/hesap kilitleme akışlarının işleyişi, brute-force direnci
- **V3:** Oturum çalma/fixation senaryoları
- **V4:** Yetkilendirme matrisinin bütünlüğü (IDOR dahil) — statik analiz iş akışını değil yalnızca pattern'i görür
- **V6:** Kripto anahtar yönetimi ve rotasyonu
- **V8:** Verinin gerçekten nerede saklandığı (DB dökümü incelemesi)
- **V11:** İş mantığı zafiyetleri (manevra akışları, komut yetki kaçırma) — pentest konusu

Bu liste yıllık pentest kapsamına (nis-2.md Adım 17) ve büyük sürüm öncesi hedefli pentest'e girer.

---

## 5. Repo Kapılarıyla Bağ

| Kapı | Kaynak |
|:-----|:-------|
| Güvenlik-kritik modüllerde ≥%90 branch (rbac, token-adapter, ws/auth doğrulama, session-gateway, tunnel frame codec, field-connector, komut validasyonu) | AGENTS.md TDD + TESTING.md §8.3 |
| Yeni kodda ≥%70 satır | SonarCloud Quality Gate |
| Quality Gate: Blocker > 0, Critical > 0, Security Rating < A → build FAIL | nis-2.md Adım 4 |
| Hard-coded secret / ham `console.*` log → Blocker | nis-2.md Adım 2–3 |
| 0 Critical/High CVE (SBOM + Trivy) | nis-2.md Adım 13 |
| Testsiz PR merge edilmez | AGENTS.md |

---

## 6. Release Kontrol Listesi (her sürüm)

- [ ] SonarQube Quality Gate yeşil (Blocker=0, Critical=0, Security Rating A)
- [ ] `@nis2-security` tag'li testler yeşil (nis-2.md Adım 12)
- [ ] Playwright güvenlik E2E yeşil (`e2e/security/`)
- [ ] SBOM + Trivy: 0 Critical/High CVE
- [ ] Yeni ASVS-etkili özellik → tehdit modellemesi yapıldı mı? (V1)
- [ ] Manuel item'lar (§4) büyük sürümse harici pentest kapsamına alındı mı?
- [ ] Kanıtlar "Sürüm Güvenlik Beyanı"na eklendi (nis-2.md Adım 15)

---

## 7. İlgili Dokümanlar

- [nis-2.md](./nis-2.md) — SonarQube/CI/CD check adımları (ASVS eşlemesinin otomatik ayağı)
- [iso-27001.md](./iso-27001.md) — Security headers, Docker hardening, erişim kontrol matrisi
- [TESTING.md](../TESTING.md) — Test katmanları ve güvenlik testi kapsamı
- [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](../architecture/KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md) — Oturum/tünel güvenlik mimarisi (V1/V3 dayanağı)
