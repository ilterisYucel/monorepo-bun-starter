# FL Test Envanteri — Konteyner & Saha Akışlarının Katman Bazlı Test Kapsamı

> Bu doküman, FL (Function Logic) akışlarının hangi test katmanında nasıl
> kanıtlandığının CANLI envanteridir. Test genişletileceği zaman boşluk
> listesi birincil girdidir; `docs/roadmap/test-envanteri.md` ile birlikte
> güncellenir.
>
> Katmanlar: **U** = unit (simülatör/şema), **K** = kural sözleşmesi
> (rules.json testleri), **Z** = zincir spec (vitest integration — gerçek
> config/WS loopback), **E** = Playwright e2e (gerçek dev stack), **M** =
> manuel gözlem (devreye alımda).
>
> Son koşum: **2026-09-22 — 25/26 e2e yeşil** (tek istisna `tfa-throttle`:
> MFA-AÇIK ön koşulu — aşağıda G-3).

## 1. Konteyner FL'leri (KONTEYNER-MANEVRA-KATALOGU-REV03)

| FL | Akış | Tetikleyici | U | K | Z | E | Not |
|:---|:-----|:------------|:-:|:-:|:-:|:-:|:----|
| FL-01 | Başlatma (şalter AÇ + BSC start + DC ON) | manuel kart | ✅ BSC/CB sim | ✅ kayıt | ✅ executor | ✅ maneuver-ui (fl01_start) | önkoşul kapısı ileriki faz |
| FL-02 | AUX kaybı (PM5340 <180V → CB AÇ + kontaktör AÇ) | OTO kural | ✅ PM5340 sim | ✅ eşik/debounce | ✅ automation-rules FL-02 | ⏸ kural e2e'si eşik enjeksiyonu ister | S1 teyidi bekliyor |
| FL-03 | Acil durdurma (BSC emergency + şalter AÇ) | manuel kart / yan buton | ✅ | ✅ kayıt | ✅ executor | ✅ maneuver-ui (fl03) | Sidebar acil butonu maneuverApi'ye |
| FL-04 | Kalibrasyon (güç PCS'te — konteyner kartı YOK) | — | ✅ K12 saflığı | ✅ kaldırma | ✅ | — | konteynerde kart yok (K12) |
| FL-05 | TMS normal (32 kural hysteresis) + korumalar (4 kural) | OTO kural | ✅ HVAC sim | ✅ 43 kural | ✅ automation-rules (8 senaryo) | ✅ automation-rules e2e (HVAC 25.0→soğuma) | dehumid ⛔ komut yok |
| FL-06 | Şarj/Deşarj | ⛔ kapsam dışı (K12 — güç PCS S06) | ✅ referans yok | ✅ fail-safe | ✅ | — | field FL-02 operasyonuna taşındı |
| FL-07 | Kapı açık (DI → ışık + BSC stop) | OTO kural | ✅ control-panel-io sim | ✅ 4 kural | ✅ automation-rules FL-07 | ⏸ DI enjeksiyonu e2e'de yok | — |
| FL-08 | DC kısa devre (V/I/P eşikleri) | OTO kural | ✅ dc-meter sim (12) | ✅ 3 koşul | ✅ automation-rules FL-08 | ⏸ eşik enjeksiyonu | S6 reset eşiği açık |
| FL-09 | İletişim kaybı | ⛔ DEFER (K7) | ✅ gizli kart | ✅ fail-safe | ✅ | — | synthetic sinyal bekleniyor |
| FL-10 | Bakım kapatma (open_contactors + şalter AÇ) | manuel kart | ✅ | ✅ kayıt | ✅ executor | ⏸ uzak adım olarak field-maintenance e2e'sinde | — |
| FL-11 | Toprak direnci (IMD Alarm/Error) | OTO kural | ✅ IMD gerçek map (10) | ✅ 2 koşul (neq 0) | ✅ automation-rules FL-11 | ⏸ | S13 R eşiği açık |
| FL-12 | FSS modu | ⛔ doküman yok (S8) | ✅ FSS DI hazır (K5) | ✅ fail-safe | ✅ | — | doküman bekleniyor |

## 2. Saha FL'leri (FIELD-MANEVRA-KATALOGU-REV01)

| FL | Akış | Tetikleyici | U | Z | E | Not |
|:---|:-----|:------------|:-:|:-:|:-:|:----|
| FL-01 | Başlatma/Kapatma (PCS start/stop) | manuel kart | ✅ wattox sim | ✅ executor (deviceTypes) | ✅ field-maneuver (panel kartları) | hazırlık kapısı G-1/G-3 |
| FL-02 | Şarj/Deşarj → **OPERASYON** (uzak bsc_prepare + yerel pcs_charge) | manuel kart | ✅ K12 birebir | ✅ executor C1 | ✅ field-operation (terminal durum) | tek konteyner dev → rolled_back; başarı 2 konteyner sahada |
| FL-03 | Idle (set_power_zero) | manuel kart | ✅ | ✅ | ✅ field-maneuver (fl03_idle) | — |
| FL-04 | Kalibrasyon (PCS standby + timer) | manuel kart | ✅ | ✅ | ⏸ | takvim S14 açık |
| FL-05 | Acil durdurma (stop + setpoint 0) | manuel kart | ✅ | ✅ | ✅ field-maneuver (fl05) | — |
| FL-06 | Recovery (fault_reset + standby) | OTO kural R-06 | ✅ wattox sim | ✅ (rule→maneuver delegasyonu) | ⏸ | K-M4: şarj OTO geri gelmez |
| FL-07 | İletişim kaybı (PCS stop) | OTO kural R-07 | ✅ gizli kart | ⏸ | — | gövde BOŞ — doküman bekleniyor |
| FL-08/09 | Black Start / Microgrid | ⛔ | ✅ hazırlık register'ları | — | — | doküman bekleniyor |
| FL-10 | Ada modu (PCS stop) | OTO kural R-10 | ✅ gizli kart | ⏸ | — | gövde BOŞ — doküman bekleniyor |
| FL-11 | Bakım modu → **OPERASYON** (uzak bakım kapatması + yerel stop) | manuel kart | ✅ | ✅ C1 + uzak rollback | ✅ field-operation (FL-11 success) | MV tarafı I-4 manuel talimat |

## 3. Çapraz Sistem + Kural Katmanı

| Akış | Z (spec) | E |
|:-----|:---------|:--|
| Kural → manevra/operasyon delegasyonu (KURAL-MOTORU-V2) | ✅ `automation-rules.spec.ts` (gerçek config + job + audit) | ⏸ (canlı kural tetikleme gözlemi devreye alımda) |
| Boss → field operasyon mesajları (WS-TUNNEL K1) | ✅ `operation-flow.spec.ts` (gerçek WS loopback) | ⏸ (boss stack gerektirir) |
| Field → konteyner uzak manevra (C1) | ✅ `tunnel-maneuver-channel.test.ts` | ✅ field-operation FL-11 (tünelden konteyner yürütmesi) |
| İki-hop audit zinciri (K2) | ✅ unit zinciri | ⏸ boss UI görünümü (İP-7 dışı) |

## 4. E2E Koşum Kılavuzu (lokal dev)

```bash
# 1) Stack'ler (mevcut deployment/.env.<tier> dosyalarıyla)
bun run dev:field-stack          # field stack (web-service 5002, device-service, management)
bun run dev:container            # container stack (web-service 5001, device-service, management)

# 2) Notlar
#   - .env.field SEED_GUEST_PASSWORD, frontend GuestBootstrap "guest123"
#     hardcode'uyla HİZALANMALI (aksi halde guest auto-login kilitlenir).
#   - İlk seed'de admin must_change_password=true'dur — e2e öncesi
#     UPDATE users SET must_change_password=false (dev) veya şifre değişimi.
#   - Admin/guest login kilidi: docker exec field-redis-dev redis-cli del login:lock:admin ...

# 3) Koşum (workers=1 — oturum/kısıt paylaşımı yarışlarını önler; CI ile birebir)
E2E_ADMIN_PASSWORD="<SEED_ADMIN_PASSWORD>" \
E2E_GUEST_PASSWORD="guest123" \
FIELD_ID="<.env.field FIELD_ID>" \
bun x playwright test --project=chromium --workers=1 e2e/
```

Sonuç (2026-09-22): **25/26** — tek istisna `security/tfa-throttle` (MFA-AÇIK
ön koşulu; lokal `.env.field` `MFA_ENABLED=false`).

## 5. KAPSANMAYAN Boşluklar

| # | Boşluk | Neden | Ne zaman |
|:--|:-------|:------|:---------|
| G-1 | Kural eşik e2e'leri (FL-02 180V / FL-08 1500V / FL-11 alarm enjeksiyonu) | simülatörlere dışarıdan yazım yolu yok (in-process) | devreye alım gözlemi veya test enjeksiyon API'si |
| G-2 | Boss tetikleme e2e'si (operation-execute → field) | boss stack lokal koşulmuyor | boss kurulumunda |
| G-3 | `tfa-throttle` e2e | MFA zorunluluğu AÇIK ortam ister (lokal false) | MFA-ON ortamda |
| G-4 | R-07 / R-10 / saha FL-08/09 | prosedür dokümanı bekleniyor | doküman gelince |
| G-5 | Konteyner FL-12 (FSS) | doküman bekleniyor (S8) | doküman gelince |
| G-6 | FL-02 başarı yolu (2 konteyner) | dev sahası tek konteyner | çok konteyner saha kurulumunda |
| G-7 | Otomatik-guest yarışı (uygulama seviyesi) | GuestBootstrap manual login ile yarışır — spec'ler admin-menü beklemesiyle sabitlendi; uygulama düzeyinde yarış giderilmedi | ihtiyaç halinde app düzeltmesi |

## 6. Bu Turda Onarılan E2E Spec'leri

| Spec | Değişiklik |
|:-----|:-----------|
| `field-maneuver.spec.ts` | REWRITE — sunucu kataloğu (data-card-name hedefleme); gizli kart testi eklendi |
| `maneuver-ui.spec.ts` | Sunucu kataloğu uyumu + gizli kayıt testi |
| `field-operation.spec.ts` | YENİ — FL-11 success + FL-02 kademeli bozulma (terminal durum) |
| `field-admin-operations.spec.ts` | YENİ — C4 kurucu + yumuşak silme + geçmiş |
| `automation-rules.spec.ts` | login placeholder + `/latest?limit=100` düzeltmeleri |
| `auth-flow.test.ts` | LoginForm placeholder kontratına geçirildi (name attr yok) |
| `field-flow.spec.ts`, `tunnel.spec.ts`, `container-realtime.spec.ts` | env şifre okuma |
| `security/alarm-api.spec.ts` | `{alarms:[...]}` yanıt şekli + guest şifresi |
| Tüm field spec'leri | admin-menü beklemesi (otomatik-guest yarışı) |

## 7. Altyapı Düzeltmeleri (e2e koşumu için)

- `config-field/service.json` + postgresql bölümü — field device-service artık
  `devices` tablosuna PCS kaydı yazar (yürütücü hedef çözümlemesi §5.1).
- `deviceRegistry` awilix singleton + açılış/10 sn tazeleme (index.ts).
- `TunnelManeuverChannel` — tünel isteğine `container_session` cookie'si
  eklendi (konteyner RBAC oturum doğrulaması).
- Dev compose mount'ları: `platform/commands` + `result` (web-service),
  `.env.container` seed şifreleri tamamlandı.
