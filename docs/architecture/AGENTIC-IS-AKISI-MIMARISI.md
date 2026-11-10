---
status: active
space: architecture
tags: [mimari, agentic, is-akisi, spec, opencode, test-altyapisi]
review_date: 2026-11-10
---

# Agentic İş Akışı — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** 🟢 Doğrulanmış (2026-11-10) — KAPANIŞ: [`AGENTIC-IS-AKISI-KAPANIS.md`](./AGENTIC-IS-AKISI-KAPANIS.md).
> **İlişkili:** `docs/architecture/SPEC-SABLONU.md` (şablon), `AGENTS.md` (Geliştirme İş Akışı), "Agentic mimari değerlendirmesi" sohbeti (2026-11).

## 1. Amaç ve Bağlam

OpenCode üzerinde kurulu agentic geliştirme mimarisi (Plan/Build/Review) "Agentic mimari değerlendirmesi" sohbetiyle (2026-11) gözden geçirildi. Bu SPEC, sohbetin kararlarını repo'ya işler: aşama-model eşlemesi, reviewer'ın çalışma modu, SPEC'in plan aşamasında fiziksel dosya olarak yazılması, mutasyon testi kapısı ve doküman revizyon akışı.

| Katman | Kapsam |
|:-------|:-------|
| dahil | OpenCode agent config'leri (`.opencode/`), Geliştirme İş Akışı kuralları (`AGENTS.md`), mutasyon testi kapısı, SPEC konum/taşıma kuralı, reviewer prompt'u |
| hariç | Modül SPEC içerikleri (bu SPEC'in kendisi hariç), e2e/perf test kuralları (`TESTING.md` aynen kalır), CI entegrasyonu, NIS-2 denetim-izi otomasyonu (İleri İş) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Plan aşaması DeepSeek V4 Pro (`opencode-go/deepseek-v4-pro`) — karmaşık akıl yürütme, SPEC tasarımı | `.opencode/opencode.json#agent.plan` zaten doğru — değişiklik yok |
| K2 | Build aşaması DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`) — JSDoc/test/implementasyon; reasoning effort varsayılanı (high) | `.opencode/opencode.json#agent.build` zaten doğru — değişiklik yok |
| K3 | Review aşaması GLM-5.3 (`opencode-go/glm-5.3`) — yedek model YOK | `reviewer.md` model satırı (T-1) |
| K4 | Reviewer `mode: all` — Tab geçişiyle ana ajan olarak aynı bağlamda çalışır; subagent olarak da çağrılabilir | `reviewer.md` mode satırı (T-1); `/kapanis` komutu kalır |
| K5 | SPEC önce plan-modu yazılabilir konuma yazılır; dev onayı → build → review geçince `docs/architecture/`'a taşınır | `AGENTS.md` kuralı (T-4) |
| K6 | Mutasyon testi build sonrası zorunlu kapı: StrykerJS vitest-runner, yalnız değişen dosyalar, eşik %80 (kritik modül %90) | `test:mutation` script'i (T-3) |
| K7 | general/explore modelleri Flash'ta kalır (bütçe) | değişiklik yok; Pro'ya geçiş A3'te |
| K8 | SPEC sözleşmedir, KAPANIŞ changelog'dur; revizyon geçmişi KAPANIŞ içinde tek bölümde | reviewer prompt (T-2) |
| K9 | Reviewer önerir, karar vermez; yalnızca `*-KAPANIS.md` yazar | reviewer prompt + yazma kısıtı (T-1, T-2) |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | reviewer model=Pro + mode=subagent → bağlam izolasyonu, inceleme için maliyet/kalite dengesi zayıf | `.opencode/agents/reviewer.md` |
| B2 | reviewer'da tools bloğu yok — `git diff` / `spec:check` çağrı yetenekleri garanti değil | `.opencode/agents/reviewer.md` |
| B3 | "yazdıktan sonra spec:check, temiz değilse YAZMA" kuralı sıra olarak çelişkili (atomik değil) | `.opencode/agents/reviewer.md` |
| B4 | `kimi-k2.5` opencode-go kataloğunda YOK (yalnızca kimi-k3.1-pro, kimi-k2.7-code) — sohbetteki yedek model kararı geçersiz | models sorgusu (2026-11-10) |
| B5 | Mutasyon testi altyapısı yok; vitest 3 + workspace yapısı mevcut | `vitest.workspace.ts` |

## 4. Mimari

```text
[PLAN  — V4 Pro]     SPEC dosyası (plan konumu) ── dev onayı ──┐
                                                               ↓
[BUILD — V4.1 Flash] SÖZLEŞME: JSDoc + kırmızı testler ── dev onayı ──┐
                                                                       ↓
[BUILD — V4.1 Flash] IMPL: yeşil + testler + MUTASYON kapısı (≥%80) ───┤
                                                                       ↓
[REVIEW — GLM-5.3]   Tab geçişi (mode: all) → KAPANIŞ yazar → dev kararı
                       └─ review geçince SPEC docs/architecture/'a taşınır
```

### 4.1 Dosya akışı

`<plan-konumu>/<MODUL>-MIMARISI.md` → (dev onayı) → build tüketir → (review geçti) → `docs/architecture/<MODUL>-MIMARISI.md` + `docs/architecture/<MODUL>-KAPANIS.md`

### 4.2 Sorumluluk ayrımı

| Rol | Model | Yazma alanı |
|:----|:------|:------------|
| Plan | V4 Pro | yalnız plan konumu (`.opencode/plans/` veya `~/.opencode/plan`) |
| Build | V4.1 Flash | kaynak/test/doküman; onaylı SPEC'i DEĞİŞTİRMEZ |
| Review | GLM-5.3 | yalnız `docs/architecture/<MODUL>-KAPANIS.md` |

## 5. Purity Kuralları (ZORUNLU)

1. Plan ajanı repo dosyalarına dokunmaz — yalnızca plan konumuna yazar (K5).
2. Build ajanı onaylanmış SPEC'i değiştirmez; SPEC'te olmayan davranışı varsaymaz — eksikte durur ve sorar (FR-2.3).
3. Reviewer yalnızca `*-KAPANIS.md` yazar; SPEC'i, kaynak kodu ve testleri değiştirmez; düzeltme yapmaz, raporlar (K9).
4. SPEC = sözleşme: davranış değişmeden SPEC değişmez; KAPANIŞ changelog'dur (K8).
5. Kod referansı `#sembol` çapası; satır numarası YASAK (mevcut kural, korunur).

## 6. Use Case'ler

### 6.1 UC-1 — Plan Aşaması: SPEC Üretimi ve Onay Kapısı

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: SPEC'in plan konumuna fiziksel yazımı, şablon/lint uyumu, developer onay kapısı
- hariç: SPEC içerik kararları (modül bazlı), implementasyon

**Akış:**
1. Plan modunda (V4 Pro) gereksinim/analiz yapılır, SPEC taslağı üretilir.
2. SPEC plan konumuna yazılır (`.opencode/plans/` veya `~/.opencode/plan`) — dosya adı `<MODUL>-MIMARISI.md`.
3. Lint kapısı: `bun run spec:check <dosya>` koşulur, 0 hata gerekir (plan modu komuta izin vermezse onay sonrası build'in ilk adımı).
4. Developer'a "ONAY BEKLİYOR" uyarısı verilir (dosya yolu + durum); onay gelene kadar akış durur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | SPEC plan-modu yazılabilir konuma fiziksel dosya olarak yazılır | AK-1.1 |
| FR-1.2 | SPEC `bun run spec:check` lint'inden 0 hata ile geçer | AK-1.2 |
| FR-1.3 | Developer onayı olmadan build aşaması başlamaz | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** plan modu aktif **WHEN** Pro SPEC'i yazar **THEN** dosya plan konumunda oluşur ve başka repo dosyası değişmez
2. **AK-1.2 — GIVEN** SPEC dosyası yazılmış **WHEN** `bun run spec:check <dosya>` koşulur **THEN** hata sayısı 0'dır
3. **AK-1.3 — GIVEN** SPEC onaylanmamış **WHEN** build'e geçilmeye çalışılır **THEN** akış durur, developer onayı beklenir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | SPEC plan konumunda; yalnızca o dosya değişti | gözle | ⬜ |
| AK-1.2 | spec:check çıkış kodu 0 | komut | ⬜ |
| AK-1.3 | Onay kapısı işletildi (uyarı + durma) | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-4: `AGENTS.md` "Geliştirme İş Akışı" bölümünü bu akışa göre güncelle (4 aşama, SPEC konumu/taşıma, onay kapıları)

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Lint hatası | Dosya düzeltilmeden onay istenmez |
| Onay gecikir | Status `✏️ Specified` kalır; iş ilerlemez |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `.opencode/plans/` veya `~/.opencode/plan` | SPEC yazım konumu |
| `docs/architecture/SPEC-SABLONU.md` | Şablon kaynağı |
| `tools/spec-check.mjs` | Lint aracı |
| `AGENTS.md` | Kural dokümanı (T-4) |

### 6.2 UC-2 — Build Aşaması: Sözleşme + Test (Kırmızı)

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: onaylı SPEC'in taze okunması, JSDoc/tip sözleşmeleri, kırmızı testler, ikinci onay kapısı
- hariç: implementasyon (UC-3), SPEC içerik değişikliği

**Akış:**
1. Build moduna geçilir (V4.1 Flash); ilk adım SPEC dosyasını yeniden okumaktır (eski plan bağlamına güvenmez).
2. JSDoc/tip sözleşmeleri ve unit/integration/e2e testleri SPEC GWT/AK'lerinden türetilir.
3. Testler implementasyonsuz KIRMIZI verir.
4. Developer onayı: testlerin AK'leri gerçekten kapsadığı kontrol edilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Build'in ilk adımı onaylı SPEC'in yeniden okunmasıdır | AK-2.1 |
| FR-2.2 | Her AK için en az bir test üretilir; implementasyonsuz kırmızı verir | AK-2.2 |
| FR-2.3 | SPEC'te olmayan davranış varsayılmaz; eksikte durur ve sorar | AK-2.3 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** build moduna geçilmiş **WHEN** Flash çalışmaya başlar **THEN** SPEC dosyası yeniden okunur, eski plan bağlamına güvenilmez
2. **AK-2.2 — GIVEN** SPEC onaylı **WHEN** testler yazılıp koşulur **THEN** testler kırmızıdır ve her AK'nin en az bir testi vardır
3. **AK-2.3 — GIVEN** SPEC'te belirsiz/eksik davranış var **WHEN** Flash bu noktaya gelir **THEN** kendisi karar vermez, durur ve sorar

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Build çıktısında SPEC okuma kanıtı (ilk tool çağrısı read) | kod inceleme | ⬜ |
| AK-2.2 | Kırmızı test koşusu + AK-test eşlemesi | komut | ⬜ |
| AK-2.3 | Belirsizlikte soru soruldu | gözle | ⬜ |

**T Görev Listesi:**
- (yok — mevcut yapılandırma bu UC'yi zaten karşılar)

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Testler kırmızı değil | Sözleşme eksik sayılır; testler yeniden yazılır |
| Onay reddedilir | Testler güncellenir, yeniden onaya sunulur |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `<plan-konumu>/<MODUL>-MIMARISI.md` | Girdi (taze okuma) |
| modül kaynak dizini | JSDoc/tip sözleşmeleri |
| `*.test.ts` | Kırmızı testler |

### 6.3 UC-3 — Build Aşaması: Implementasyon + Mutasyon Kapısı

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: yeşile çevirme, refactor, mutasyon kapısı (StrykerJS)
- hariç: review (UC-4), kritik-modül listesinin resmi yönetimi (İleri İş)

**Akış:**
1. Flash testleri yeşile çevirir (minimal kod), refactor yapar.
2. `bun run test` — tüm testler yeşil.
3. `bun run test:mutation` — StrykerJS, yalnız değişen dosyalarda (git diff tabanlı).
4. Eşik: değişen dosyalar ≥%80; kritik modül ≥%90. Altındaysa build durur, test güçlendirme turu başlar.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Testler yeşile çevrilir ve tam test paketi geçer | AK-3.1 |
| FR-3.2 | Mutasyon testi yalnız değişen dosyalarda koşar (git diff tabanlı) | AK-3.2 |
| FR-3.3 | Mutasyon eşiği (%80, kritik %90) altında build durur; reviewer çağrılmaz | AK-3.3 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** kırmızı testler **WHEN** implementasyon yazılır **THEN** testler yeşildir
2. **AK-3.2 — GIVEN** bir değişiklik kümesi **WHEN** `test:mutation` koşulur **THEN** yalnız diff'teki dosyalar mutasyona uğrar
3. **AK-3.3 — GIVEN** öldürme oranı eşiğin altında **WHEN** kapı değerlendirilir **THEN** build durur, test güçlendirme turu başlar, reviewer çağrılmaz

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | `bun run test` tam yeşil | komut | ⬜ |
| AK-3.2 | Mutasyon raporunda yalnız değişen dosyalar | komut | ⬜ |
| AK-3.3 | Eşik ihlalinde durma davranışı | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-3: StrykerJS kurulumu (`@stryker-mutator/core` + `@stryker-mutator/vitest-runner`, `stryker.conf.mjs`, `test:mutation` script'i, eşik 80/kritik 90)

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Eşik altı | Test güçlendirme turu; review aşamasına geçilmez |
| Hayatta kalan mutant | KAPANIŞ §B.2'ye "zayıf test" kaydı (review aşamasında) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `package.json` | `test:mutation` script'i |
| `stryker.conf.mjs` (yeni) | Stryker yapılandırması |
| `bun.lock` | Bağımlılık kilidi |

### 6.4 UC-4 — Review Aşaması: KAPANIŞ Üretimi (GLM-5.3)

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: Tab geçişiyle review, KAPANIŞ üretimi, yazma kısıtı, NIS-2 kontrol maddesi
- hariç: düzeltme uygulama (reviewer yapmaz), SPEC değişikliği, otomatik düzeltme döngüsü

**Akış:**
1. Build geçme kapısından sonra Tab ile reviewer'a geçilir (`mode: all` — aynı oturum bağlamı).
2. Reviewer SPEC'i ve diff'i kendisi toplar (glob/read; gerekirse `git diff`).
3. KAPANIŞ §A+§B formatında üretilir: önce `.draft`, `bun run spec:check`, temizse final `docs/architecture/<MODUL>-KAPANIS.md`.
4. Sorunlar §A.4 Sapmalar'da raporlanır; düzeltme kararı developer'dadır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Reviewer GLM-5.3 ile, mode: all, Tab geçişiyle aynı bağlamda çalışır | AK-4.1 |
| FR-4.2 | Reviewer yalnızca `*-KAPANIS.md` yazar; SPEC/kaynak/test dosyalarını değiştirmez | AK-4.2 |
| FR-4.3 | KAPANIŞ draft → spec:check → final akışıyla üretilir (atomik) | AK-4.3 |
| FR-4.4 | Sorunlar KAPANIŞ'ta raporlanır; düzeltme kararı developer'dadır | AK-4.4 |
| FR-4.5 | Güvenlik kritik değişiklikte SPEC'te tehdit modeli/güvenlik AK'si yoksa uyumluluk boşluğu işaretlenir (NIS-2) | AK-4.5 |
| FR-4.6 | Reviewer'da MCP araçları kapalıdır (nx-mcp dahil) | AK-4.6 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** build tamamlanmış **WHEN** Tab ile reviewer'a geçilir **THEN** aynı oturum bağlamı görülür ve etkin model GLM-5.3'tür
2. **AK-4.2 — GIVEN** review oturumu **WHEN** KAPANIŞ yazılır **THEN** `git status`'te yalnızca `*-KAPANIS.md` değişmiştir
3. **AK-4.3 — GIVEN** KAPANIŞ taslağı **WHEN** spec:check koşulur **THEN** temizse final yazılır, değilse final oluşmaz
4. **AK-4.4 — GIVEN** sapma bulundu **WHEN** review tamamlanır **THEN** sapma §A.4'te raporlanır, reviewer kod düzeltmez
5. **AK-4.5 — GIVEN** değişiklik güvenlik-kritik **WHEN** SPEC'te tehdit modeli yok **THEN** KAPANIŞ'a uyumluluk boşluğu yazılır
6. **AK-4.6 — GIVEN** reviewer oturumu **WHEN** tool listesi incelenir **THEN** MCP araçları görünmez

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Etkin model GLM-5.3 + bağlam paylaşımı | gözle | ⬜ |
| AK-4.2 | Yalnız KAPANIŞ değişikliği | komut | ⬜ |
| AK-4.3 | spec:check temiz + `.draft` kalmadı | komut | ⬜ |
| AK-4.4 | Sapmalar raporlandı, düzeltme yapılmadı | kod inceleme | ⬜ |
| AK-4.5 | NIS-2 boşluk satırı var (uygulanabilir durumda) | gözle | ⬜ |
| AK-4.6 | MCP kapalı | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `reviewer.md` frontmatter (model GLM-5.3, mode: all, tools/permission bloğu)
- [ ] T-2: `reviewer.md` prompt revizyonu (kendin topla, draft akışı, Revizyon Geçmişi, NIS-2, önerir-karar vermez)

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| spec:check hatalı | Final YAZILMAZ, hata raporu döner, draft silinir |
| Diff yok / SPEC bulunamadı | Durur, eksikliği raporlar |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `.opencode/agents/reviewer.md` | Model/mode/tools + prompt (T-1, T-2) |
| `.opencode/opencode.json` | `/kapanis` komutu (subagent-varyant olarak kalır) |
| `docs/architecture/<MODUL>-KAPANIS.md` | Review çıktısı |

### 6.5 UC-5 — Doküman Yaşam Döngüsü: SPEC Taşıma ve Revizyon Akışı

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: review sonrası SPEC'in docs'a taşınması, revizyon ayrımı (davranış vs impl detayı), Revizyon Geçmişi
- hariç: ayrı CHANGELOG dosyası (açılmaz), geriye dönük dönüşüm (AGENTS kuralı: yok)

**Akış:**
1. Review geçtikten sonra SPEC plan konumundan `docs/architecture/<MODUL>-MIMARISI.md`'ye taşınır.
2. Bug fix/revizyon: davranış değişiyorsa SPEC+KAPANIŞ revize edilir (plan moduna dönüş + onay kapısı yeniden işletilir); yalnızca impl detayı değişiyorsa SPEC'e dokunulmaz, KAPANIŞ'a ek madde eklenir.
3. KAPANIŞ'ta `## Revizyon Geçmişi` bölümü tutulur: tarih + neden + dokunulan SPEC maddesi.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Review geçince SPEC `docs/architecture/`'a taşınır; plan konumunda kopya kalmaz | AK-5.1 |
| FR-5.2 | Davranış değişimi SPEC revizyonu gerektirir (plan modu + onay); impl detayı yalnız KAPANIŞ'ta izlenir | AK-5.2 |
| FR-5.3 | KAPANIŞ `## Revizyon Geçmişi` bölümü taşır | AK-5.3 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** review temiz **WHEN** taşıma yapılır **THEN** SPEC docs'tadır, plan konumunda kopya yoktur
2. **AK-5.2 — GIVEN** davranış değişikliği **WHEN** revizyon başlar **THEN** plan moduna dönülür ve SPEC onay kapısı yeniden işletilir; impl-detay değişikliğinde SPEC'e dokunulmaz
3. **AK-5.3 — GIVEN** revizyon yapılmış **WHEN** KAPANIŞ okunur **THEN** Revizyon Geçmişi satırı tarih + neden + SPEC maddesi içerir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | SPEC docs konumunda tek kopya | gözle | ⬜ |
| AK-5.2 | Revizyon ayrımı işletildi | gözle | ⬜ |
| AK-5.3 | Revizyon Geçmişi bölümü var | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-5: Doğrulama paketi (tools-vs-permission sürüm kontrolü, GLM-5.3 çağrılabilirlik, Tab geçişinde model anahtarı, Stryker monorepo paket hedefleme, `/kapanis` komutu)

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| docs'ta eski sürüm çakışması | Developer kararı (üzerine yazma / isim ayırma) |
| Review sorunlu | Taşıma yapılmaz; sorunlar çözülene dek SPEC plan konumunda kalır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `docs/architecture/` | Taşıma hedefi |
| `<plan-konumu>/` | Taşıma kaynağı |
| `<MODUL>-KAPANIS.md` | Revizyon Geçmişi bölümü |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| SPEC `✏️` → `✅` | Developer onayıyla geçiş; onaysız ilerleme yok |
| Testler kırmızı | Beklenen durum (sözleşme sabit); kırmızı değilse sözleşme eksik sayılır |
| Mutasyon eşiği altı | Build durur; test güçlendirme turu; reviewer çağrılmaz |
| Review sapma buldu | KAPANIŞ §A.4'te raporlanır; developer düzeltme kararı verir |
| spec:check hatalı | Final doküman oluşmaz; draft silinir |
| SPEC revizyon ihtiyacı (build sırasında) | İş durur; plan moduna dönülür; onay kapısı yeniden işletilir |
| Review geçti | SPEC docs'a taşınır; KAPANIŞ + Revizyon Geçmişi kapanır |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Review GLM-5.3 ile KAPANIŞ üretir; AK-kanıt çapraz referansı mevcut | kod inceleme |
| SC-2 | Mutasyon kapısı çalışır: yalnız değişen dosyalar, eşik ihlalinde durma | komut |
| SC-3 | SPEC plan konumunda yazılır, review sonrası docs'a taşınır | gözle |
| SC-4 | Bu SPEC dahil tüm dokümanlarda `spec:check` 0 hata | komut |
| SC-5 | Review oturumu sonunda yalnızca `*-KAPANIS.md` değişir | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman, plan konumunda |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | JSDoc/tip sözleşmeleri + kırmızı testler |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | Yeşil implementasyon + mutasyon kapısı (T-3) |
| 4. REVIEW (GLM-5.3) | `<MODUL>-KAPANIS.md` + SPEC taşıma (T-1, T-2, T-5) |

> Not: Eski 5 aşama (SPEC/JSDoc/TEST/IMPL/KAPANIŞ) bu yapıya evrilir; `AGENTS.md` T-4'te güncellenir.

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | `tools` bloğu deprecated ise `permission` kullanımı — kurulu OpenCode sürümünde doğrulanacak | ✅ KAPANDI — V2 `permissions` bloğu kurulu sürümde canlı doğrulandı (KAPANIŞ A.5) |
| A2 | Stryker'ın vitest workspace'te paket hedefleme davranışı (`dir`/`configFile`) | ✅ KAPANDI — paket bazlı koşu uçtan uca doğrulandı (KAPANIŞ A.5) |
| A3 | general agent modelinin Pro'ya alınması | bütçe/deneyimle karar verilecek; şimdilik Flash |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. NIS-2 denetim izi: KAPANIŞ çıktılarının uyumluluk kanıtı olarak otomatik toplanması — ayrı konu.
2. Kritik-modül listesinin SPEC'te resmi "kritik" işaretlemesiyle yönetilmesi — şimdilik env tabanlı eşik (T-3).

## 12. T Görev Özeti

| T-1 | `reviewer.md` frontmatter: model→GLM-5.3, mode→all, tools/permission (read/glob/grep/bash; write/edit yalnız KAPANIŞ; mcp kapalı) |
| T-2 | `reviewer.md` prompt: girdiyi kendisi toplar; draft→spec:check→final; Revizyon Geçmişi; SPEC değiştirmez/önerir; NIS-2 maddesi |
| T-3 | StrykerJS kurulumu: devDep + `stryker.conf.mjs` + `test:mutation` script'i; eşik 80/kritik 90 |
| T-4 | `AGENTS.md` iş akışı güncellemesi: 4 aşama, SPEC konumu+taşıma, mutasyon kapısı, reviewer Tab geçişi, KAPANIŞ otomasyon maddesi |
| T-5 | Doğrulama paketi: tools-vs-permission, GLM-5.3 çağrılabilirlik, Tab model anahtarı, Stryker monorepo hedefleme, `/kapanis` komutu |
