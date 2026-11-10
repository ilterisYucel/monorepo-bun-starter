---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, boss, superadmin, app]
review_date: 2026-11-10
---

# Boss — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [BOSS-MIMARISI.md](./BOSS-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Doğrulama kapanışı — `apps/superadmin` bu turda değişmedi; 13 test dosyası envanter eşleşmesi + kod incelemesi.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `apps/superadmin/src/features/fields/hooks/useAdminFields.tsx#useAdminFields` | (doğrulama) saha listesi/kayıt API kaynaklı; cache invalidation testi | K4/FR-1.1 |
| 2 | `apps/superadmin/src/features/fields/components/FieldRemoteFrame.tsx#FieldRemoteFrame` | (doğrulama) mount'ta uzak oturum + iframe kurar; hata→mesaj, iframe YOK; Kapat/Escape temizliği | K2/FR-2.1 |
| 3 | `apps/superadmin/src/lib/api-client.ts` | (doğrulama) refresh kuyruğu AK- etiketli testlerle (tek refresh, döngü koruması) | K1 oturum |
| 4 | `apps/superadmin/src/features/fields/mappers.ts#toFieldMarker` | (doğrulama) harita işareti türetimi (online/warning/offline, taşınan null→undefined) | UC-1 akış #3 |
| 5 | Doğrudan konteyner bağlantısı | (doğrulama) kod yüzeyinde konteyner-eğlik istek YOK — erişim yalnız site subpath tüneli üzerinden (iframe src) | K2/Purity 1, K3 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | glob apps/superadmin | **13 test dosyası** — SPEC iddiasıyla birebir |
| Saha | `useAdminFields.test.tsx` (2: liste + cache invalidation), FieldsPage/FieldDetailPage/FieldFormModal testleri | |
| Uzak erişim | `FieldRemoteFrame.test.tsx` (4: oturum+iframe, hata→iframe yok, kapat, Escape) | |
| Pazar | `MarketPage.test.tsx` mevcut (API kaynaklı pazar görünümü) | |
| Oturum/nav | api-client (5), AuthStore (3), BossShell (3), app.test (3), NotificationsPage, LoginPage | |
| B1 (boss compose) | deployment grep: `SERVICE_TIER` yalnız container/field | **B1 DOĞRULANDI: boss tier yok** — DEPLOYMENT K10 ile aynı boşluk |
| Taze test koşusu | `nx run superadmin:test` | **İLETİLMEDİ** — reviewer salt-okuma (G1) |
| Mutasyon | `bun run test:mutation` | **verisi yok** — değişen dosya yok |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Saha listesi/detayı API'den; UI'da kopya veri yok | useAdminFields #1–2 + sayfa testleri | 🟡 |
| AK-2.1 | Uzak UI yalnız subpath tüneli (iframe) | FieldRemoteFrame #1–4 | 🟡 |
| AK-3.1 | Pazar verisi yalnız API'den | MarketPage.test.tsx — envanter | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | B1 boşluğu hâlâ canlı (kod+test var, çalışan boss ortamı yok) | SPEC K10/DEPLOYMENT ile uyumlu — bilinçli İleri İş (A1); kapanış 🟢'ü deployment'a bağlı tutmaz, not düşer |
| S2 | Taze test + mutasyon iletilmedi | G1 |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1: konteynere doğrudan yol yok; tek kapı site tüneli
- [x] Purity 2: WireGuard istisnai kanal — normal akışta çağrı yüzeyi yok
- [x] BossShell: kimliksiz → login (oturum sınırı testli)

### A.6 Genel Durum Özeti

**MODÜL UYGUN:** 3/3 AK'nın birim kanıtı mevcut (13 dosya); tek yapısal boşluk B1 — SPEC'in kendi İleri İş'i, sapma değil. **NIS-2:** uzak oturum (fieldSessionApi) token akışı AUTH'ta; boss'ta sır/kimlik mantığı yok → boşluk tanımsız. Mutasyon: uygulanmaz.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Saha listesi | mount | API'den çekilir | useAdminFields #1 |
| Kayıt sonrası | createField | cache invalidate | #2 |
| Uzak UI | saha seçilir | oturum + iframe `/fields/:fid/ui` | FieldRemoteFrame #1 |
| Tünel kapalı | oturum hatası | mesaj var, iframe yok | #2 |
| Kapat/Escape | açık frame | oturum kapanır + onClose | #3–4 |
| 401 refresh | eşzamanlı | tek refresh + retry | api-client AK-3.1 |
| Marker | saha özeti | online/warning/offline eşlemesi | mappers #1–5 |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze `nx run superadmin:test` iletilmedi | Düşük | Ana agent koşar |
| G2 | Boss tier compose (B1) | Orta — kod üretime hiç çıkmadı | DEPLOYMENT A1 / İleri İş |
| G3 | `MarketPage` iç assertion'ları bu tura detaylı okunmadı (dosya varlığı+envanter) | Düşük | bir sonraki dokunuşta AK-3.1 satır-bazlı eşleşme |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 13/13 dosya eşleşti; B1 compose boşluğu teyit edildi | (yok — SPEC değişmedi) |
