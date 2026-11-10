---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, epias, tgt, guvenlik]
review_date: 2026-11-10
---

# EPİAŞ Client — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [EPIAS-CLIENT-MIMARISI.md](./EPIAS-CLIENT-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Doğrulama kapanışı — paket bu turda değişmedi; B2 (düz metin sır config'i) bu turda `{env:}` ile KAPANDI (S2 notu: geçmiş rotasyonu).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/epias-client/src/ticket-store.ts#EpiasTicketStore` | (doğrulama) TTL/renewBefore (`renewBeforeMs` default'lı); kullanıcı başına `inFlight` Map; yalnız HTTP 201 kabul; HTML'den `TGT-` regex; `Mozilla/5.0` UA; tmp+rename atomik yazım | K1–K4 |
| 2 | `packages/epias-client/src/client.ts#EpiasClient` | (doğrulama) TGT header enjeksiyonu; 401 → invalidate + TEK retry; +03:00 biçimleme (`toEpiasIso`) | K5/K6/K7 |
| 3 | `services/integration-service/config/plugins/epias-market-prices.json` (diff'li) | (değişiklik) düz metin kullanıcı/şifre → `{env:EPIAS_USERNAME}` / `{env:EPIAS_PASSWORD}` — B2/T-18 ÇÖZÜLDÜ (çözüm plugin-sdk `context.ts#substituteEnvRefs`) | B2/K6(INTEGRATION) |
| 4 | `ticket-store.ts` (yazım izinleri) | (SAPMA) `writeFile` çağrısında `mode: 0o600` YOK — GWT edge "Dosya izni 0600" implemente edilmedi | UC-1 edge — S1 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | grep `it(` epias-client | **15 test / 2 dosya** (`client.test.ts` 6 + `ticket-store.test.ts` 9) — SPEC "mevcut 15 test" DOĞRULANDI |
| TGT yaşamı | #ticket-store: ilk alım+dosya yazımı, HTML TGT regex, TGT'siz HTML→hata, gecerli bilette CAS Yok (throttle), expiry yenileme, dosya kalıcılığı, eşzamanlı tek CAS, invalidate, 201-dışı→hata | |
| İstemci | #client: TGT header, +03:00 (UTC+kış), 401 tek retry, reuse, UTC/DSK bicimleme | |
| Dosya izni | — | **KAPSANMAYAN** (G3/S1) |
| Taze test koşusu | `nx run epias-client:test` | **İLETİLMEDİ** — reviewer salt-okuma (G1) |
| Mutasyon | `bun run test:mutation` | **verisi yok** — değişen dosya yok (config json test kapsamı dışı) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Geçerli bilet yeniden kullanılır | ticket-store "gecerli bilet varken CAS'e tekrar istek atmaz" + client "ayni client, bilet gecerliyken tek TGT" | 🟡 |
| AK-1.2 | Eşzamanlı tek CAS (inFlight) | ticket-store "es zamanli isteklerde tek CAS cagrisi" | 🟡 |
| AK-1.3 | 401 → invalidate + bir kez retry | client "401 alinirsa ... bir kez tekrarlanir" + "invalidate sonrasi ... yeniden alinir" | 🟡 |
| AK-2.1 | Her istek TGT header taşır | client "once CAS'ten TGT alir, istege TGT header'i ekler" | 🟡 |
| AK-3.1 | Sabit +03:00 | client "ptf — +03:00", "UTC → +03:00", "kis aylarinda sabit +03:00" | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | **Dosya izni 0600 GWT edge'i implemente edilmedi** | Bilet dosyası varsayılan umask ile (tipik 644) yazılıyor — TGT düz metni local-disk okuyucularına sızabilir. Güvenlik-kritik; küçük düzeltme: `writeFile(tmp, ..., { mode: 0o600 })`. Karar developer |
| S2 | Sır git geçmişinde yaşıyor | B2 düzeltildi AMA eski commit'lerde `*Iy-…` parolası hâlâ okunabilir — **hesap parolası ROTASYONU zorunlu** işi (repo hijyeni yetmez). Karar developer/acil |
| S3 | `{env:VAR}` eksizse sessiz `""` | `substituteEnvRefs` `process.env[x] ?? ""` — env yoksa boş credential ile CAS 401'e gider; "activate atlar" beklentisi (INTEGRATION edge) ile tam örtüşmüyor — bkz. PLUGIN-SDK S3 |

### A.5 Gözle Kontrol Maddeleri

- [x] Auth yalnız `EpiasClient`'ta; plugin TGT bilmez (K7)
- [x] Bilet loglanmıyor — store yalnız dosyaya yazar; log yüzeyi yok (Purity 2)
- [x] Katmanlaşma: HttpClient(plugin-sdk) → EpiasClient → plugin (K7 şeması importlarla doğrulandı)

### A.6 Genel Durum Özeti

**MODÜL UYGUN — iki güvenlik aksiyonuyla:** 5/5 AK 15 testle örtüşüyor (davranış kanıtlı). **NIS-2:** paket güvenlik-kritik (credential+throttle). S1 (dosya izni) ve S2 (parola rotasyonu) doğrudan güvenlik maddeleridir — SPEC'te dosya-izni GWT olarak TANIMLI ama AK/tehdit-modeli satırı YOK; S1 kapatılmadan kapanış 🟢 olamaz. Mutasyon: uygulanmaz (kod değişmedi).

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| İlk bilet | cache boş | CAS + dosyaya tmp+rename | `ticket-store.test.ts` #1 |
| HTML TGT | 201+HTML | regex ayıklama | #2 |
| TGT'siz HTML | 201+HTML | hata; cache'e yazılmaz | #3 |
| Geçerli bilet | TTL dolmadı | CAS Yok | #4 |
| Expiry | süre doldu | yenileme | #5 |
| Kalıcılık | yeni store örneği | aynı bilet | #6 |
| Eşzamanlı | 2 istek, bilet yok | tek CAS | #7 |
| Invalidate | geçersiz kıl | yeniden alım | #8 |
| 201 dışı | 200/500 | hata | #9 |
| TGT header | fetchJson | header taşınır | `client.test.ts` #1 |
| +03:00 | UTC/kış girdisi | sabit offset | #2,#5,#6 |
| 401 | stale ticket | invalidate+tek retry | #3 |
| Dosya izni 0600 | yazım | mode 0o600 | **KAPSANMAYAN** (G3) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze `nx run epias-client:test` iletilmedi | Düşük | Ana agent koşar |
| G2 | Mutasyon verisi yok (güvenlik-kritik paket) | Orta | Değişiklik turunda `--break 90` önerisi |
| G3 | 0600 dosya izni test+implementasyon yok (S1) | **Yüksek** — TGT sızıntı yüzeyi | `mode: 0o600` + istisna testi; SPEC'e AK satırı olarak alınması (revizyon önerisi) |
| G4 | WAF/UA (`Mozilla/5.0`) ayrı testle sabit değil | Düşük | #1/#2'de header assertion eklenebilir |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 15 test eşleşti; B2 `{env}` ile kapandı; S1 (0600) + S2 (rotasyon) güvenlik maddeleri raporlandı | (yok — öneri aşamasında) |
