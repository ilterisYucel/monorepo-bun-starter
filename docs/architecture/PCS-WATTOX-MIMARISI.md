---
status: active
space: architecture
tags: [mimari, pcs, wattox, modbus, device-config, spec]
review_date: 2026-09-15
---

# Wattox PCS — Device Config Mimarisi (SPEC)

> **İş akışı aşaması:** 1/6 — SPEC (AGENTS.md "Geliştirme İş Akışı — 6 aşama").
> **Kaynak:** `Wattox MPCS Series 1725kW to 3.5MW PCS Modbus Communication Protocol-V1.0` (24.06.2026, Partner EGS).
> **Kapsam kararı (2026-09-15):** A klasmanı A09'dan itibaren; B FULL; C65-C73 metadata; D FULL (alarm çözümlemesi Appendix 3'e göre); S FULL. A01-A08/C01-C64/versiyon kayıtları alınmaz.
> **İlişkili:** [FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md](./FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md), [MANAGEMENT-SERVICE-MIMARISI.md](./MANAGEMENT-SERVICE-MIMARISI.md).

---

## 1. Kapsam ve Konum

- Wattox MPCS serisi (1725 kW / 2.5 MW / 3.5 MW) PCS'leri **field device-service** okuyacak ve kontrol edecek (field = saha PMS/PPC katmanı).
- **Konteyner başına 1 PCS**: deviceId `PCS-1`..`PCS-N`. `container_id`/`field_id` etiketleri config'e YAZILMAZ — TelemetryTagger'ın işidir (AGENTS kuralı).
- Amaç: temel telemetri (durum/ölçüm/BMS/arıza) + manevralar için gerekli komut seti + alarm bitfield çözümlemesi.
- Mevcut `pcs-1.json` (eski PCS, konteyner config-docker) BU kapsamda DEĞİL — Wattox ayrı config ailesidir.

## 2. Protokol Özeti

- Modbus RTU (RS485, 115200 bps default) veya Modbus TCP — field device-service mevcut `ModbusTcpClient` altyapısıyla TCP kullanır.
- Register = 1 word (16 bit); high byte önce; veri tipleri `U16` (0..65535) ve `S16` (işaretli).
- Ölçekler register tablosundaki "Unit" sütunundandır: `0.1 V`, `0.01 Hz`, `1 A`, `1 kW`, `0.1%`, `0.001 V`, `0.1°C`, `1 kΩ` vb. — device config'te `scale` alanına birebir yansıtılır.
- **İşaret konvansiyonu (protokol kararı):** ŞARJ = NEGATİF güç, DEŞARJ = POZİTİF güç (A12 maks şarj gücü `S16 −32768..0`; A13 deşarj `0..32767`). `S06` aktif güç setpoint de aynı konvansiyondadır.

## 3. Register Kapsam Tabloları

### 3.1 A — PCS İç Parametreler (A09-A89)

| Param | Ad | Adres | Tip | Ölçek/Birim | Not |
|:------|:---|:------|:----|:------------|:----|
| A09 | Rated power | 0x2F08 | U16 | 1 kW | |
| A10 | Rated voltage | 0x2F09 | U16 | 1 V | |
| A11 | Rated current | 0x2F0A | U16 | 1 A | |
| A12 | Max charging power | 0x0123 | S16 | 1 kW | negatif aralık (şarj) |
| A13 | Max discharging power | 0x0124 | U16 | 1 kW | |
| A14 | Reactive power upper limit | 0x0126 | U16 | 1 kVar | |
| A15 | Reactive power lower limit | 0x0125 | S16 | 1 kVar | |
| A16 | Max charging current | 0x0127 | S16 | 1 A | |
| A17 | Max discharging current | 0x0128 | U16 | 1 A | |
| A18 | Upper voltage limit (off-grid) | 0x2F0F | U16 | 0.1 V | |
| A19 | Lower voltage limit (off-grid) | 0x2F10 | U16 | 0.1 V | |
| A20 | Upper voltage limit (const-V) | 0x0117 | U16 | 0.1 V | |
| A21 | Lower voltage limit (const-V) | 0x0118 | U16 | 0.1 V | |
| A22 | Max allowable discharging power | 0x2F2E | U16 | 1 kW | anlık limit |
| A23 | Max allowable charging power | 0x2F2F | U16 | 1 kW | anlık limit |
| A26 | **PCS işletme durumu** | 0x2F7D | U16 | 1 | 0 Stop / 1 Standby / 2 Şarj / 3 Deşarj / 4 Sıfır güç / 5 Off-grid / 6 Fault |
| A27 | Durum (bit modu) | 0x2F5A | U16 | 1 | bit0..bit7 (A26 eş değeri) |
| A28 | PCS fault durumu | 0x2F43 | U16 | 1 | 0 normal / 1 fault |
| A29 | PCS alarm durumu | 0x2F45 | U16 | 1 | 0 normal / 1 alarm |
| A30 | Şarj işlemi durumu | 0x2F3D | U16 | 1 | 0/1 |
| A31 | Deşarj işlemi durumu | 0x2F3E | U16 | 1 | 0/1 |
| A32 | Assembly işletme durumu | 0x2F40 | U16 | 1 | 0/1 |
| A33 | Batarya voltajı | 0x2F48 | S16 | 0.1 V | ters bağlantıda negatif |
| A34 | DC akım | 0x2F49 | S16 | 1 A | |
| A35 | Grid frekansı | 0x2F4E | U16 | 0.01 Hz | PLL |
| A36 | DC güç | 0x2F4D | S16 | 1 kW | |
| A37 | Çıkış güç faktörü | 0x2F53 | S16 | 0.001 | −1..1 |
| A38 | Üst yarı-bus voltajı | 0x2F46 | S16 | 0.1 V | |
| A39 | Alt yarı-bus voltajı | 0x2F47 | S16 | 0.1 V | |
| A40 | **Grid tarafı aktif güç** | 0x2F7E | S16 | 1 kW | işaretli — ana güç telemetrisi |
| A41 | Grid tarafı reaktif güç | 0x2F7F | S16 | 1 kVar | |
| A42 | Toplam görünür güç | 0x2F52 | S16 | 1 kVA | |
| A43-A45 | Faz AB/BC/CA gerilimleri | 0x2F4F/50/51 | U16 | 0.1 V | |
| A46-A48 | Faz A/B/C akımları | 0x2F4A/B/C | U16 | 1 A | |
| A49-A51 | İnverter AB/BC/CA RMS voltaj | 0x2018/19/1A | U16 | 0.1 V | |
| A52 | Derated işletme | 0x2F59 | U16 | 1 | bit0 ortam, bit1 soğutucu, bit2 fan, bit3 reaktör, bit4 master-slave |
| A53 | AC kesici durumu | 0x2F5B | U16 | 1 | 0 kapalı / 1 açık |
| A54 | AC pre-charge kontaktör | 0x2F5D | U16 | 1 | 0 kapalı / 1 açık |
| A55 | DC kesici (modül 1) | 0x2F5C | U16 | 1 | 0 kapalı / 1 açık |
| A56 | DC pre-charge kontaktör (modül 1) | 0x2F5E | U16 | 1 | 0 kapalı / 1 açık |
| A57 | DC kesici (modül 2) | 0x2F84 | U16 | 1 | |
| A58 | DC pre-charge kontaktör (modül 2) | 0x2F85 | U16 | 1 | |
| A59 | **E-stop buton durumu** | 0x2F60 | U16 | 1 | bit0 local, bit1 remote, bit2 BMS |
| A60-A65 | IGBT sıcaklıkları (A/B/C × modül 1/2) | 0x2F54/55/56 + 0x2F80/81/82 | S16 | 0.1°C | |
| A66-A67 | Reaktör sıcaklığı (modül 1/2) | 0x2F58/0x2F83 | S16 | 0.1°C | |
| A68 | Filtre kondansatör sıcaklığı | 0x2028 | S16 | 0.1°C | |
| A69 | İç kabin sıcaklığı | 0x2027 | S16 | 0.1°C | |
| A70 | Ortam nemi | 0x202F | S16 | 0.1% RH | |
| A71 | Ortam sıcaklığı | 0x2F57 | S16 | 0.1°C | |
| A72/A73 | Sigorta durumu (modül 1/2) | 0x2F5F/0x2F86 | U16 | 1 | bit0 DC, bit1 AC; 0 ON / 1 OFF |
| A74/A75 | **Topraklama izolasyon empedansı** (modül 1/2) | 0x2F6A/0x2F87 | U16 | 1 kΩ | |
| A76 | Su pompası durumu | 0x2F61 | U16 | 1 | 0 çalışıyor, 1 idle, 2 hız sinyali yok, 3 kilitli |
| A77 | Üç fazlı fan durumu | 0x2F63 | U16 | 1 | 0 normal / 1 fault |
| A78 | DC fan durumu | 0x2F62 | U16 | 1 | bit haritası |
| A79 | **DI durumu (modül 1)** | 0x205B | U16 | 1 | **bit0 kapı durumu** (0 kapalı/1 açık); bit1 izolasyon kontaktörü; bit2 su seviyesi; bit3 DC SPD; bit4 AC SPD; bit5-7 kontaktörler; bit8 reaktör sıcaklık anahtarı; bit9-15 yedek |
| A80 | DI durumu (modül 2) | 0x30C0 | U16 | 1 | A79 ile aynı harita |
| A81-A84 | Akümüle şarj/deşarj (low/high) | 0x2F64-2F67 | U16 | 1 kWh | |
| A85/A86 | Günlük şarj/deşarj | 0x2F68/2F69 | U16 | 1 kWh | |
| A87-A89 | HMI/versiyon/customer code | 0x090F/0910/0103 | U16 | 0.01 | OPSİYONEL metadata — alınabilir, öncelik düşük |

### 3.2 B — BMS Parametreleri (FULL — B01-B23)

| Param | Ad | Adres | Tip | Ölçek/Birim | Not |
|:------|:---|:------|:----|:------------|:----|
| B01 | Batarya pack çalışma durumu | 0x0300 | U16 | 1 | üretici tanımlı |
| B02 | **BMS status word** | 0x0301 | U16 | 1 | Appendix 1 — bitfield |
| B03 | Pack toplam voltaj | 0x0302 | U16 | 0.1 V | |
| B04 | Pack toplam akım | 0x0303 | S16 | 0.1 A | |
| B05 | **Pack SOC** | 0x0304 | U16 | 0.1% | canonical `soc` |
| B06 | Pack SOH | 0x0305 | U16 | 0.1% | canonical `soh` |
| B07/B08 | Maks şarj/deşarj akımı | 0x0306/0x0307 | U16 | 0.1 A | |
| B09/B10 | **Maks şarj/deşarj gücü** | 0x0308/0x0309 | U16 | 0.1 kW | canonical `charge_power_limit`/`discharge_power_limit` — manevra vurgusu: şarj/deşarj sırasında KULLANILIR |
| B11/B12 | Maks/min hücre SOC | 0x030A/0x030B | U16 | 0.1% | |
| B13/B14 | En yüksek/en düşük hücre sıcaklığı | 0x030C/0x030D | S16 | 0.1°C | canonical `max_cell_temp`/`min_cell_temp` |
| B15/B16 | Maks/min hücre voltajı | 0x030E/0x030F | U16 | 0.001 V | kalibrasyon tetiği (sapma) adayı |
| B17/B18 | Pack üst/alt voltaj limiti | 0x0310/0x0311 | U16 | 0.1 V | |
| B19/B20 | Kullanılabilir şarj/deşarj enerjisi | 0x0312/0x0313 | U16 | 0.1 kWh | |
| B21 | Pack anma enerjisi | 0x0314 | U16 | 0.001 MWh | |
| B22 | Pack SOP | 0x0315 | S16 | 0.1 kW | |
| B23 | DC tarafı sistem durumu | 0x0316 | S16 | 1 | |

**B02 — BMS Operation Status Word (Appendix 1) bitfield planı:**

| Bit | Anlam | Bitfield adı |
|:----|:------|:-------------|
| 0 | BMS iletişim yok | `BMS No Comm` |
| 1 | BMS fault | `BMS Fault` |
| 4 | BMS şarj yasak | `BMS Charge Prohibited` |
| 5 | BMS deşarj yasak | `BMS Discharge Prohibited` |
| 6 | Başlatılıyor | `Initializing` |
| 7 | BMS alarm | `BMS Alarm` |
| 8 | BMS şarj+deşarj yasak | `BMS Chg&Dischg Prohibited` |

(bit2/3 SOC limitleri reserved; bit9-15 reserved — bitfield'da yer verilmez.)

### 3.3 C — Metadata (C65-C73)

| Param | Ad | Adres | Not |
|:------|:---|:------|:----|
| C65 | CAN hızı | 0x0B1E | teşhis |
| C67 | BMS NMT düğüm durumu | 0x0B20 | teşhis |
| C68 | BMS CAN iletişim timeout | 0x0B21 | sn |
| C69 | BMS CAN modül durumu | 0x0B22 | 0 normal / 1 passive bus off / 2 bus off |
| C70/C71 | CAN gönderim/alım hata sayacı | 0x0B23/0x0B24 | |
| C72 | Son CAN LEC iletim hatası | 0x0B25 | |
| C73 | BMS CAN iletişim durumu | 0x0B26 | 0 normal / 1 timeout |

### 3.4 D — Arıza/Alarm Sözcükleri (FULL — D01-D18)

| Param | Ad | Adres | Tip | Not |
|:------|:---|:------|:----|:----|
| D01-D10 | Fault status word 1-10 | 0x2FB5-0x2FBE | U16 | Appendix 2 bit haritaları |
| D11-D18 | Alarm status word 1-8 | 0x2FBF-0x2FC6 | U16 | **Appendix 3 bit haritaları** |

**Alarm çözümlemesi (kullanıcı kararı):** D11-D18 alarm sözcükleri Appendix 3'e göre **adlandırılmış bitfield** olarak çözümlenir. Öne çıkan bitler (kural tetikleyicisi adayları):

| Sözcük | Bit | Ad |
|:-------|:----|:---|
| Alarm 1 | 5 | BMS system fault |
| Alarm 1 | 8 | BMS insulation fault |
| Alarm 2 | 10 | DC side switch fault |
| Alarm 3 | 9 | **Islanding fault** (FL-10) |
| Alarm 3 | 15 | Low insulation resistance |
| Alarm 4 | 0 | Insulation detection failed |
| Alarm 5 | 6 | Parallel communication fault |
| Alarm 6 | 5 | EMS communication fault (dual network) |
| Alarm 6 | 11 | 220 V control power disconnected |
| Alarm 6 | 15 | **Local emergency stop fault** |
| Alarm 7 | 0 | **Remote emergency stop fault** |
| Alarm 7 | 1 | BMS emergency stop fault |
| Alarm 7 | 9 | **Cabinet door fault** |
| Alarm 8 | 5/6 | DC sampling disconnected (midpoint/voltage) |

Fault sözcükleri (D01-D10) aynı adlandırmayla ("Fault occurred" semantiği) ikincil bitfield seti olarak çözümlenir; dokümanda bit listesi verilmeyenler "HMI'ya bak" notuyla atlanır.

### 3.5 S — Setting Parametreleri (FULL — S01-S41)

| Param | Ad | Adres | Tip | Değer | Not |
|:------|:---|:------|:----|:------|:----|
| S01 | **Komut kaynağı** | 0x0E00 | R/W U16 | 0 HMI / 1 EMS / 2 Background | EMS kontrol için **1 yazılmalı** — açılış hazırlık adımı |
| S02 | İşletme modu | 0x0E01 | R/W | 0 on-grid / 1 off-grid | FL-09/10 |
| S03 | On-grid kontrol modu | 0x0E02 | R/W | 0 P-Q / 1 sabit DC akım / 2 sabit DC voltaj | |
| S04 | Reaktif güç modu | 0x0E04 | R/W | 0 sabit Q / 1 sabit PF / 2 Q-U | |
| S05 | Güç öncelik modu | 0x0E06 | R/W | 0 orantısal / 1 aktif / 2 reaktif | |
| S06 | **Aktif güç setpoint** | 0x0E19 | R/W S16 | K01..K02 aralığı | **şarj NEGATİF** |
| S07 | Reaktif güç setpoint | 0x0E1A | R/W S16 | kVar | |
| S08 | Güç faktörü setpoint | 0x0E1B | R/W S16 | −1..1 (0.001) | |
| S09 | Sabit-V voltaj setpoint | 0x0E1C | R/W U16 | 0.1 V | |
| S10 | Sabit-akım setpoint | 0x0E1D | R/W S16 | 1 A | |
| S11 | Güç değişim hızı | 0x0E1E | R/W U16 | %Pn/s, default 10000 | rampa |
| S13 | Off-grid ivme oranı | 0x0E20 | R/W | 0.01 pu/s | |
| S14 | Off-grid hat voltajı RMS | 0x0E23 | R/W | 0.1 V | |
| S15 | İzolasyon algılama komutu | 0x0E07 | R/W | 0 kapalı / 1 açık | |
| S16 | **Start komutu** | 0x0E14 | R/W | 0 geçersiz / 1 gönder | |
| S17 | **Stop komutu** | 0x0E15 | R/W | 0 geçersiz / 1 gönder | |
| S18 | **Fault reset** | 0x0E16 | R/W | 0 geçersiz / 1 gönder | FL-06 |
| S19 | **Standby komutu** | 0x0E17 | R/W | 0 geçersiz / 1 gönder | FL-03/FL-06 |
| S20-S23 | Zaman senkronizasyonu (YYYY/MMDD/hhmm/s) | 0x0E27-0x0E2A | R/W | | TEİAŞ #19 adayı — management job |
| S27 | Aktif silo algılama | 0x057E | R/W | 0/1 | |
| S28 | Sıfır güç standby | 0x0539 | R/W | default 1 | |
| S32 | **Grid-forming** | 0x1200 | R/W | 0/1 | FL-08 Black Start |
| S33-S35 | Primer frekans kontrolü (enable/dead zone/katsayı) | 0x1208/0x120A/0x1209 | R/W | | FL-08/09 |
| S36-S38 | Primer voltaj kontrolü | 0x120C/0x120E/0x120D | R/W | | FL-08/09 |
| S39-S41 | Sanal atalet/sönüm/ikaz | 0x1203/0x1204/0x1205 | R/W | | FL-08/09 |

(S12, S24-S31 reserved — atlanır.)

## 4. Device Config Tasarımı

Dosya: `services/device-service/deployment/config-field/pcs-<N>.json` (field tier; N = konteyner indeksi, 1'den başlar).

```jsonc
{
  "deviceId": "PCS-1",
  "name": "PCS 1",
  "manufacturer": "Wattox",
  "model": "MPCS",
  "protocol": "MODBUS",
  "type": "pcs",
  "connection": { "host": "192.168.x.y", "port": 502, "unitId": 1 },
  "pollIntervalMs": 1000,
  "transport": { "kind": "tcp" },   // veya { "kind": "simulator", "type": "wattox-pcs" }
  "telemetry": [
    { "protocol": "MODBUS", "name": "PCS Operation Status", "registerAddress": 12157, "registerTableType": "INPUT_REGISTER", "registerDataType": "UINT16", "scale": 1, "offset": 0, "canonical": "operation_status" },
    { "protocol": "MODBUS", "name": "Grid Active Power", "registerAddress": 12158, "registerTableType": "INPUT_REGISTER", "registerDataType": "INT16", "scale": 1, "offset": 0, "canonical": "power_kw" },
    { "protocol": "MODBUS", "name": "Battery SOC", "registerAddress": 772, "registerTableType": "INPUT_REGISTER", "registerDataType": "UINT16", "scale": 0.1, "offset": 0, "canonical": "soc" }
    // ... §3 tablolarının tamamı
  ],
  "bitfieldConfigs": [
    { "name": "BMS Status Word", "registerAddress": 769, "registerTableType": "INPUT_REGISTER", "fields": [
      { "bitStart": 4, "bitEnd": 4, "name": "BMS Charge Prohibited", "dataTag": "bms", "description": "BMS şarj yasak", "unit": "-", "canonical": "bms_charge_prohibited" }
      // ... Appendix 1 bitleri
    ]},
    { "name": "Alarm Status Word 1", "registerAddress": 12223, "registerTableType": "INPUT_REGISTER", "fields": [ /* Appendix 3 bitleri */ ] }
    // ... Alarm 2-8 + Fault 1-10
  ],
  "commands": {
    "start":          { "label": "Başlat", "telemetries": [{ "name": "Start Command", "value": 1 }], "validate": { "reads": [{ "name": "PCS Operation Status", "expect": { "neq": 0 } }] } },
    "stop":           { "label": "Durdur", "telemetries": [{ "name": "Stop Command", "value": 1 }], "validate": { "reads": [{ "name": "PCS Operation Status", "expect": 0 }] } },
    "standby":        { "label": "Standby", "telemetries": [{ "name": "Standby Command", "value": 1 }], "validate": { "reads": [{ "name": "PCS Operation Status", "expect": 1 }] } },
    "fault_reset":    { "label": "Fault Reset", "telemetries": [{ "name": "Fault Reset Command", "value": 1 }] },
    "charge":         { "label": "Şarj", "params": { "powerKw": { "type": "number", "required": true, "min": 0 } }, "telemetries": [{ "name": "Active Power Setpoint", "value": "-{{powerKw}}" }], "validate": { "reads": [{ "name": "Grid Active Power", "expect": "negative" }] } },
    "discharge":      { "label": "Deşarj", "params": { "powerKw": { "type": "number", "required": true, "min": 0 } }, "telemetries": [{ "name": "Active Power Setpoint", "value": "{{powerKw}}" }], "validate": { "reads": [{ "name": "Grid Active Power", "expect": "positive" }] } },
    "set_command_source": { "label": "EMS kontrol", "telemetries": [{ "name": "Command Source", "value": 1 }] }
  },
  "alarms": [ /* cihaz alarm kuralları — alarm bitfield'larından (AGENTS alarm sözleşmesi) */ ]
}
```

**Kararlar:**
- Adresler ondalık girilir (0x2F7D = 12157 vb.) — mevcut config konvansiyonuyla uyum.
- `registerTableType: "INPUT_REGISTER"` okumalar, `"HOLDING_REGISTER"` yazmalar (S-register'ları).
- **validate `expect` uzantısı:** mevcut şema `expect: string|number|boolean` ile birebir eşitlik bekler; "negatif güç"/"sıfırdan farklı durum" gibi doğrulamalar Aşama-2 JSDoc'unda şema uzantısı olarak değerlendirilir (basit alternatif: read-back değer kontrolünü komut parametresiyle sınırlamak, karmaşık koşulları manevra katmanına bırakmak). **Karar:** MVP'de birebir eşitlik + `neq` için değer kontratı şemaya eklenir (bkz. T-P3).
- `charge`/`discharge` komutları işaret dönüşümünü config'te taşır (`-{{powerKw}}` — mevcut `CommandJobBuilder` işaret öneki desteği).

## 5. Simülatör — `simulators/wattox-pcs`

- Register-accurate: §3 tablolarının tamamı başlangıç değerleriyle kurulur; telemetri okumaları aynı adreslerden döner.
- **Durum makinesi:** `Stop(0) → start → Standby(1) → setpoint |P|>0 → Charge(2)/Discharge(3)` (işaretle); `stop → Stop`; `standby → Standby`.
- Komutlar **anında** uygulanır (validate read-back tick beklemez — mevcut simülatör kuralı).
- Setpoint yazıldığında A40 (grid aktif güç) rampa ile setpoint'e yakınsar (`S11` güç değişim hızı); B09/B10 limitlerini aşmaz.
- Arıza senaryoları: simülatör konfigürasyonu ile fault/alarm word bitleri set edilebilir (FL-10 islanding, E-stop vb. gözle demoları için).
- `SimulatorRegistry`'e `wattox-pcs` kaydı eklenir; `transport.kind: "simulator", type: "wattox-pcs"`.

## 6. Hata Kategorileri

| Durum | Kategori | Davranış |
|:------|:---------|:---------|
| Register yanıtı yok / timeout | Beklenen — device-service | `modbus_read_failed` logu + offline işaret (mevcut altyapı) |
| Geçersiz setpoint (K01-K02 dışı) | Beklenen — cihaz | Modbus exception 0x03 — komut başarısız, `command_rejected` |
| S01 ≠ EMS | Beklenen — operasyonel | Komutlar HMI'dan yönetiliyor — açılış hazırlığında `set_command_source` yazılır; yazılamazsa warn log |
| Fault/alarm word bitleri | Veri | Bitfield olarak okunur; cihaz alarm kuralları (`alarms[]`) geçiş-odaklı loglar |

## 7. Kabul Kriterleri

| Kod | Kriter | Kanıt türü |
|:----|:-------|:-----------|
| K-P1 | Config dosyası `deviceConfigFileSchema`'dan geçer (zod) | unit |
| K-P2 | Tüm §3 register'ları config'te adres/tip/ölçek birebir | unit (config okuma + doğrulama testi) |
| K-P3 | Alarm bitfield'ları Appendix 3'e göre adlandırılmış ve çözümleniyor | unit (bitfield testi) |
| K-P4 | Simülatör register değerleri protokolle birebir; durum makinesi Start→Standby→Charge/Discharge çalışıyor | unit (simülatör) |
| K-P5 | `charge`/`discharge` komutları işaret konvansiyonuyla (şarj negatif) job üretiyor | unit (CommandJobBuilder — platform/commands) |
| K-P6 | `set_command_source` açılış hazırlık akışı belgeli ve testli | unit |
| K-P7 | Gözle: simülatör transport'la field device-service PCS-1'i okuyor; komut → read-back doğrulama | gözle (bun run dev) |
| K-P8 | Kapılar: yeni kod ≥%70 satır; bitfield/simülatör ≥%90 branch | coverage |

## 8. Görev Listesi

| Görev | İçerik |
|:------|:-------|
| T-P1 | JSDoc + tipler: gerekirse şema uzantısı (`validate.expect` zenginleştirme) — `shared-types` |
| T-P2 | `config-field/pcs-1.json` — §3 tam register seti + bitfield'lar + komutlar |
| T-P3 | `validate.expect` uzantısı (sayısal koşul: eq/neq/positive/negative) — platform/commands + device-service |
| T-P4 | `simulators/wattox-pcs` simülatörü + `SimulatorRegistry` kaydı |
| T-P5 | Config + simülatör testleri (K-P1..K-P6) |
| T-P6 | Field stack compose'a device-service eklenmesi (config mount, SERVICE_TIER=field) |
| T-P7 | Gözle kontrol (K-P7) + DOGRULAMA + TEST-KAPSAMI + envanter |

## 9. Aşama Eşlemesi (6 aşamalı iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | T-P1/T-P3 sözleşmeleri |
| 3. TEST | T-P5 (kırmızı önce) |
| 4. IMPL | T-P2/T-P4/T-P6 |
| 5. SONUÇ | `PCS-WATTOX-DOGRULAMA.md` |
| 6. KAPSAM | `PCS-WATTOX-TEST-KAPSAMI.md` + test-envanteri |
