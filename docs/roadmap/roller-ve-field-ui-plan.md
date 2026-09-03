# Refactor Planı — Roller Güncellemesi + Field UI

> Durum: **TAMAMLANDI** (2026-08-30) — Faz 1-4 kapalı.
> Doğrulama kaydı: `docs/architecture/KONTEYNER-UZAKTAN-ERISIM-DOGRULAMA.md` §6-§7.
> Kaynak kararlar kullanıcıyla netleştirilmiştir; her değişiklik TDD kurallarına tabidir
> (bkz. AGENTS.md / TESTING.md — dokunulacak testsiz dosya önce karakterizasyon testi).
>
> **Kapalı fazlar:** Faz 1 (Field UI: PCS kart + detay/config modalları, konteyner detay =
> dashboard, kayıt modal'ı + adres kaldırma, Settings sayfası, topoloji kaldırma, 1:1 PCS
> dummy, i18n), Faz 2 (roller backend: developer, rbac, birebir tünel eşlemesi, otomatik
> guest muafiyetleri, DB CHECK migration), Faz 3 (roller frontend: auto-guest, NAV
> filtreleri, container-web guard/sidebar), Faz 4 (kapanış — DOGRULAMA.md §6-§7).
>
> **Test durumu:** web-service 526/526, field 92/92, container-web 60/60, shared-types
> 111/111, ui 43/43, shared-utils 7/7.
>
> **Uygulama notları (plan üstü kararlar):**
> - Otomatik guest akışı için: guest seed'i `mustChangePassword: false` yapıldı +
>   rbac/frontend guard'larında guest MUAFİYETİ eklendi (zorunlu şifre değişimi guest'e
>   uygulanmaz) — aksi halde otomatik giriş change-password ekranına kilitlenirdi.
> - `container_url` DB kolonu korundu (nullable); yeni kayıtlarda NULL yazılır.
> - MFA_REQUIRED_ROLES izin listesine developer eklendi (shared-utils + web-service).
> - **Sapma 1.6:** `mockLogs.ts`'e dokunulmadı — içerik zaten 1 konteyner = 1 PCS ile
>   uyumluydu (PCS-1→container-1, PCS-2→container-2, PCS-3→container-3); güncelleme
>   gerekmedi.
> - **Sapma 1.5:** `derivePcsRows` KORUNDU — Panel istatistik kartları (PCS sayacı,
>   şarj/deşarj gücü) ondan besleniyor; yalnız topoloji UI'ı + i18n anahtarları silindi.
> - **Sapma Faz 4:** repo'da field/web-service/container-web projelerinde lint target'ı
>   YOKTUR (yalnız packages/ui + container-desktop target'ları var — ancak ESLint
>   konfigürasyonu repo'da çalışır durumda değil: flat config bulunamıyor, `nx run ui:lint`
>   mevcut borçtan kırık) → "lint geçişi" maddesi N/A.
>   Root `test:coverage` script'i kırık (vitest.workspace.ts config yükleme hatası —
>   mevcut borç); güvenlik-kritik dosyalar için HEDEFLİ coverage alındı
>   (bkz. DOGRULAMA.md KR5). token-adapter branch 77.8 (mevcut borç — Faz R dokunmadı).

## Netleşen kararlar

- Rol seti (iki uygulamada da): `admin`, `teknik`, `boss` (UI etiketi: Patron), `guest`,
  `developer`. Kod İngilizce, arayüz Türkçe ("patron İngilizce boss demek zaten").
- **Guest:** Token yoksa veya çıkış yapıldıysa otomatik guest login — container-web'deki
  mevcut pattern (`AuthStore.loginAsGuest` + logout sonrası re-login,
  `apps/container-web/src/features/auth/stores/AuthStore.ts:23-24,83`). Manuel guest
  girişi gerekmez.
- **Tünel eşlemesi birebir:** `mapFieldRole` → admin→admin, teknik→teknik, boss→boss,
  guest→guest, developer→developer. Patron'un konteynerde manevra/kullanıcı yasağı
  rbac matrisiyle zaten korunur (commands/users yalnız admin+teknik). Konteyner tarafında
  asset yönetimi yoktur.
- **Developer:** Şimdilik guest gibi sadece görüntüleme; monitoring/error-detection
  sayfaları tasarlanınca genişleyecek.
- **Tema:** Settings'te dark/light toggle, şimdilik no-op + "yakında" (container-web ile
  aynı davranış — gerçek tema altyapısı hiçbir yerde yok).
- **Konteyner kaydı:** Modal içinde; **adres (containerUrl) alanı tamamen kaldırılır**
  (form + payload + response + frontend tipi). DB kolonu nullable kalır.
- **PCS:** 1 konteyner = 1 PCS. Detay sayfasında RackCard benzeri tek kart + Detay/Config
  butonları.

---

## Faz 1 — Field UI (ÖNCELİK)

### 1.1 Konteyner detay sayfası = konteyner dashboard'u
`apps/field/src/pages/ContainerDetailPage.tsx` yeniden yapılandırılır:
- **Üst:** Tek PCS kartı (RackCard formatında — `onDetailClick`/config aksiyonlu).
  `PcsSection` "PCS-* önekli tüm cihazları listele" mantığından "konteyner başına tek PCS"
  modeline geçer.
- **Alt:** `DashBoardPageV2` uyarlaması — snapshot telemetrisinden DeviceGauges blokları
  (BSC, HVAC, CB, DC Output, Energy Analyzer, Fire Panel).
- Mevcut stat kartları (SoC, durum, cihaz sayısı, son görülme) korunur.

### 1.2 PCS kartı + Detay/Config modal'ları
- `PcsCard.tsx` → RackCard benzeri yeni tasarım (durum rengi, AC aktif güç, DC
  voltaj/akım, enerji sayaçları) + **Detay** ve **Config** butonları.
- Detay modal'ı: `packages/ui` `DeviceDetailModal` pattern'i (`IDeviceDetailProvider`
  field implementasyonu → snapshot'tan PCS cihaz kaydı).
- Config modal'ı: şimdilik kayıt/bağlantı bilgileri (containerId, connectionStatus,
  lastSeenAt, layout, akan telemetri envanteri).
  *Not: Gerçek device config'in container→field akışı yok — ayrı backend fazı.*

### 1.3 Kayıt formu modal'a taşınır + adres kaldırılır
- `ContainersPage.tsx`: inline form yerine "+ Konteyner Kaydet" butonu →
  `RegisterContainerForm` modal içinde (container-web RackDetailModal pattern'i).
- `containerUrl` kaldırılır: `RegisterContainerForm.tsx`, `containersApi.ts` (payload),
  `FieldContainer` tipi.
- **Backend:** `services/web-service/src/presentation/routes/field-routes.ts:282-316`
  register payload'ından `containerUrl` zorunluluğu kalkar; DB'ye NULL yazılır; listeleme
  response'larından (`field-routes.ts:115,150`) kaldırılır.
- Testler: `RegisterContainerForm.test.tsx`, `field-routes.test.ts` güncellenir.

### 1.4 Settings sayfası (yeni)
- Route `/field/:fieldId/settings` + sidebar'a settings ikonu.
- `settingsStore` (Zustand persist, container-web'deki gibi): dil seçimi **çalışır**
  (`setLocale`), tema toggle **no-op + "yakında"**.
- `providers.tsx`'teki localStorage locale okuması settingsStore'a taşınır.

### 1.5 Panel'den "Saha Enerji Akışı" kaldırılır
- `FieldDashboardPage.tsx:105-250` topoloji bölümü silinir; istatistik kartları +
  konteyner sparkline grid'i kalır.
- `deriveDashboard.ts` topoloji fonksiyonları + ilgili i18n anahtarları temizlenir.

### 1.6 Dummy veri 1:1 PCS modeline çekilir
- `apps/field/src/features/field-control/maneuvers.ts:6`
  `PCS_IDS = ["PCS-1","PCS-2","PCS-3"]` kaldırılır (manevra adımları konteyner başına).
- `mockDataGenerator.ts` konteynerlerine PCS telemetrisi eklenir (her konteynere 1 PCS).
- `FieldDevicesPage.tsx:13` hardcoded `"PCS-1"` → snapshot'tan türetilir;
  `mockLogs.ts` PCS referansları güncellenir.

### 1.7 Field i18n tamamlama
- Yeni anahtarlar tr/en: settings.*, PCS kart/modal, kayıt modal'ı, rol etiketleri.
- Hardcoded stringler: `providers.tsx:60,66` (ErrorBoundary), `SystemHeader.tsx:43`
  ("PCS x/y"), `PcsCard.tsx:88` ("PF"), `FieldDashboardPage.tsx` kısaltmaları.

---

## Faz 2 — Roller: Backend

- `packages/shared-types/src/auth.ts`: `Role`'a `developer` ekle.
- `services/web-service/src/domain/validation/auth-schemas.ts`: zod enum'a `developer`.
- `services/web-service/src/presentation/middleware/rbac.ts` matris:
  - `/api/fields GET` → guest + developer dahil (field dashboard verileri).
  - `/api/data` → tüm roller (mevcut) + developer.
  - commands/users değişmez (admin/teknik, admin).
  - `/api/fields POST` (register): admin, boss (değişmez — asset yönetimi patron'da).
- `field-routes.ts` `userCanAccessField`: guest/developer her sahayı görür (fieldIds kısıtı
  yalnız teknik için).
- `alarm-routes.ts` resolve: admin, teknik (değişmez).
- `session-gateway.ts` `mapFieldRole` → birebir eşleme (guest→guest oturumu artık
  reddedilmez; konteyner tarafı aynı rbac matrisiyle korur).
- Seed: developer seed edilmez (admin oluşturur).
- Testler: `rbac.test.ts`, `field-routes.test.ts`, `auth-routes.test.ts`,
  `session-gateway.test.ts` güncellenir; yeni karakterizasyon testleri.

## Faz 3 — Roller: Frontend

- **Field:**
  - `AuthStore`'a `loginAsGuest` + logout sonrası re-login; uygulama açılışında token
    yoksa otomatik guest login.
  - `FieldShell` NAV filtreleri: guest/developer → yalnız Panel; boss → Kontrol gizli.
  - Boss `/map` redirect'i kaldırılır (`FieldShell.tsx:51-53`) — boss artık field app'i
    kullanır (asset yönetimi + veri görüntüleme).
- **Container-web:**
  - Route guard'ları boss/guest/developer'a göre güncellenir (guest/developer: dashboard
    + one-line; boss: tüm sayfalar, kontrol/kullanıcı gizli).
  - Sidebar, UserCreateForm rol listesi, UserList rozetleri; rol i18n etiketleri.
- **superadmin:** rol i18n etiketleri (`src/i18n/tr.ts`, `en.ts`).

## Faz 4 — Kapanış

- `docs/architecture/KONTEYNER-UZAKTAN-ERISIM-DOGRULAMA.md`'ye faz girişleri.
- Tüm testler + lint geçişi; SonarCloud kapıları (güvenlik-kritik dosyalarda ≥%90 branch).
- `review_date` güncellemesi.

## Açık nokta (kapsam dışı — ayrı faz)

- Gerçek PCS device config akışı (container→field config push / ContainerProxy config
  frame'i) — Config modal'ı ileride bu veriyle doldurulur.
