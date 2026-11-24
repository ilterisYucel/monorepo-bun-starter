---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, site, app]
review_date: 2026-11-24
---
> **Not (2026-11-11):** `apps/demo-field` → `apps/site` oldu; eski site sürümü (`site-v1.1`) 2026-11-11'de kaldırıldı. Aşağıdaki dosya yolları kaldırılan sürüme aittir.


# Site — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [SITE-MIMARISI.md](./SITE-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** `apps/field → apps/site` rename turu + doğrulama kapanışı; davranış KORUNDU (K5), env/import yüzeyi taşındı.
> **UC-4 turu (2026-11-24):** Zorunlu şifre değişimi sayfası geri geldi (K6; MFA kayıt sayfası A3 ile kapsam dışı). UC-4 satırları aşağıda `UC-4` etiketiyle eklendi.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `apps/field/** → apps/site/**` | (değişiklik) tam rename: klasör/package/nx/compose-adları; kimlik/wire adları KORUNDU (`VITE_FIELD_ID`, `FIELD_ID`, `peerType:"field"`) | K5/K2 |
| 2 | `apps/site/src/lib/api-base.ts#isTunnelMode` | (doğrulama) tünel subpath tespiti + `fieldRootPath` önek üretimi; testli | K2/FR-2.1 |
| 3 | `apps/site/src/lib/api-client.ts` | (doğrulama) refresh kuyruğu + tünel-guard (401'de İNERT), tam state temizliği — AK etiketli testlerle (AK-1.1..1.4) | K3 |
| 4 | `apps/site/src/features/field-devices/hooks/useFieldDevices.ts#deriveDevicesFromSnapshot` | (doğrulama) snapshot'tan cihaz türetimi (benzersiz deviceId, tip önek, en-yeni birleştirme) — 7 test | K1/FR-1.2 |
| 5 | `apps/site/src/features/field-control/services/fieldManeuverApi.ts#fieldManeuverApi` | (doğrulama) katalog sunucudan (`listManeuvers/listOperations`); panelde "gizli manevra YOKTUR" testi | K4/FR-3.1 |
| 6 | Kalıntı taraması | (doğrulama) `apps/field` import kalıntısı YOK (yalnız superadmin yorum satırı) | SC-3 |
| 7 | `apps/site/src/lib/site-field.ts#postLoginDestination` | (UC-4) `mustChangePassword===true` ve rol `guest` değilse `{ path: "/change-password" }`; saha kimliği kontrolünden ÖNCE; test: `site-field.test.ts` 4 yeni `it` (AK-4.2, AK-4.7 guest, false→/projects) — yeşil | K6/FR-4.2 |
| 8 | `apps/site/src/pages/ChangePasswordPage.tsx#ChangePasswordPage` | (UC-4, yeni) 3 alanlı form; istemci ön doğrulaması (`<8`, eşleşme); `changePassword` başarısında `postLoginDestination` hedefine `replace`; hatada mesaj + sayfada kalma; oturumsuz → `/login` — `ChangePasswordPage.test.tsx` (13 `it`) yeşil | K6/FR-4.3..4.6 |
| 9 | `apps/site/src/pages/ChangePasswordPage.css` | (UC-4, yeni) co-located nova `--nm-*` stili; test yok (saf stil) | K6 |
| 10 | `apps/site/src/layouts/DemoShell.tsx#DemoShell` | (UC-4) auth guard'dan sonra `mustChangePassword` guard'ı (guest + tünel muaf); `DemoShell.test.tsx` 6 guard + 11 karakterizasyon `it` — yeşil | K6/FR-4.1/FR-4.7 |
| 11 | `apps/site/src/app/routes.tsx#routes` | (UC-4) kabuk DIŞINDA `/change-password` rotası; `routes.test.tsx` (4 `it`) yeşil — S1/G3 (routes testi yok) bu turla kapandı | K6/FR-4.1 |
| 12 | `docs/roadmap/test-envanteri.otomatik.md` | (UC-4) `bun run test:inventory` ile yeniden üretildi (elle düzenlenmedi) | AGENTS test envanteri |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | glob + grep `it(` apps/site | **26 test dosyası** (SPEC iddiasıyla birebir) ; src içi **149 `it()`** + kök `vite-config.test.ts` ≈ SPEC'in 151'i (±2, envanter aracıyla netleşir) |
| Talep-üzeri/veri | useContainerData (6), useContainerTelemetry (2), containersApi (7) | |
| Türetim | useFieldDevices (7), useContainerDevices (4, tünel+fallback), derivePcsSummaries (2), deriveDashboard (11) | |
| Tünel/auth | api-base (7: önek + trailing-slash + alt-route), api-client (8: refresh kuyruğu AK-1.1..1.4 etiketli), App.test (3: hydrate/auto-guest K3), site-field (8), AuthStore (6), nav-visibility (4) | |
| Manevra | fieldManeuverApi (3) + defs (4) + FieldManeuverPanel (5) + AdminOperationsPage (4) | |
| B1 kopya | `git diff --no-index apps/site/src/lib/api-base.ts apps/site/src/lib/api-base.ts` | **bayt bayt aynı** — kopya borcu DOĞRULANDI (A2 ileri iş) |
| Taze test koşusu | `nx run site:test` | **İLETİLMEDİ** — reviewer salt-okuma (G1); UC-4 için aşağıdaki developer kanıtı var |
| UC-4 site testleri (developer) | `apps/site` içinde `node ..\..\node_modules\vitest\vitest.mjs run` (Node 26, `NODE_OPTIONS=--no-experimental-webstorage`) | **143/143 yeşil** (reviewer yeniden koşmadı; developer beyanı) |
| UC-4 mutasyon (developer) | StrykerJS `--force` tam koşu | **%93,07** (eşik %80 ✓): routes.tsx %100; ChangePasswordPage.tsx %95,92; site-field.ts %91,67; DemoShell.tsx %90,08. Hayatta kalanlar §B.2 G4..G6 |
| UC-4 lint/tip (developer) | ESLint; `tsc -b` | ESLint **KOŞMADI** (`tools/eslint-plugin-energy/dist` derlenemedi); `tsc -b` site'ta önceden var olan çok sayıda hata veriyor, dokunulan dosyalarda hata YOK (S5) |
| UC-4 gözle deneme | tarayıcı/test stack | **YAPILMADI** (SC-4; S4) |
| Mutasyon | `bun run test:mutation` | **İLETİLMEDİ** — rename+modifize dosyalar (RM) değişen sayılır; ana agent koşmalı (G2) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Veri talep üzerine; canlı yalnız latest snapshot | useContainerTelemetry (series isteği) + useContainerData envanteri | 🟡 |
| AK-1.2 | Cihaz listesi snapshot'tan türetilir | useFieldDevices #1–7 (eksik/bilinmeyen önek dahil) | 🟡 |
| AK-2.1 | Uzak UI aynı tünelden subpath ile | api-base #3/#5/#6/#7 (`/fields/:fid/ui` + isTunnelMode) | 🟡 |
| AK-2.2 | Login rotası önekli | routes.test DOSYA OLARAK YOK; karşılık: App.test guard'ları + site-field yönlendirme testleri + api-base `fieldRootPath` | 🟡 |
| AK-3.1 | Katalog yalnız sunucudan | fieldManeuverApi #1 + FieldManeuverPanel "kartlar sunucudan gelir" | 🟡 |
| AK-4.1 | `mustChangePassword` admin → `/projects` açılınca `/change-password`, proje sayfası render edilmez | `DemoShell.test.tsx` "AK-4.1: admin mustChangePassword=true → /change-password, alt sayfa render edilmez"; kod `DemoShell.tsx#DemoShell` | 🟢 |
| AK-4.2 | Boş `VITE_FIELD_ID` iken şifre değişimi önceliği | `site-field.test.ts` "AK-4.2: ... saha kimliği hatasından önce gelir (fieldId boş)" + "(fieldId varken)"; kod `site-field.ts#postLoginDestination` | 🟢 |
| AK-4.3 | 7 karakter / tekrar farklı → hata, `changePassword` çağrılmaz | `ChangePasswordPage.test.tsx` "AK-4.3: ... 8 karakterden kısaysa" + "tekrar eşleşmezse" + sınır testi (tam 8 kabul) | 🟢 |
| AK-4.4 | Başarı: `changePassword(eski,yeni)` bir kez + `/projects` `replace` | `ChangePasswordPage.test.tsx` "AK-4.4: başarılı değişimde ..." | 🟢 |
| AK-4.5 | Sunucu hatası → "Şifre değiştirilemedi", navigasyon yok | `ChangePasswordPage.test.tsx` "AK-4.5: sunucu hatasında mesaj gösterir, navigasyon yapmaz" | 🟢 |
| AK-4.6 | Oturum yok → `/login` | `ChangePasswordPage.test.tsx` "AK-4.6" x3 (oturum yok / user yok / oturum düşmüş) | 🟢 |
| AK-4.7 | guest ve tünel modunda guard yok | `DemoShell.test.tsx` "AK-4.7: guest ..." + "AK-4.7: tünel modunda ..." ; `site-field.test.ts` "AK-4.7: guest ..." (hedef tarafı) | 🟢 |
| SC-4 | Taze DB'de seed admin → şifre değişimi → veriler görünür | **gözle deneme YAPILMADI** — komut/test kanıtı yok (S4) | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | AK-2.2 kanıt etiketi: SPEC `unit (routes)` diyor, `routes.test.*` dosyası yok | Önek davranışı fiilen api-base+App+site-field testleriyle sabit — kanıt ZAYIF değil, ETİKETİ yanlış; SPEC kanıt hücresi düzeltme önerisi |
| S2 | B1 borcu canlı: iki `api-base.ts` bayt bayt aynı | A2 (ortak lib) İleri İş'i doğrulandı; kopya şu an drift üretmiyor (testler site tarafında) |
| S3 | Taze test + mutasyon iletilmedi | K5 "davranış değişmez" iddiasının komut kanıtı eksik (G1/G2) |
| S4 | UC-4 / SC-4: uçtan uca gözle deneme yapılmadı | Taze DB + seed admin/boss ile giriş→şifre değişimi→veri akışı tarayıcıda denenmedi; site-web imajı yeniden derlenmeli. Birim kanıtları tamam; SC-4 "gözle" ölçümü açık. Etki: orta (gerçek backend 403 + token yenileme entegrasyonu birim testlerde mock) |
| S5 | UC-4: ESLint koşmadı; `tsc -b` site'ta önceden hatalı | `tools/eslint-plugin-energy/dist` derlenemedi; `tsc -b` önceden var olan hatalar veriyor, dokunulan dosyalarda yok (developer beyanı, reviewer doğrulamadı). Etki: düşük-orta (Elegant Object/lint kuralları denetlenmedi) |
| S6 | UC-4 Edge Cases "Şifre değişiminde çıkış → `/login`'e döner" karşılıksız | `apps/site/src/pages/ChangePasswordPage.tsx#ChangePasswordPage` içinde çıkış kontrolü YOK ve test yok; `mustChangePassword` iken backend 403 nedeniyle kullanıcının sayfadan başka çıkış yolu yok. SPEC Edge Case iddiası ya SPEC'ten çıkarılmalı ya da çıkış düğmesi eklenmeli — karar developer'da. **Çözüldü (2026-11-24):** satır SPEC'ten çıkarıldı, çıkış düğmesi kapsam dışı (bkz. Revizyon Geçmişi) |
| S7 | `ChangePasswordPage` guest/tünel için kendi içinde koruma taşımaz | Guard yalnız `DemoShell`'de (FR-4.7); guest oturumuyla `/change-password` elle açılırsa form görünür ve `/auth/change-password` çağrılır. SPEC bunu zorunlu kılmaz; etki: düşük (not) |
| S8 | SPEC UC-4 Status hâlâ `🟡 Geliştirmede` | AK tablosu 🟢 ve T-4..T-6 `[x]`; `🟢 Doğrulanmış` yükseltmesi developer kararı (reviewer SPEC'e dokunmaz) |
| S9 | S1/G3 UC-4 turuyla kısmen çözüldü | `apps/site/src/app/routes.test.tsx` artık var (4 `it`); ancak AK-2.2 satırı bu turda yeniden değerlendirilmedi (routes.test.tsx rota tablosunu sabitler, önekli login davranışını değil) |

### A.5 Gözle Kontrol Maddeleri

- [x] Veri kopyalanmıyor — site state'i snapshot/tünel kaynaklı, ayrı depo yok (K1/Purity 1)
- [x] Konteyner UI yeniden yazılmadı — tünel iframe/Frame akışı (Purity 2)
- [x] auto-guest kaldırıldı; clearSession tam temizlik (K3 — AuthStore AK-2.1/2.2 etiketli testler)
- [x] Domain env adları korundu — yalnız uygulama adı rename (K5/A1)
- [x] UC-4: `postLoginDestination` şifre değişimini saha kimliği kontrolünden önce döndürür (kod okundu)
- [x] UC-4: `ChangePasswordPage` sunucu politikasını çoğaltmıyor — yalnız `<8` ve eşleşme ön doğrulaması; `max(100)` istemcide yok, sunucu yetkili (SPEC uyumlu)
- [x] UC-4: MFA kayıt yönlendirmesi yok; `mfaRequiredRoles` kullanılmayan imza parametresi (A3)
- [ ] UC-4: tarayıcıda seed admin/boss ile uçtan uca deneme (SC-4) — YAPILMADI (S4)
- [ ] UC-4: ESLint temiz (S5) — KOŞMADI

### A.6 Genel Durum Özeti

**MODÜL UYGUN:** rename davranışı bozmadı; 26 dosyalık test envanteri AK'ları fiilen karşılıyor. Tek semantik sapma S1 (kanıt etiketi). **NIS-2:** oturum/refresh yüzeyi — güvenlik kararları AUTH SPEC'te (kopya yok, referans var ✓). Mutasyon için G2 bekliyor.

**UC-4 (2026-11-24): MODÜL UYGUN — açık maddeler var.** Tüm FR-4.1..4.7 ve AK-4.1..4.7 kodda ve testte karşılığını buluyor (143/143 yeşil, mutasyon %93,07 ≥ %80). Açık: S4 (gözle SC-4), S5 (ESLint), S6 (çıkış kontrolü edge case'i karşılıksız). Güvenlik: backend enforcement/politika AUTH'ta; istemci guard'ı yalnız UX (sunucu tek yetkili). Elegant Object/ESLint denetimi yapılamadı.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Tünel subpath | `/fields/:fid/ui/...` | apiBase önekli; isTunnelMode true | api-base #3/#5/#6 |
| Normal yol | `/dashboard` vb. | düz `/api`; tünel false | api-base #2/#4 |
| Eşzamanlı 401 | N istek | TEK refresh + hepsi retry | api-client AK-1.1 |
| Tünelde 401 | boss localStorage | İNERT — dokunmaz | api-client AK-1.4 |
| Refresh fail | token yok | temizlik + /login navigasyonu | api-client AK-1.3 |
| auto-guest | standalone boot | hydrate ÇAĞRILMAZ | App.test #1 (K3) |
| Cihaz türetimi | snapshot | benzersiz+tip önek+en yeni | useFieldDevices #1–7 |
| Tünel cihaz listesi | oturum açılır | source=tunnel; hata→snapshot fallback | useContainerDevices #1–4 |
| Katalog | panel açılır | sunucu listesi; gizli yok | FieldManeuverPanel #1 |
| Login öneki (AK-2.2) | önekli login | rotalar önekte çözülür | App/site-field — S1 |
| UC-4 guard | admin, `mustChangePassword=true`, `/projects` | `/change-password`; alt sayfa yok | DemoShell AK-4.1 |
| UC-4 guard muafiyeti | guest ya da tünel modu | yönlendirme yok | DemoShell AK-4.7 (x2) |
| UC-4 guard negatif | `mustChangePassword=false`; oturum yok; user nesnesi yok | sayfa render / `/login` / çökme yok | DemoShell guard testleri #4-#6 |
| UC-4 hedef önceliği | `mustChangePassword`, `fieldId` boş/dolu | `/change-password` (saha hatasından önce) | site-field AK-4.2 (x2) |
| UC-4 hedef: guest/false | guest+zorunlu; `false` | `/projects` | site-field AK-4.7 + "false → /projects" |
| UC-4 ön doğrulama | yeni şifre 7 kr. / tekrar farklı | hata mesajı, istek yok | ChangePasswordPage AK-4.3 (x2) |
| UC-4 sınır | tam 8 karakter | kabul edilir | ChangePasswordPage "AK-4.3 sınırı" |
| UC-4 başarı | geçerli form, sunucu 200 | `changePassword` 1x; `/projects` `replace` | ChangePasswordPage AK-4.4 |
| UC-4 sunucu hatası | sunucu reddi (yanlış mevcut şifre vb.) | "Şifre değiştirilemedi", navigasyon yok | ChangePasswordPage AK-4.5 |
| UC-4 hata temizliği | ardışık gönderim | önceki hata silinir | ChangePasswordPage "yeni gönderimde önceki hata temizlenir" |
| UC-4 saha kimliği boş | değişim sonrası `VITE_FIELD_ID` boş | açık hata, navigasyon yok | ChangePasswordPage "değişim sonrası saha kimliği boşsa..." |
| UC-4 oturumsuz | oturum/kullanıcı yok ya da düşmüş | `/login` | ChangePasswordPage AK-4.6 (x3) |
| UC-4 rota tablosu | `routes` | `/change-password` kabuk DIŞINDA | routes.test AK-4 + "üst seviye rotalar" |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze `nx run site:test` iletilmedi | Düşük | Ana agent koşar (K5 iddiasının komut kanıtı) |
| G2 | Mutasyon verisi yok (RM-dosyalar) | Orta | `bun run test:mutation` — rename turları sessiz drift üretmesin |
| G3 | routes.tsx'in kendi başına birim testi yok (S1) | Düşük — dolaylı kapsamlı | **KAPANDI (UC-4 turu):** `routes.test.tsx` eklendi |
| G4 | UC-4 / `ChangePasswordPage.tsx#ChangePasswordPage`: 2 hayatta kalan mutant — `[]` (kullanılmayan `mfaRequiredRoles` argümanı) ve `{...user, mustChangePassword:false}` → `{}` | Düşük — EŞDEĞER mutantlar (davranış değişmez) | gerekmez; belgelenmiş |
| G5 | UC-4 / `site-field.ts#siteFieldId`: `?? ""` için 2 hayatta kalan mutant | Düşük — derleme zamanı env (`import.meta.env`) test edilemez | gerekmez |
| G6 | UC-4 / `DemoShell.tsx#DemoShell`: 12 hayatta kalan mutant (sekme `className` active, tema `aria-pressed`, sekme `to` şablonları, logout `replace`) | Düşük — UC-4 dışı stil/gezinme ayrıntısı; DemoShell %90,08 eşik üstü | istenirse karakterizasyon testleri genişletilir |
| G7 | UC-4: tarayıcı/e2e uçtan uca (taze DB, seed admin → şifre değişimi → veri) | Orta — SC-4 gözle ölçümü; gerçek backend 403/token yenileme birim testlerde mock | site-web imajı yeniden derlenip test stack'te elle; ileride Playwright (SITE İleri İş 2) |
| G8 | UC-4: `ChangePasswordPage`'de çıkış kontrolü ve test yok (S6); guest ile doğrudan erişim testi yok (S7) | Orta (S6) / Düşük (S7) | karar developer'da: SPEC edge case'ini düzelt ya da çıkış düğmesi + test |
| G9 | UC-4: ESLint koşmadı (S5) | Düşük-Orta | `tools/eslint-plugin-energy` derlenince lint koş |

**review_date:** 2026-11-24

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış (rename turu): 26 dosya/≈151 test eşleşti; B1 kopya bayt-bayt doğrulandı; S1 kanıt etiketi notu | (yok — SPEC değişmedi) |
| 2026-11-24 | UC-4 (Zorunlu Şifre Değişimi, K6/A3) kapanışı: FR-4.1..4.7 / AK-4.1..4.7 kod+test eşleşti; 143/143 test, mutasyon %93,07; S4..S9 sapmaları ve G4..G9 boşlukları eklendi; G3 (routes testi) kapandı | UC-4, K6, A3, SC-4 (SPEC değişmedi; Status kararı developer'da, S8) |
| 2026-11-24 | S6 çözümü (developer kararı): "Şifre değişiminde çıkış" Edge Case satırı SPEC'ten çıkarıldı; sayfada çıkış düğmesi kapsam dışı olarak "hariç"e yazıldı. Kod ve AK değişmedi | UC-4 Edge Cases + Kapsam/hariç (AK değişmedi) |
| 2026-11-24 | S8 çözümü (developer kararı): UC-4 Status `🟢 Doğrulanmış`. S4 (SC-4 gözle deneme) ve S5 (ESLint) açık madde olarak kalır | UC-4 Status |
