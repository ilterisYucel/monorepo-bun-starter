# Yangın Paneli (EP203) — Entegrasyon Dokümantasyonu

## 1. Cihaz Tanımı

EP203, **C-TEC** tarafından üretilen, hem konvansiyonel yangın ihbar paneli hem de otomatik söndürme kontrol paneli olarak çalışan kombine bir cihazdır. Konteyner içi gazlı yangın söndürme sistemlerini kontrol eder.

### Sertifikalar

- **EN 12094-1** — Sabit yangın söndürme sistemleri, gazlı söndürme bileşenleri
- **EN54-2** — Yangın algılama ve alarm sistemleri, kontrol ve gösterge ekipmanı
- **EN54-4** — Güç kaynağı ekipmanı

### Temel Özellikler

| Özellik | Detay |
|---------|-------|
| Dedektör zone sayısı | 3 (konvansiyonel, açık/kısa devre izlemeli) |
| Siren devresi | 3 (iki 1.kademe, bir 2.kademe) |
| Röle çıkışı | 11 (6 dahili + 5 EP212 genişleme kartı ile) |
| Monitörlü giriş | 6 (Manuel Salım, Flow Switch, Low Pressure, Mode, Hold, Abort) |
| Ekran | 128×64 piksel grafik LCD, iki renk arka aydınlatmalı |
| Olay kaydı | Zaman damgalı dahili log |
| RSU bağlantısı | 8 adede kadar RS485 Remote Status Unit |
| Söndürme gecikmesi | 0-60 saniye (ayarlanabilir) |
| Söndürme süresi | 1-300 saniye (ayarlanabilir) |
| Besleme | 230Vac, 50/60Hz; 2×12V 7Ah akü |
| Boyutlar | 439×276×70mm (metal kutu) |
| Ağırlık | 4.2kg (aküsüz) |

---

## 2. Donanım Entegrasyonu

### 2.1 Malzeme Listesi

| Parça | Model / Tür | Amaç |
|-------|------------|------|
| EP203 panel | C-TEC EP203 | Yangın ihbar + söndürme kontrolü |
| Modbus TCP I/O modülü | Advantech ADAM-4055 veya muadili | Röle kontaklarını Modbus register'lara çevirir |
| RevPi | Kunbus Revolution Pi | device-service'in çalıştığı edge bilgisayar |

### 2.2 Bağlantı Şeması

```
                      EP203 Panel
                    ┌──────────────┐
   Dahili Röleler   │              │
   FIRE      ───────┤ NO ●  COM    │──────┐
   FAULT     ───────┤ NO ●  COM    │──────┤
   1ST STAGE ───────┤ NO ●  COM    │──────┤
   2ND STAGE ───────┤ NO ●  COM    │──────┤
   EXTRACT   ───────┤ NO ●  COM    │──────┤
   LOCAL FIRE ──────┤ NO ●  COM    │──────┤   Fiziksel
                    │              │        kablolama
   EP212 Kartı       │              │        (volt-free)
   RESET     ───────┤ NO ●  COM    │──────┤   kontaklar
   MODE      ───────┤ NO ●  COM    │──────┤
   DISCHARGED ──────┤ NO ●  COM    │──────┤
   HOLD      ───────┤ NO ●  COM    │──────┤
   ABORT     ───────┤ NO ●  COM    │──────┘
                    │              │
   Monitörlü Girişler│             │
   MAN. REL. ◄──────│ COIL 0       │◄──────┐
   HOLD      ◄──────│ COIL 1       │◄──────┤  Fiziksel
   ABORT     ◄──────│ COIL 2       │◄──────┘  kablolama
                    │              │
                    └──────────────┘
                            ↕
                    ┌──────────────┐
                    │ Modbus TCP   │
                    │ I/O Modülü   │
                    │ (ADAM-4055)  │
                    └──────┬───────┘
                           │ Ethernet
                    ┌──────┴───────┐
                    │    RevPi     │
                    │ device-service│
                    └──────────────┘
```

### 2.3 Pin Eşleştirme Tablosu

#### Dijital Girişler (DI) — EP203 → I/O Modülü

| DI Adresi | Röle Adı | Normal Durum | Alarm Durumu | Açıklama |
|-----------|----------|-------------|-------------|----------|
| DI 0 | Fault | Kapalı (enerjili) | Açık (enerji kesik) | **Ters mantık**: Röle normalde enerjilidir, arıza/power loss durumunda kontak açılır |
| DI 1 | Fire | Açık | Kapalı | Herhangi bir zone'da yangın algılandı |
| DI 2 | 1st Stage Alarm | Açık | Kapalı | Ön deşarj uyarısı aktif |
| DI 3 | 2nd Stage Alarm | Açık | Kapalı | Salım geri sayımı başladı |
| DI 4 | Discharged | Açık | Kapalı | Söndürücü ajan salındı |
| DI 5 | Extract | Açık | Kapalı | Deşarj sonrası tahliye fanı çalışıyor |
| DI 6 | Mode Auto | Açık | Kapalı | Otomatik mod aktif |
| DI 7 | Hold | Açık | Kapalı | Geri sayım duraklatıldı |
| DI 8 | Abort | Açık | Kapalı | Salım iptal edildi |
| DI 9 | Reset | Açık | Kapalı (anlık) | Sistem sıfırlandı |
| DI 10 | Local Fire | Açık | Kapalı | Yerel yangın sinyali (Fire rölesi yedeği) |

#### Dijital Çıkışlar (DO / COIL) — I/O Modülü → EP203

| COIL Adresi | Komut | Tip | EP203 Girişi | Süre |
|-------------|-------|-----|-------------|------|
| COIL 0 | Manual Release | Pulse | Manual Release input | ~1000ms pals |
| COIL 1 | Hold | Sürekli | Hold input | Butona basılı kaldığı sürece |
| COIL 2 | Abort | Pulse | Abort input | ~1000ms pals |

> **Not:** EP203'ün Fault rölesi **NC (normally closed)** tipindedir. Panel enerjili ve sağlıklıyken röle kapalıdır (DI 1 okur). Arıza veya tam güç kaybı durumunda röle açılır (DI 0 okur). Bu, fail-safe bir tasarımdır — güç kesintisinde dahi arıza sinyali alınır.

---

## 3. Yazılım Entegrasyonu

### 3.1 Cihaz Konfigürasyonu

**Dosya:** `services/device-service/config/ep203.json`

Mevcut `device-factory.ts` içindeki `MODBUS` protokolü kullanılır — hiçbir kod değişikliği gerekmez. `device-service` bu konfigürasyonu otomatik okur ve `ModbusTcpClient` ile I/O modülüne bağlanır.

```json
{
  "deviceId": "EP203",
  "name": "Fire Suppression Panel",
  "manufacturer": "C-TEC",
  "model": "EP203",
  "protocol": "MODBUS",
  "connection": {
    "host": "127.0.0.1",
    "port": 502,
    "slaveId": 1
  },
  "telemetry": [
    { "name": "Fault",           "registerTableType": "DISCRETE_INPUT", "registerDataType": "BOOLEAN", "registerAddress": 0 },
    { "name": "Fire",            "registerTableType": "DISCRETE_INPUT", "registerDataType": "BOOLEAN", "registerAddress": 1 },
    { "name": "1st Stage Alarm", "registerTableType": "DISCRETE_INPUT", "registerDataType": "BOOLEAN", "registerAddress": 2 },
    { "name": "2nd Stage Alarm", "registerTableType": "DISCRETE_INPUT", "registerDataType": "BOOLEAN", "registerAddress": 3 },
    { "name": "Discharged",      "registerTableType": "DISCRETE_INPUT", "registerDataType": "BOOLEAN", "registerAddress": 4 },
    { "name": "Extract",         "registerTableType": "DISCRETE_INPUT", "registerDataType": "BOOLEAN", "registerAddress": 5 },
    { "name": "Mode Auto",       "registerTableType": "DISCRETE_INPUT", "registerDataType": "BOOLEAN", "registerAddress": 6 },
    { "name": "Hold",            "registerTableType": "DISCRETE_INPUT", "registerDataType": "BOOLEAN", "registerAddress": 7 },
    { "name": "Abort",           "registerTableType": "DISCRETE_INPUT", "registerDataType": "BOOLEAN", "registerAddress": 8 },
    { "name": "Reset",           "registerTableType": "DISCRETE_INPUT", "registerDataType": "BOOLEAN", "registerAddress": 9 },
    { "name": "Local Fire",      "registerTableType": "DISCRETE_INPUT", "registerDataType": "BOOLEAN", "registerAddress": 10 },
    { "name": "Manual Release",  "registerTableType": "COIL",            "registerDataType": "BOOLEAN", "registerAddress": 0 },
    { "name": "Hold DO",         "registerTableType": "COIL",            "registerDataType": "BOOLEAN", "registerAddress": 1 },
    { "name": "Abort DO",        "registerTableType": "COIL",            "registerDataType": "BOOLEAN", "registerAddress": 2 }
  ],
  "pollIntervalMs": 2000
}
```

### 3.2 Komut Tanımları

```json
{
  "commands": {
    "manual_release": {
      "label": "Manuel Salım",
      "telemetries": [{ "name": "Manual Release", "value": 1 }],
      "timeoutMs": 2000,
      "validate": { "reads": [{ "name": "1st Stage Alarm", "expect": true }] }
    },
    "hold": {
      "label": "Sayımı Durdur",
      "telemetries": [{ "name": "Hold DO", "value": 1 }],
      "timeoutMs": 0,
      "validate": { "reads": [{ "name": "Hold", "expect": true }] }
    },
    "abort": {
      "label": "Salımı İptal",
      "telemetries": [{ "name": "Abort DO", "value": 1 }],
      "timeoutMs": 2000,
      "validate": { "reads": [{ "name": "Abort", "expect": true }] }
    },
    "mode_toggle": {
      "label": "Mod Değiştir",
      "telemetries": [{ "name": "Mode Select", "value": 1 }],
      "timeoutMs": 2000
    }
  }
}
```

> **Not:** `manual_release` komutu kritik bir işlemdir. `validate.reads` ile komut sonrası `1st Stage Alarm` aktif olana kadar doğrulanır. `hold` komutu `timeoutMs: 0` ile süresizdir — kullanıcı iptal edene kadar röle kapalı kalır.

### 3.3 Veri Akışı

```
EP203 röle kontakları
       │
       ▼
Modbus TCP I/O Modülü (DI register 0-10, COIL register 0-2)
       │  Modbus TCP, 2 saniyede bir poll
       ▼
device-service (ModbusTcpClient)
       │  BullMQ READ_DEVICE job
       ▼
data-service (BullMQ consumer)
       │  Write telemetry
       ▼
TimescaleDB (hypertable: device_ep203)
       │  REST API
       ▼
web-service (GET /unified/telemetry/latest?deviceIds=EP203)
       │
       ▼
container-web (/fire page, React Query, 3s poll interval)
```

---

## 4. UI Sayfası Referansı (/fire)

**Dosya:** `apps/container-web/src/pages/FirePanelPage.tsx`

**Route:** `/fire` (admin ve teknik kullanıcıları için)

**Sidebar:** "Yangın Paneli" butonu — `TbFireExtinguisher` ikonu

### 4.1 Sayfa Yerleşimi

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ ✅ Normal │  │ 🔥 Yangın│  │ ⚠ Arıza  │           │  ← 3 üst kart
│  │  Sistem   │  │  Aktif  │  │  Yok     │           │
│  │  Normal   │  │         │  │          │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│                                                      │
│  ┌──────────── Röle Göstergeleri ────────────────┐   │
│  │ ● 1.Kademe  Pasif    ● 2.Kademe  Pasif       │   │
│  │ ● Salım     Pasif    ● Tahliye   Pasif        │   │
│  │ ● Beklet    Pasif    ● İptal     Pasif        │   │
│  │ ● Mod Oto   Normal   ● Y.Yangın  Pasif        │   │
│  │ ● Sıfırlama Pasif   ● Arıza     Normal (Ters) │   │
│  │ ● Yangın    Pasif                             │   │
│  └────────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────── Komutlar ─────────────────────────┐   │
│  │ [🔴 Manuel Salım] [⏸ Beklet] [⏹ İptal]    │   │
│  └────────────────────────────────────────────────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 4.2 Üst Durum Kartları

| Kart | Yeşil Durum | Kırmızı/Sarı Durum | Tetikleyen Telemetri |
|------|------------|-------------------|---------------------|
| Sistem Durumu | "Normal" — sistem çalışıyor, yangın/arıza yok | "İKAZ" — bir uyarı var (yangın veya arıza) | Fire, Fault, 1st Stage, 2nd Stage |
| Yangın Durumu | "Yok" — yangın algılanmadı | "YANGIN" — en az bir zone'da yangın var | Fire, Local Fire |
| Arıza Durumu | "Yok" — sistem arızası yok | "VAR" — bir arıza mevcut | Fault |

### 4.3 Röle Gösterge Tablosu

| Etiket | Normal | Aktif | Ters? | Açıklama |
|--------|--------|-------|-------|----------|
| 1. Kademe | 🔵 Pasif | 🔴 Aktif | Hayır | Yangın algılandı, ilk uyarı sesli/ışıklı |
| 2. Kademe | 🔵 Pasif | 🔴 Aktif | Hayır | Salım geri sayımı başladı |
| Salım | 🔵 Pasif | 🔴 Aktif | Hayır | Söndürücü ajan salındı (Discharged) |
| Tahliye | 🔵 Pasif | 🔴 Aktif | Hayır | Salım sonrası tahliye fanı çalışıyor |
| Beklet | 🔵 Pasif | 🔴 Aktif | Hayır | Geri sayım duraklatıldı (Hold) |
| İptal | 🔵 Pasif | 🔴 Aktif | Hayır | Salım iptal edildi (Abort) |
| Mod Oto | 🔵 Normal | 🔴 Arıza | **Evet** | Otomatik mod açık (Aktif=Normal) |
| Yerel Yangın | 🔵 Pasif | 🔴 Aktif | Hayır | Yerel yangın sinyali |
| Sıfırlama | 🔵 Pasif | 🔴 Aktif | Hayır | Sistem sıfırlandı (anlık) |
| Arıza | 🔵 Normal | 🔴 Arıza | **Evet** | Sistem arızası (NC röle — Aktif=Normal) |
| Yangın | 🔵 Pasif | 🔴 Aktif | Hayır | Yangın durumu |

> **Ters mantık:** `Fault` ve `Mode Auto` röleleri NC (normally closed) tipindedir. Röle kapalıyken (DI=1) sistem **normal** çalışıyordur. Sadece röle açıldığında (DI=0) arıza/mod değişimi var demektir.

### 4.4 Komut Butonları

| Buton | Komut | EP203 Etkisi | Güvenlik |
|-------|-------|-------------|----------|
| **Manuel Salım** | `manual_release` | Söndürme sayımını başlatır. Zone tetiklemesi olmasa dahi salım gerçekleşir. | **Çift onaylı** — ilk tıklamada "Emin misiniz?" uyarısı çıkar, ikinci tıklamada gönderilir. Buton kırmızı kenarlıklıdır. |
| **Beklet** | `hold` | Aktif bir sayım varsa duraklatır. COIL rölesi kapalı kaldığı sürece sayım duraklatılmış olur. | Tek tıklama yeterlidir — sayımı başlatmaz, sadece duraklatır. |
| **İptal** | `abort` | Aktif bir salım/sayım işlemini iptal eder. | Tek tıklama yeterlidir — salımı başlatmaz, sadece durdurur. |
| **Mod Değiştir** | `mode_toggle` | Oto ↔ Oto+Manuel modları arasında geçiş yapar. Pals süresi 1000ms. | Tek tıklama yeterlidir. |

> **Uyarı:** Manuel Salım butonu fiziksel söndürme sistemini tetikler. Butonun yanlışlıkla kullanımını önlemek için çift onay mekanizması zorunludur. Üretim ortamında ek olarak fiziksel anahtar (key-switch) önerilir.

### 4.5 Backend Entegrasyonu

| API Endpoint | Method | Purpose |
|-------------|--------|---------|
| `/unified/telemetry/latest?deviceIds=EP203` | GET | EP203'ün tüm DI register durumlarını okur (11 boolean değer) |
| `/commands/execute` | POST | Manuel salım, hold, abort, mode_toggle komutlarını gönderir |

**React Query hook:** `useFireAlarmData()` — 3 saniyede bir poll eder, 11 boolean state'i çıkarır, `sendCommand` mutation'ı sağlar.

---

## 5. Alarm Senaryoları

### 5.1 Normal Çalışma

```
Tüm DI'lar kapalı (false).
Fault DI = true (enerjili → sağlıklı).
Üst kartlar: ✅ Normal, ✅ Yok, ✅ Yok
```

### 5.2 Dedektör Tetiklemesi (Zone Fire)

```
1. Zone 1 duman dedektörü tetiklenir → Fire DI = true
2. EP203 LCD: "Zone 1 Fire"
3. 1st Stage Alarm DI = true → sirenler çalmaya başlar
4. UI: Yangın kartı kırmızı, 1.Kademe aktif
```

### 5.3 Salım Sırası (Tam Senaryo)

```
1. Zone 1 + Zone 2 tetiklenir (coincidence) VEYA Manuel Salım butonu
2. 1st Stage Alarm aktif → ön uyarı
3. Geri sayım başlar (ayarlanan gecikme, varsayılan 30s)
4. 2nd Stage Alarm aktif → "salım yakın" uyarısı
5. Geri sayım biter → söndürücü salınır
6. Discharged DI = true → Flow Switch onaylar
7. Flooding time biter → Extract DI = true → tahliye fanı
8. Reset komutu ile sistem sıfırlanır
```

### 5.4 Sistem Arızası

```
1. Dedektör zone'unda açık/kısa devre → Fault DI = false
2. Akü bağlantısı kopuk → Fault DI = false
3. Şebeke kesintisi → Fault DI = false (akü devrede, ancak Fault rölesi enerjiyi kaybeder)
4. UI: Arıza kartı sarı, Arıza satırı kırmızı
```

---

## 6. Bakım ve Test

### Haftalık Test

1. `/fire` sayfasından röle durumlarını kontrol et
2. Lamp Test: EP203 panelinde tüm LED'lerin yandığını doğrula
3. Zone'ları tek tek test moduna al (`Zones in Test` menüsü)
4. Manuel salım butonunun çift onay mekanizmasını test et (göndermeden iptal et)

### Aylık Test

1. Akü voltajını ölç (24V nominal, 21V altı kritik)
2. Tüm dedektörleri duman spreyi ile test et
3. Sirenlerin ses seviyesini kontrol et
4. Olay kaydını (`Display Faults` / `Event Log`) kontrol et

### Yıllık Bakım

1. Aküleri değiştir (YUASA NP7-12, 2×12V 7Ah)
2. Tüm konnektör ve klemens bağlantılarını sıkılaştır
3. Modbus I/O modülünün iletişimini test et
4. Söndürme tüpü basıncını kontrol et (Low Pressure switch)

---

## 7. Kaynak Kod Referansı

| Bileşen | Dosya |
|---------|-------|
| Cihaz konfigürasyonu | `services/device-service/config/ep203.json` |
| Yangın paneli sayfası | `apps/container-web/src/pages/FirePanelPage.tsx` |
| Sayfa stilleri | `apps/container-web/src/pages/FirePanelPage.styles.ts` |
| React Query hook | `apps/container-web/src/features/fire/hooks/useFireAlarmData.ts` |
| API servisi | `apps/container-web/src/features/fire/services/fireAlarmApi.ts` |
| Tip tanımları | `apps/container-web/src/features/fire/types/fire-alarm.ts` |
| Yangın paneli ikonu | `packages/ui/src/icons/nav-icons.tsx` → `fireAlarm: TbFireExtinguisher` |
| İkon tip tanımı | `packages/ui/src/icons/types.ts` → `"fireAlarm"` |
| Sidebar navigasyonu | `apps/container-web/src/layouts/Sidebar.tsx` → `"fire"` sayfa tipi |
| Route tanımı | `apps/container-web/src/app/routes.tsx` → `/fire` |
