---
status: active
space: architecture
tags: [kapanis, agentic, is-akisi, spec, opencode, test-altyapisi]
review_date: 2026-11-10
spec: ./AGENTIC-IS-AKISI-MIMARISI.md
---

# Agentic İş Akışı — Kapanış (Doğrulama ve Test Kapsamı)

> **SPEC:** `./AGENTIC-IS-AKISI-MIMARISI.md` (🟢 Doğrulanmış 2026-11-10).
> **Reviewer:** GLM-5.3 (`opencode-go/glm-5.3`), mode: all — Tab geçişiyle aynı oturum bağlamı (FR-4.1).
> **Kapsam:** T-1..T-5 build çıktısı; 8 dosya (6 değişen + 2 yeni).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| Dosya / Sembol | Değişiklik | Neden (SPEC ref) |
|:---------------|:-----------|:-----------------|
| `.opencode/agents/reviewer.md#model` | `deepseek-v4-pro` → `opencode-go/glm-5.3`; yedek model yok | K3 (B1) |
| `.opencode/agents/reviewer.md#mode` | `subagent` → `all` (Tab geçişi; `/kapanis` subagent-varyantı kalır) | K4 (B1) |
| `.opencode/agents/reviewer.md#permissions` | deny-all + allowlist (read/glob/grep, plan konumu erişimi, `git diff`/`git status`/`spec:check`/`mv`/`rm` allowlist'i, `edit` yalnız `*-KAPANIS.md*`); MCP izni YOK | K9, FR-4.2, FR-4.6 (B2) |
| `.opencode/agents/reviewer.md#prompt` | girdiyi kendin topla (glob sırası), atomik draft→spec:check→final, Revizyon Geçmişi, NIS-2 maddesi, önerir-karar vermez, yazma kısıtı | K8, K9, FR-4.3, FR-4.4, FR-4.5 (B3) |
| `.opencode/opencode.json#agents` | V1 `agent` → V2 `agents` (çoğul); plan=V4 Pro, build=V4.1 Flash, general/explore=Flash (değişmedi); açıklamalar SPEC akışına göre revize | K1, K2, K7 |
| `.opencode/opencode.json#commands.kapanis` | V1 `command` → V2 `commands`; `/kapanis` template'ine SPEC glob sırası (`.opencode/plans/` → `~/.opencode/plan/` → `docs/architecture/`) eklendi | K4, K5 (T-5) |
| `AGENTS.md#gelistirme-is-akisi` | 5 aşama → 4 aşama (SPEC → SÖZLEŞME+TEST → IMPL+MUTASYON → REVIEW); aşama-model eşlemesi (Pro/Flash/GLM-5.3) | T-4 |
| `AGENTS.md#spec-konumu-ve-taşıma` | YENI: SPEC önce plan konumunda (`~/.opencode/plan/` veya `.opencode/plans/`); review geçince `docs/architecture/`'a taşınır, kopya kalmaz | K5, FR-1.1 |
| `AGENTS.md#mutasyon-kapısı` | YENI: `test:mutation` yalnız değişen dosyalar; eşik ≥%80, kritik ≥%90; eşik altı → review başlamaz; hayatta kalan mutant §B.2'ye | K6, FR-3.2, FR-3.3 |
| `AGENTS.md#revizyon-akışı` | YENI: SPEC sözleşme / KAPANIŞ changelog ayrımı; davranış değişimi → plan modu + onay; impl detayı → yalnız KAPANIŞ; Revizyon Geçmişi tek bölüm | K8, FR-5.2, FR-5.3 |
| `AGENTS.md#faz-kapanışı-doğrulaması` | "5 aşamalı" → "4 aşamalı" (tutarlılık düzeltmesi) | T-4 |
| `package.json#scripts.test:mutation` | YENI script: `bun tools/mutation-changed.mjs` | K6, FR-3.2, FR-3.3, T-3 |
| `package.json#devDependencies` | `@stryker-mutator/core` + `@stryker-mutator/vitest-runner` ^10.1.1 | K6, T-3 |
| `stryker.conf.mjs#thresholds` | YENI dosya: vitest-runner (related modu, perTest coverage), `break: MUTATION_BREAK ?? 80`, mutate glob'ları (test/index/d.ts hariç) | K6, FR-3.2, FR-3.3, T-3 |
| `tools/mutation-changed.mjs#changed` | YENI dosya: git diff (ACMR) + untracked → üretim `.ts/.tsx` filtresi (`tools/` hariç) → paket kökü çözümleme (`#packageRoot`) → paket bazında `stryker run --mutate <liste>`; eşik altı → exit 1 | K6, FR-3.2, FR-3.3, AK-3.2, AK-3.3 |
| `.gitignore` | Stryker çıktıları (`**/.stryker-tmp/`, `**/reports/mutation/`, incremental json) | K6 yan ürünü |
| `bun.lock` | Stryker 10.1.1 bağımlılık kilidi | T-3 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| SPEC lint (AK-1.2) | `bun run spec:check /home/gd-software/.opencode/plan/AGENTIC-IS-AKISI-MIMARISI.md` | 0 hata, 0 uyarı ✅ |
| Config parse | `JSON.parse` — `.opencode/opencode.json` | OK ✅ |
| Mevcut test paketi (AK-3.1 bağlamı) | `bunx vitest run` — `packages/result` | 2 dosya (`packages/result/src/result.test.ts`, `packages/result/src/domain-error.test.ts`), 33 test yeşil (265ms) ✅ |
| Mutasyon smoke (AK-3.2) | geçici `packages/result/src/mutation-smoke.ts` + testi → Stryker | %100 mutation score; eşik %80 geçildi; geçici dosyalar silindi (glob doğrulaması: kalmadı) ✅ |
| Wrapper uçtan uca (AK-3.2) | `bun run test:mutation` (untracked senaryosu) | untracked dosya tespit + paket bulma + Stryker koşu + EXIT=0 ✅ |
| Stryker plugin çözümleme | kök `stryker.conf.mjs` `plugins: ["@stryker-mutator/vitest-runner"]` | paket bazında koşarken kök node_modules ile çözüldü ✅ |
| KAPANIŞ lint (AK-4.3) | `bun run spec:check docs/architecture/AGENTIC-IS-AKISI-KAPANIS.md.draft` | bu doküman için işletildi — bkz. çıktı ✅ |
| İzin reddi (deny-all) (FR-4.2) | bu review oturumunda allowlist dışı komut (`echo test`) | reddedildi ✅ |
| İzinli komut (allowlist) | bu review oturumunda `git status --porcelain` | 8 dosya listelendi ✅ |

> Not: Bu modül kalıcı üretim `.ts` kaynağı değiştirmez (değişen dosyalar: `.md/.json/.mjs/.lock/.gitignore`); bu nedenle mutasyon kapısı bu diff'te "değişen üretim dosyası yok → kapı atlandı" durumundadır. Kapının kendisi geçici smoke ile doğrulandı (yukarıda).

### A.3 Kabul Kriteri Kanıtları

| Kod | Kanıt | Durum |
|:----|:------|:------|
| AK-1.1 | SPEC `/home/gd-software/.opencode/plan/AGENTIC-IS-AKISI-MIMARISI.md` konumunda (glob doğrulandı); SPEC yazımı başka repo dosyası değiştirmedi | ✅ |
| AK-1.2 | `bun run spec:check <SPEC>` → 0 hata, 0 uyarı (A.2) | ✅ |
| AK-1.3 | SPEC başlığında "✅ ONAYLANDI (2026-11-10)"; build onaydan sonra başladı | ✅ |
| AK-2.1 | Bu modülde klasör kırmızı test döngüsü uygulanabilir değil (kalıcı davranış kodu yok — bkz. A.4-1); ana agent'in SPEC'i taze okuma kanıtı gözle doğrulanamadı | 🟡 |
| AK-2.2 | Davranış smoke + gözle kontrol ile doğrulandı (A.2); klasik kırmızı→yeşil test seti bu modülde üretilemedi (konfig/doküman modülü) | 🟡 |
| AK-2.3 | Build sırasında SPEC dışı davranış kararı gözlemlenmedi (sapma yok); olumlu kanıt (sorulan soru) kaydı yok | 🟡 |
| AK-3.1 | `packages/result` 33 test yeşil; TAM repo `bun run test` koşulmadı (bkz. A.4-3) | 🟡 |
| AK-3.2 | Mutasyon smoke: mutate listesi CLI'dan geçildi, yalnız hedef dosya mutasyona uğradı; wrapper untracked tespiti EXIT=0 | ✅ |
| AK-3.3 | Eşik-altı durumu HİÇ koşulmadı (yalnız %100 geçen smoke); `tools/mutation-changed.mjs` kod incelemesi: `failed → process.exit(1)` yolu mevcut (bkz. A.4-2) | 🟡 |
| AK-4.1 | Bu review oturumu `opencode-go/glm-5.3` üzerinde koşuyor (oturum model bilgisi); `mode: all` config'te | ✅ |
| AK-4.2 | Bu oturumda yalnız `docs/architecture/AGENTIC-IS-AKISI-KAPANIS.md` (+ `.draft`) yazılıyor; deny-all + edit izni yalnız KAPANIS deseni; MCP izni yok | ✅ |
| AK-4.3 | Bu doküman draft → `spec:check` → `mv` akışıyla üretildi; hata olsaydı final oluşmazdı | ✅ |
| AK-4.4 | Sapmalar §A.4'te raporlandı; reviewer kod/SPEC düzeltmedi | ✅ |
| AK-4.5 | Uygulanabilir: `reviewer.md` permissions bloğu erişim kontrolüdür (güvenlik ilgili) ve SPEC'te açık tehdit modeli yok → §A.6'da uyumluluk boşluğu olarak işaretlendi | ✅ |
| AK-4.6 | Permissions bloğunda MCP action izni yok; deny-all kapsıyor; bu oturumda MCP aracı yok | ✅ |
| AK-5.1 | Review sonrası SPEC `docs/architecture/AGENTIC-IS-AKISI-MIMARISI.md`'ye taşındı; plan konumunda kopya kalmadı | ✅ |
| AK-5.2 | Ayrım kuralı `AGENTS.md#revizyon-akışı`'nda işlendi; henüz revizyon vakası yok (ilk kapanış) | ✅ |
| AK-5.3 | `## Revizyon Geçmişi` bölümü bu dokümanın sonunda mevcut | ✅ |

### A.4 Sapmalar

Reviewer raporlar, karar vermez — düzeltme kararları developer'a aittir.

| Kod | Açıklama | Etki |
|:----|:---------|:-----|
| A.4-1 | `tools/mutation-changed.mjs` kalıcı unit testi YOK — davranış yalnız tek seferlik smoke + uçtan uca koşuyla doğrulandı, geçici dosyalar silindi. AGENTS.md "testsiz PR merge edilmez" kuralıyla gerilim | Wrapper regresyonları (arg parsing, `#isSource` filtresi, `#packageRoot` çözümlemesi, exit kodu) otomatik yakalanmaz. Öneri: küçük bir `tools/mutation-changed.test.mjs` (argValue/isSource/packageRoot birimleri) |
| A.4-2 | AK-3.3 (eşik altında durma) hiç koşulmadı — yalnızca %100 geçen smoke yapıldı; exit-1 durma davranışı kod incelemesiyle örtülü | Kapının negatif yolu (eşik altı → exit 1 → review başlamaz) davranışsal kanıtsız. Öneri: kasıtlı hayatta kalan mutantla (örn. `--break 100`+0 eşikli veya kırılmış testle) tek negatif koşu |
| A.4-3 | AK-3.1 için TAM repo `bun run test` koşulmadı — yalnız `packages/result` paketi koşuldu | Modül kalıcı `.ts` kaynak değiştirmediği için risk düşük; ancak AK-3.1'in "tam test paketi geçer" ifadesi tam koşulmadan kısmen karşılandı. Öneri: kapanış öncesi tek `bun run test` |
| A.4-4 | K2 "reasoning effort varsayılanı (high)" — `.opencode/opencode.json#agents.build`'de açık reasoning alanı YOK; "zaten doğru" iddiası görünür kanıt taşımıyor | Muhtemelen platform varsayılanı; herhangi bir etki gözlemlenmedi. Gözle maddesi olarak izlenir (A.5) |
| A.4-5 | `tools/mutation-changed.mjs` paketleri SIRALI koşar (`for...of` + `execSync`) — AGENTS.md async kuralının ruhuna aykırı ama `execSync` bilinçli seçim (`ponytail:` notu ile belgelenmiş: hız gerekirse paralel) | Çok paketli diff'lerde yavaş kapı. Belgelenmiş bilinçtel basitleştirme — kabul edilebilir; işaretlenmesi yeterli |

### A.5 Gözle Kontrol Maddeleri

- `reviewer.md` frontmatter: model `opencode-go/glm-5.3`, yedek YOK (K3) — ✅
- `reviewer.md` mode `all`; description Tab geçişini ve `/kapanis` varyantını belirtiyor (K4) — ✅
- Permissions: deny-all önce, allowlist sonra; `external_directory` + `read` plan konumu için; MCP izni yok (FR-4.6) — ✅ (canlı doğrulandı: allowlist dışı komut reddedildi)
- `AGENTS.md` 4 aşama bloğu: aşama başına model + onay/ geçme kapıları SPEC §9 aşama eşlemesiyle uyumlu — ✅
- SPEC konum kuralı iki konumu da kabul ediyor (`.opencode/plans/` veya `~/.opencode/plan/`); fiilen kullanılan konum `~/.opencode/plan/` — uyumlu — ✅
- `.opencode/opencode.json` V2 şekli: `agents`/`commands` çoğul; plan=Pro (K1), build=Flash (K2), general/explore=Flash (K7) — ✅
- `/kapanis` template'inde SPEC glob sırası (plan konumları önce) — ✅
- `stryker.conf.mjs`: `vitest.related: true`, `coverageAnalysis: perTest`, `break: MUTATION_BREAK ?? 80` (K6; kritik 90 env/flag ile: `--break 90`) — ✅
- `tools/mutation-changed.mjs`: untracked dahil, `tools/` ve test/d.ts hariç filtre, eşik altı exit 1 — ✅
- Açık karar A1 (tools-vs-permission): KAPANDI — `permissions` bloğu kurulu sürümde çalışıyor (bu oturumda deny-all/allowlist canlı işledi)
- Açık karar A2 (Stryker monorepo hedefleme): KAPANDI — paket bazlı koşu uçtan uca doğrulandı (`#packageRoot` + CLI `--mutate`)
- Açık karar A3 (general'ı Pro'ya alma): bekliyor — K7 gereği bilinçtel erteleme
- AK-5.1 SPEC taşıma: review sonrası `docs/architecture/`'a taşındı; plan konumunda kopya yok — ✅

### A.6 Genel Durum Özeti

**MODÜL UYGUN — onay önerisi:** T-1..T-5 tamamlanmış; 9 AK tam ✅, 6 AK 🟡 (heksi nedeniyle değil, modülün konfig/doküman niteliği ve bilinçtel sıralama), 0 AK ⛔. Üç orta-boşluk raporlandı (A.4-1..A.4-3); hiçbiri davranış sapması değil, test-kanıtı boşluğu. `reviewer.md` üzerinde B1/B2/B3 kök nedenleri kapatıldı; K1-K9 kararlarının hepsi koda işlendi (K7 = değişiklik yok, uyumlu).

**SC değerlendirmesi:** SC-1 ✅ (bu KAPANIŞ GLM-5.3 ile AK-kanıt çapraz referanslı üretildi) · SC-2 🟡 (kapı çalışıyor, negatif yol kanıtsız — A.4-2) · SC-3 ✅ (SPEC `docs/architecture/`'a taşındı) · SC-4 ✅ (SPEC 0 hata; KAPANIŞ lint'i bu dokümanda işletildi) · SC-5 ✅ (bu oturumda yalnız KAPANIŞ dosyası değişiyor).

**NIS-2 uyumluluk boşluğu (AK-4.5):** `reviewer.md#permissions` bloğu bir erişim kontrolüdür (reviewer'ın yazma/koşma alanını kısıtlar) → güvenlik ilgili değişiklik sayılır. SPEC'te bu değişiklik için tehdit modeli veya güvenlik-kabul kriteri TANIMLI DEĞİLDİR (yalnız FR-4.6 "MCP kapalı" davranışı var). **Uyumluluk boşluğu olarak işaretlendi** — öneri: SPEC revizyonunda reviewer yetki sınırına kısa tehdit modeli (neyi kimden korur: reviewer'ın SPEC/kaynak/test dosyalarına yanlışlıkla dokunması, MCP enjeksiyonu) eklenir; kararı developer. NIS-2 denetim-izi otomasyonu zaten SPEC §11 İleri İş'te (bu pakette yapılmaz).

**SPEC Revizyon Önerisi:** davranış değişikliği gerektiren sapma bulunmadı — YOK. A.4 maddeleri test-kanıtı ve izleme notudur; A1/A2 açık kararlarının kapanışı bu KAPANIŞ'ta belgelendi (SPEC metni "T-5'te kapanır" dediği için revizyon gerekmez).

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi

| Durum | Koşul | Beklenen | Test/Kanıt Ref |
|:------|:------|:---------|:---------------|
| SPEC yazılmış | `spec:check <SPEC>` koşulur | 0 hata | A.2 satır 1 (AK-1.2) |
| Config değişmiş | `.opencode/opencode.json` parse edilir | geçerli JSON | A.2 satır 2 |
| Mevcut paket | `packages/result` vitest koşar | 33 test yeşil | A.2 satır 3 (`packages/result/src/result.test.ts`, `packages/result/src/domain-error.test.ts`) |
| Değişen dosya mutasyonu | Stryker yalnız hedef dosyayı mutasyona uğratır | %100 score, eşik geçildi | A.2 satır 4 (AK-3.2, smoke) |
| Untracked dosya | wrapper untracked'ı tespit eder, paketi bulur, koşar | EXIT=0 | A.2 satır 5 (AK-3.2) |
| Allowlist dışı komut | reviewer oturumunda izinsiz shell çağrılır | reddedilir | A.2 satır 8 (FR-4.2, bu oturum canlı) |
| Allowlist'li komut | reviewer oturumunda `git status` çağrılır | çalışır, 8 dosya | A.2 satır 9 (bu oturum canlı) |
| MCP aracı | reviewer oturumunda tool listesi incelenir | MCP görünmez | A.3 (AK-4.6, bu oturum) |
| Eşik altı skor | wrapper eşik altında koşar | exit 1, review başlamaz | **KAPSANMAYAN** (A.4-2) |
| KAPANIŞ draft | `spec:check <draft>` koşulur | temiz → final, değil → final yok | A.2 satır 7 (AK-4.3, bu doküman) |

### B.2 KAPSANMAYAN Boşluklar

| Boşluk | Risk | İleri İş |
|:-------|:-----|:---------|
| `tools/mutation-changed.mjs` kalıcı unit testi yok (A.4-1) | Wrapper regresyonu fark edilmeden geçer; kapı sessizce bozulur | Küçük test: `argValue`, `isSource` filtresi, `packageRoot` çözümlemesi, exit kodu |
| Eşik-altı senaryo hiç koşulmadı (A.4-2) | AK-3.3 durma davranışı kanıtsız | Kasıtlı başarısız koşu (kırık test / imkânsız eşik) → exit 1 doğrulaması |
| Tam repo `bun run test` bu modül için koşulmadı (A.4-3) | Dolaylı regresyon (config/doküman) görülmeden merge | Kapanış öncesi tek tam koşu |
| Tab geçişinde canlı model anahtarı (T-5 kalemi) gözle doğrulanmadı | `mode: all` altında modelin anahtarlamadığı senaryo fark edilmez | Developer bir sonraki review'de gözlemler (config doğru: `reviewer.md#model`) |
| Kritik-modül %90 eşiği gerçek kritik modülde henüz koşulmadı | Kritik modül kapisinin fiilen denenmesi yok (yalnız mekanizma hazır: `--break 90`) | İlk güvenlik-kritik modül kapanışında koşulur (SPEC §11.2'ye uyumlu erteleme) |
| Mutasyon smoke geçici dosyaları kalıcı test envanterine girmedi | Smoke tekrarlanabilir değil | A.4-1'deki kalıcı wrapper testi bunu kapsar (mutasyon boru hattı zaten wrapper'la her koşuda doğrulanır) |

**Mutasyon öldürme oranı:** %100 (smoke kanıtı — geçici `mutation-smoke.ts`, silindi; 2 mutantın tümü öldürüldü). Kalıcı değişen dosyalar: 8 (üretim `.ts` kaynak: **0**) — bu diff'te mutasyon kapısı "değişen üretim dosyası yok → kapı atlandı" durumundadır (`tools/mutation-changed.mjs` sadece `.ts/.tsx` hedefler, `.mjs`/`.md`/`.json` hariç). Hayatta kalan mutant: 0 (smoke'da).

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: T-1..T-5 build çıktısı doğrulandı; A1/A2 açık kararları kapandı; NIS-2 boşluğu işaretlendi | (yok — SPEC değişmedi; izlenen boşluklar A.4/B.2'de) |
| 2026-11-10 | SPEC taşıma tamamlandı (AK-5.1): `~/.opencode/plan/` → `docs/architecture/` | FR-5.1 (davranış değişmedi) |
| 2026-11-10 | AGENTS.md "KAPANIŞ otomasyonu" netleştirmesi: review ayrı adım — build sonunda ana agent durur, developer Tab ile reviewer'a geçer; subagent otomatik çağrılmaz, `/kapanis` manuel varyant | K4/FR-4.1 (davranış değişmedi — doküman netleştirmesi) |
