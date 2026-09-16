---
status: active
space: architecture
tags: [mimari, manevra, field, pms, ppc, wattox, spec]
review_date: 2026-09-15
---

# Field Manevra Kataloğu — REV.01 (SPEC)

> **İş akışı aşaması:** 1/6 — SPEC (AGENTS.md "Geliştirme İş Akışı — 6 aşama").
> **Kaynak:** `GD-PMS_Maneuver_Logic_Explanation.docx` REV.01 (25.08.2026, Green Diamond) — saha seviyesi PMS/PPC manevraları.
> **Kapsam:** Field uygulaması (saha PMS/PPC katmanı). Konteyner app'in mevcut manevra seti (draw.io 080726) AYRIDIR ve DEĞİŞMEZ — bu katalog field app içindir.
> **İlişkili:** [PCS-WATTOX-MIMARISI.md](./PCS-WATTOX-MIMARISI.md) (aksiyon/veri register'ları), [MANAGEMENT-SERVICE-MIMARISI.md](./MANAGEMENT-SERVICE-MIMARISI.md) (otomasyon altyapısı).

---

## 1. Mimari Konum

```
ÜST EMS (gelecek)
        │
FIELD APP = SAHA PMS/PPC  ◄── bu dokümanın katmanı
   ├── device-service (Wattox PCS-1..PCS-N — konteyner başına 1 PCS)
   ├── web-service (ContainerProxy: konteyner→field bağlantı durumu)
   ├── management-service (otomasyon kuralları — field tier)
   └── field frontend (Control sayfası — manevra kartları)
        │  tünel (konteyner → field)
   KONTEYNERLER (BSC/DC Block, HVAC, CB...) — kendi manevralarıyla
        │
   MV ŞALT · AUX TRAFO · ÖLÇÜM HÜCRESİ (veri boşlukları — §6)
```

**"PPC" kavramı (kullanıcı düzeltmesi):** PPC = **konteyner → field bağlantısı** ("konteyner aleti field'e bağlı mı"). Veri kaynağı: field web-service `ContainerProxy` — `connected/stale/idle` + `lastSeenAt` (45 sn heartbeat sessizliği → stale). FL-07'nin tetikleyicisi budur.

## 2. Manevra Sınıflandırması (REV.01)

| FL | Manevra | Tetikleme | Frontend | Durum |
|:---|:--------|:----------|:---------|:------|
| FL-01 | Start-Up & Shut-Down | Manuel | KART | prosedür dolu; aksiyon/monitoring register'ları dokümanda BOŞ (Varies) |
| FL-02 | Charge / Discharge | Manuel | KART (grup seçimli) | dolu — dağıtım mantığı net |
| FL-03 | Idle / Standby | Manuel | KART | dolu |
| FL-04 | Calibration | Manuel + **zamanlı OTO başlatma** | KART (timer) | dolu; iç algoritma DC Block'ta |
| FL-05 | Emergency Stop | Manuel (buton/kart) | KART | dolu |
| FL-06 | Recovery | **OTO** | **GİZLİ** | dolu — kural tasarımı yapılabilir |
| FL-07 | Communication Loss | **OTO** | **GİZLİ** | **gövde BOŞ** — doküman beklenir |
| FL-08 | Black Start | Belirsiz | — | **gövde BOŞ** — doküman beklenir |
| FL-09 | Microgrid | Belirsiz | — | **gövde BOŞ** — doküman beklenir |
| FL-10 | Islanding / Grid Loss | **OTO** | **GİZLİ** | **gövde BOŞ** — doküman beklenir (veri kaynakları §3.10'da) |
| FL-11 | Maintenance Mode | Manuel | KART | dolu |

**Dokümanın kritik vurguları (§ çok önemli):**
- ⛔ **ASLA: kesici/ayırıcı toprak bıçaklı moddaysa şarj/deşarj manevrası KABUL EDİLMEYECEK** (interlock I-1)
- MV ekipmanda motor yoksa kullanıcıya bilgi ver, MANUEL yaptır (UI kuralı)
- Şarj/deşarj sırasında **charge/discharge power limit register'ları** kullanılır (B09/B10 — Wattox)
- FL-06/FL-07/FL-10 frontend'de GÖSTERİLMEZ (dokümanda açıkça yazılı)

## 3. FL Analizleri

### 3.1 FL-01 — Start-Up & Shut-Down (manuel kart)

**Prosedür:** Saha çapında müsaitlik kontrolü → her cihaz tek tek sorgulanır (iletişim sağlıklı, bloke fault/trip yok, Available/Ready) → AUX besleme (aux trafo enerji analizöründen V/f/faz eşikleri) → grid durumu (MV istasyonu ölçümleri) → **Ready** → operasyonel komutlar kabul edilir. Tüm kontroller + geçişler event log'a zaman damgalı yazılır. Shut-down: ters akış.

**Data kaynakları:** ⛔ AUX analizörü YOK · ⛔ MV ölçüm hücresi YOK · ✅ PCS iletişim/fault/alarm (A26/A28/A29 + D01-D18) · ✅ konteyner bağlantı durumu (ContainerProxy) · ✅ konteyner tarafı cihazlar (tünel üzerinden).

**Aksiyon register'ları:** dokümanda boş — mühendislerle netleştirilecek (S9 sorusu). MVP: "Ready" durum makinesi + bilgilendirme; PCS `start` (S16) adayı.

### 3.2 FL-02 — Charge/Discharge (manuel kart, grup seçimli)

**Prosedür:** Operatör santral gücünü girer → DC Block bilgilendirilir + müsaitlik → trafo limitleri izlenir (varsa) → MV kesici pozisyonları doğrulanır (yol kapalı) → PCS hazırlığı → komut (S06 setpoint — şarj NEGATİF) → **dağıtım**: grup seçildiyse o gruba; seçilmediyse santral gücü **online+müsait PCS sayısına bölünür** (unavailable/fault/bakım hariç) → MV ölçüm hücresinden gerçek akış doğrulaması (PCS feedback'i TEK başına yeterli sayılmaz).

**Data:** ✅ B09/B10 (limit — dağıtım hesabına dahil), ✅ A26/A28/A29 (müsaitlik), ✅ A40 (doğrulama — ölçüm hücresi gelene kadar ara çözüm), ⛔ trafo ölçümü, ⛔ MV kesici pozisyonları, ⛔ MV ölçüm hücresi.

**Kararlar:** İlk dağıtım mantığı = eşit bölme (dokümanda yazılı); P/Q, reaktif destek, PF kontrolü SONRA (ayrı doküman).

### 3.3 FL-03 — Idle/Standby (manuel kart)

**Prosedür:** Güç komutunu sıfıra indir → gerçek akış eşiğin altına düştü mü doğrula → DC Block + PCS'lere Idle bildirimi → PCS enerjili kalır (standby: S19), şarj/deşarj komutu yok → izleme sürer → grup seçilmişse yalnızca o grup.

**Data:** ✅ A40 (akış), ✅ A26 (durum doğrulama). Eşik değeri mühendislerden (S10).

### 3.4 FL-04 — Calibration (manuel + zamanlı OTO)

**Prosedür:** Tetikler: ilk devreye alma / aylık periyodik / ≥3 ay kapalılık sonrası / manuel / rack içi hücre voltaj sapması (20 mV — eski FL-04 ile tutarlı) → PMS: bildir → operatörden tarih/saat iste → **planlanan zamanda OTO başlat** (koşullar uygunsa) → izle → tamamlanma DC Block'tan raporlanır → başarı/fault kaydı. **Süre aşımı → fault + şarj/deşarj YASAK** (interlock I-2). İç algoritma DC Block'ta — PMS yalnızca yaşam döngüsü.

**Data:** ✅ B15/B16 (hücre voltaj sapması adayı), ✅ B13/B14 (sıcaklık koşulları — DC Block izlemesi), ⛔ kalibrasyon takvimi deposu (yeni — §6).

**Frontend:** kart + `timer` (ManeuverCard zamanlı çalıştırma mevcut) + takvim verisi girişi. **OTOMATİK yön:** zamanlanmış başlatma — management-service "zamanlı kural" adayı (mevcut şema koşul tabanlı; zaman tetikli kural Aşama-2 kararı — bkz. §5).

### 3.5 FL-05 — Emergency Stop (manuel kart + fiziksel buton)

**Prosedür:** Konteyner E-stop → **etkilenen grup izole edilir**: PCS şarj/deşarj durdur + setpoint 0 (S17 + S06=0) → PCS kontaktörleri AÇ → MV kesici AÇ + toprak pozisyonu → doğrulama (PCS durdu A26=0, kontaktörler açık A54/56/58, kesici pozisyonda) → her şey loglanır.

**Data:** ✅ A59 (E-stop bitleri — local/remote/BMS), ✅ A53-A58 (kesici/kontaktör doğrulama), ⛔ MV kesici konum/komut (motorlu değilse manuel talimat — UI kuralı).

### 3.6 FL-06 — Recovery (GİZLİ — OTO)

**Prosedür:** E-stop pasif + fault ack/reset → (tek grup ise yalnızca o grup; genel site E-stop ise tüm ekipman) → DC Block, PCS, MV, iletişim, AUX, koruma sistemleri sağlıklı → emergency durumundan çık → normal pozisyonlara döndür → Standby (S19). **Şarj/deşarj OTO geri GELMEZ** — operatör/üst sistemden yeni komut şart.

**Kural tasarımı (management-service — field tier):**
- Tetikleyici: E-stop bitleri (A59) FALSE'a düştü (düşen kenar) + PCS alarm word 6 bit15 / alarm word 7 bit0-1 (E-stop fault'ları) temiz + fault reset sonrası A28=0
- Aksiyon: `fault_reset` (S18) → `standby` (S19) → log `auto_rule_recovery` + notify
- İnterlock: şarj/deşarj OTO geri yüklenmez (kural hiçbir zaman charge/discharge setpoint yazmaz)

### 3.7 FL-07 — Communication Loss (GİZLİ — OTO; gövde BOŞ)

**Tetikleyiciler (başlık + mimari bağlam):** PPC (= konteyner→field, ContainerProxy stale/idle) VEYA ekipman iletişim kaybı (PCS offline).

**Kural tasarımı (taslak — doküman gelince netleşir):**
- Veri: ContainerProxy durumu → kural girdisine dönüştürülür (synthetic telemetry veya management-service'e özel kaynak — `MANAGEMENT` job'ına saha durumu eklenecek; tasarım §5)
- Aksiyon: ilgili PCS `stop` + setpoint 0 + log; bağlantı dönünce normal işletime devam (idle bekle — yeni komut gerekir)

### 3.8 FL-08/FL-09 — Black Start / Microgrid (doküman beklenir)

Wattox hazırlığı mevcut: grid-forming (S32), primer frekans/voltaj kontrolü (S33-S38), sanal atalet/sönüm (S39-S41), off-grid modu (S02=1) + off-grid parametreleri (S13/S14). Gövdeler gelince kural/komut seti bu register'larla kurulur.

### 3.9 FL-10 — Islanding / Grid Loss (GİZLİ — OTO; gövde BOŞ)

**Veri kaynakları hazır:** Alarm word 3 bit9 (**Islanding fault**), fault word 3 (grid aşırı/düşük voltaj/frekans bitleri), A35 (frekans), A43-A45 (gerilimler). Taslak: islanding alarmı → PCS stop + log. Net prosedür doküman beklenir.

### 3.10 FL-11 — Maintenance Mode (manuel kart)

**Prosedür:** Operatör grup/alan seçer → DC Block maintenance moduna alınır → PCS stop + kontaktör komutları → MV kesici AÇ + topraklama şalteri toprak pozisyonuna → doğrulama (DC Block maintenance, kontaktörler pozisyonda, kesici açık, topraklama aktif) → alan güvenli izole.

**Data:** ✅ A26/A53-A58 (PCS tarafı), ⛔ MV kesici + topraklama şalteri komut/konum (motorlu değilse manuel talimat).

## 4. Interlock'lar (otomatik engelleyiciler)

| Kod | Interlock | Kaynak | Uygulama katmanı |
|:----|:----------|:-------|:-----------------|
| I-1 | **Toprak bıçaklı kesici varken şarj/deşarj KABUL EDİLMEZ** (doküman: "ASLA AMA ASLA") | ⛔ MV şalt pozisyon verisi | komut doğrulama (web-service command-routes ön-kontrol) + kural (management-service) + UI engeli |
| I-2 | Kalibrasyon süre aşımı → şarj/deşarj YASAK | kalibrasyon durumu (DC Block) | komut doğrulama + kural |
| I-3 | Şarj/deşarj sırasında B09/B10 limitleri dağıtım hesabında zorunlu | B09/B10 | dağıtım mantığı (frontend transform + kural) |
| I-4 | Motorlu olmayan MV kesici → kullanıcıya manuel talimat (UI) | MV ekipman metadatası | UI + manevra akışı |

## 5. Otomasyon Kuralları (field tier management-service)

| Kural | Tetikleyici | Aksiyon | Durum |
|:------|:------------|:--------|:------|
| R-06 | FL-06: E-stop düşen kenar + fault temiz + sağlık | fault_reset + standby + log/notify | Tasarım hazır — uygulanabilir |
| R-07 | FL-07: ContainerProxy stale/idle VEYA PCS offline | ilgili PCS stop + log | Gövde boş — doküman beklenir; sinyal kaynağı tasarımı gerekir |
| R-10 | FL-10: islanding/grid alarm bitleri | PCS stop + log | Gövde boş — doküman beklenir |
| R-I1 | I-1: toprak bıçağı aktif | şarj/deşarj reddi | MV verisi beklenir |

**Sinyal kaynağı kararı (R-07 için):** ContainerProxy durumunu MANAGEMENT akışına taşımak için iki seçenek: (a) field web-service, konteyner durum değişiminde synthetic `MANAGEMENT` job'ı yayınlar (deviceId="field", telemetry: `{name:"Container N Connection", value:0/1/2}`); (b) management-service'e `IContainerConnectionSource` enjeksiyonu. Aşama-2 kararı — (a) mevcut kuyruk kontratını bozmaz, tercih edilir.

## 6. Veri Boşlukları (yeni cihaz config'leri gerektirir)

| # | Eksik | Etkileyen | Not |
|:--|:------|:----------|:----|
| G-1 | MV şalt (kesici konum/komut, topraklama şalteri, motorlu/motorsuz) | FL-01/02/05/11 + I-1/I-4 | motorlu değilse UI'da manuel talimat |
| G-2 | AUX trafo enerji analizörü | FL-01 | |
| G-3 | MV ölçüm hücresi enerji analizörü | FL-01/02 (doğrulama) | geçici çözüm: PCS A40 |
| G-4 | Trafo ölçümleri | FL-02 | |
| G-5 | Kalibrasyon takvimi deposu | FL-04 + I-2 | DB/CRUD veya config |
| G-6 | FSS durumu | FL-01 önkoşulu (eski akışlar) | REV.01'de önkoşul listesinde değil ama izleme kapsamında |

## 7. Frontend Planı (field Control sayfası + ManeuverCard)

- **Kart seti:** FL-01, FL-02, FL-03, FL-04, FL-05, FL-11 (+ FL-06/07/10 GİZLİ — `HIDDEN_MANEUVER_NAMES` field benzeri).
- **Grup seçici:** yeni input tipi (`group`/`device-select`) — konteyner başına grup (PCS-1..PCS-N); seçim yoksa "tümü" (santral seviyesi).
- **Dağıtım transform'u:** santral gücü → online+müsait PCS listesine eşit bölme (`steps.map` deseni — mevcut `transform` altyapısı yeterli; PCS müsaitliği hook'tan).
- **Mevcut desen korunur:** `buildFieldManeuvers(pcsIds)` dinamik liste üretimi — N konteyner için ölçeklenir; `MANEUVER_CONTROLS` transform'ları buna göre genişler.
- **İnterlock UI'ı:** I-1 (toprak bıçağı → şarj/deşarj kartı pasif + uyarı), I-4 (motorlu kesici yok → "manuel yapın" bilgisi).
- **FL-04 timer:** ManeuverCard `timer` özelliği mevcut — takvim girişi eklenecek.

## 8. Field Stack Wiring

- `deployment/docker-compose.field.{yml,dev.yml}`'e **device-service** eklenir (field tier — şu an yok): `SERVICE_TIER=field`, Wattox config mount (`config-field/`), `FIELD_ID` kimliği.
- Management-service field tier'da koşar (rules.json — R-06 başlangıç; R-07/R-10 doküman sonrası).
- Ölçeklenebilirlik: konteyner eklendikçe `pcs-<N>.json` config eklenir — kod değişmez (device-service config odaklı; frontend dinamik cihaz listesinden).

## 9. Kabul Kriterleri

| Kod | Kriter |
|:----|:-------|
| K-M1 | REV.01 kart seti field Control'da; FL-06/07/10 görünmez |
| K-M2 | FL-02 grup seçimi + eşit dağıtım transform'u (online PCS'ler) testli |
| K-M3 | Şarj NEGATİF setpoint konvansiyonu uçtan uca (UI→CommandJobBuilder→job) testli |
| K-M4 | R-06 kuralı: E-stop düşen kenar → fault_reset + standby; şarj/deşarj ASLA otomatik geri yüklenmez |
| K-M5 | I-1 interlock'u komut katmanında reddeder (MV verisi geldiğinde devreye girer — öncesi UI engeli) |
| K-M6 | Field compose'da device-service + PCS config'ler çalışır (gözle) |
| K-M7 | Kapılar: yeni kod ≥%70 satır; dağıtım/interlock ≥%90 branch |

## 10. Görev Listesi

| Görev | İçerik |
|:------|:-------|
| T-M1 | JSDoc + tipler: grup seçimi (`ManeuverConfig`/`MANEUVER_CONTROLS` uzantısı), dağıtım sözleşmesi |
| T-M2 | `field-control/maneuvers.ts` — REV.01 katalog + transform'lar + hidden set |
| T-M3 | Control sayfası: kart seti + grup seçici + interlock UI'ı |
| T-M4 | Field compose: device-service + config mount + env şablonları |
| T-M5 | R-06 kuralı (rules.json — field) + ContainerProxy→synthetic telemetry kaynağı (R-07 hazırlığı) |
| T-M6 | Testler: dağıtım transform, konvansiyon, interlock, R-06 (fake timers) |
| T-M7 | DOGRULAMA + TEST-KAPSAMI + test-envanteri güncelleme |

## 11. Aşama Eşlemesi

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | T-M1 |
| 3. TEST | T-M6 (kırmızı) |
| 4. IMPL | T-M2..T-M5 |
| 5. SONUÇ | `FIELD-MANEVRA-REV01-DOGRULAMA.md` |
| 6. KAPSAM | `FIELD-MANEVRA-REV01-TEST-KAPSAMI.md` + envanter |

## 12. Mühendis Ekibine Açık Sorular

| # | Soru | Etki |
|:--|:-----|:-----|
| S9 | FL-01 aksiyon/monitoring register'ları (dokümanda "Varies") — netleşecek mi? | FL-01 uygulaması |
| S10 | FL-03 "akış eşiği" değeri (idle doğrulama) | FL-03 |
| S11 | FL-05 PCS kontaktör açma — ayrı register mı, stop/standby ile mi? | FL-05 |
| S12 | FL-07/08/09/10 prosedür dokümanları ne zaman? | kural + kart seti |
| S13 | MV şalt/AUX/ölçüm hücresi cihaz dokümanları (G-1..G-4) | interlock'lar + FL-01/02 |
| S14 | Kalibrasyon takvimi kaynağı (operatör girişi mi, EMS'ten mi)? | FL-04 + I-2 |
