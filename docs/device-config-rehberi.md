# Cihaz Konfigürasyon Rehberi

> **Hedef kitle:** Yazılım bilmeyen saha/konfigürasyon personeli.
> **Kapsam:** `device-service/config/*.json` dosyalarında Modbus cihazlarının nasıl tanımlanacağı.
> **Temel fikir:** Bir cihaz dosyası = cihazın kimliği + bağlantı bilgisi + okunacak/yazılacak değerlerin listesi. Sistem gerisini halleder.

## 1. En küçük örnek

Bir cihaz dosyası şuna benzer (`bsc-1.json`):

```json
{
  "deviceId": "BSC-1",
  "name": "BSC Main",
  "manufacturer": "BSC",
  "model": "BSC-2000",
  "protocol": "MODBUS",
  "connection": {
    "host": "127.0.0.1",
    "port": 502,
    "slaveId": 1
  },
  "telemetry": [
    {
      "name": "BSC SOC",
      "description": "System SOC among online racks",
      "unit": "%",
      "protocol": "MODBUS",
      "registerAddress": 30055,
      "registerTableType": "INPUT_REGISTER",
      "registerDataType": "UINT16",
      "scale": 0.01,
      "offset": 0,
      "priority": 0,
      "byteOrder": "BIG_ENDIAN",
      "tags": { "rack_id": "system" },
      "canonical": "soc"
    }
  ]
}
```

Bu dosya şunu der: *"BSC-1 cihazından, 30055 numaralı input register'ı oku; ham değeri 0.01 ile çarp; çıkan sayıyı 'BSC SOC' adıyla, '%' birimiyle raporla."*

## 2. Alanların tek tek anlamı

### 2.1 Cihaz kimliği (dosya başı)

| Alan | Anlamı | Örnek |
|------|--------|-------|
| `deviceId` | Sistem içinde bu cihazın TEK kimliği. Ekranlarda ve veri tabanında bu adla görünür. Boşluk/büyük-küçük harfe dikkat — her dosyada farklı olmalı. | `"BSC-1"` |
| `name` | İnsanların okuyacağı ad. | `"BSC Main"` |
| `manufacturer` / `model` | Üretici ve model bilgisi (sadece kayıt amaçlı). | `"BSC"` / `"BSC-2000"` |
| `protocol` | Cihazın konuştuğu protokol. Şu an kullanılan: `"MODBUS"`. | `"MODBUS"` |

### 2.2 Bağlantı (`connection`)

| Alan | Anlamı | Örnek |
|------|--------|-------|
| `host` | Cihazın IP adresi (TCP bağlantı). | `"127.0.0.1"` |
| `port` | Modbus TCP portu (standart: 502). | `502` |
| `slaveId` | Cihazın Modbus ağındaki kimliği (1-247). | `1` |
| `timeout` | Cevap bekleme süresi, milisaniye (verilmezse 3000). | `3000` |

Seri bağlantı (RTU) kullanılacaksa: `path` (örn. `"/dev/ttyUSB0"`), `baudRate`, `dataBits`, `stopBits`, `parity` alanları kullanılır — bu alanlar cihazın seri port ayarlarıyla BİREBİR aynı olmalıdır.

### 2.3 Telemetri listesi (`telemetry`)

Her kayıt tek bir ölçüm noktasını tanımlar.

| Alan | Anlamı |
|------|--------|
| `name` | Ölçümün adı (ekranda/raporlarda görünen). Aynı isim farklı `tags` ile TEKRARLANABİLİR (örn. rack başına aynı ölçüm). |
| `description` | İnsan okunur açıklama. |
| `unit` | Birim: `"V"`, `"A"`, `"kW"`, `"%"`, `"°C"`, `"-"` (birimsiz). |
| `registerAddress` | Cihaz kılavuzundaki register adresi. **En kritik alan** — kılavuzda yazandan farklıysa yanlış değer okunur. |
| `registerTableType` | Register'ın türü — aşağıya bak. |
| `registerDataType` | Verinin nasıl saklandığı — aşağıya bak. |
| `scale` / `offset` | Dönüşüm formülü: **gerçek değer = ham değer × scale + offset**. |
| `priority` | YALNIZCA yazma sırasını belirler (0 en önemli, önce yazılır). Okumayı etkilemez. |
| `byteOrder` | Çok baytlı değerlerin bayt sırası — aşağıya bak. |
| `tags` | Etiketler (örn. `"rack_id": "1"`) — aynı isimli ölçümleri birbirinden ayırır. |
| `canonical` | Standart metrik adı (örn. `"soc"`, `"voltage"`). Ekranlar bu adla genel eşleme yapar. Yoksa davranış değişmez. |

#### `registerTableType` — register türleri

| Değer | Anlamı | Okuma | Yazma |
|-------|--------|:-----:|:-----:|
| `"HOLDING_REGISTER"` | 16-bit okuma/yazma register'ı (4x) | ✓ | ✓ |
| `"INPUT_REGISTER"` | 16-bit yalnızca-okunur register (3x) | ✓ | — |
| `"COIL"` | 1-bit okuma/yazma çıkışı (0x) | ✓ | ✓ |
| `"DISCRETE_INPUT"` | 1-bit yalnızca-okunur giriş (1x) | ✓ | — |

Kural: cihaz kılavuzunda "Read Only" yazan değerler INPUT/DISCRETE olmalıdır; yazılacak değerler HOLDING/COIL.

#### `registerDataType` — veri tipleri

| Değer | Kaç register | Açıklama |
|-------|:---:|----------|
| `"UINT16"` | 1 | 0-65535 işaretsiz tam sayı |
| `"INT16"` | 1 | ±32767 işaretli tam sayı |
| `"UINT32"` | 2 | 0-4 milyar işaretsiz |
| `"INT32"` | 2 | ±2 milyar işaretli |
| `"FLOAT32"` | 2 | Ondalıklı (32-bit IEEE) |
| `"FLOAT64"` | 4 | Ondalıklı (64-bit IEEE) |
| `"BOOL"` | 1 | 0/1 |

> 32 bit ve üzeri tipler YAN YANA 2 (veya 4) register kaplar. Örn. `UINT32` 30059'daysa, 30060'ı da kullanır — bir sonraki kaydın adresi buna göre verilmelidir.

#### `byteOrder` — bayt sırası

Cihaz kılavuzu "word order / byte order" için ne diyorsa o:

| Değer | Ne zaman kullanılır |
|-------|---------------------|
| `"BIG_ENDIAN"` | Standart — kılavuz bir şey demiyorsa bunu kullan. |
| `"LITTLE_ENDIAN"` | Byte'lar ters sıradaysa. |
| `"BIG_ENDIAN_SWAP"` | İki register (word) yer değiştiriyorsa. |
| `"LITTLE_ENDIAN_SWAP"` | Hem byte hem word ters. |

Şüphedeyseniz: bilinen sabit bir değeri (örn. seri numarası) okuyup hangi sıranın doğru sayıyı verdiğine bakın.

#### `scale` ve `offset` örnekleri

| Cihaz ham değeri | Kılavuz | scale | offset | Sonuç |
|------------------|---------|:-----:|:------:|-------|
| 5523 | "Voltaj, 0.001 çözünürlük" | 0.001 | 0 | 5.523 V |
| 50 | "Sıcaklık, °C = ham − 40" | 1 | −40 | 10 °C |
| 465 | — | 10 | 5 | 4650 (formüle göre 4650 = 465×10+5) |

Formül her zaman: **gerçek değer = ham × scale + offset**

## 3. Bitfield kayıtları (`bitfieldConfigs`)

Bazı cihazlarda tek bir register içindeki HER BİT ayrı bir sinyaldir (alarm, durum...). Bunları `telemetry` listesine koymayız — `bitfieldConfigs` bölümünde tanımlarız:

```json
"bitfieldConfigs": [
  {
    "registerAddress": 30037,
    "registerType": "INPUT_REGISTER",
    "fields": [
      {
        "bitStart": 0,
        "bitEnd": 0,
        "name": "BSC Alarm",
        "dataTag": "bsc_alarm",
        "description": "BSC Alarm",
        "unit": "-"
      },
      {
        "bitStart": 4,
        "bitEnd": 5,
        "name": "ChargeStatus",
        "dataTag": "charge_status",
        "description": "Charge Status",
        "unit": "-"
      }
    ]
  }
]
```

Bit numaralama (bir 16-bit register):

```
bit:  15 14 13 12 11 10  9  8  7  6  5  4  3  2  1  0
      ─────────────────────────────────────────────────
      │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │
      └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──
       15. bit                                0. bit (en sağ = en düşük değerli bit)
```

Kurallar:
- `bitStart` ve `bitEnd` 0-31 arasında olmalı, `bitEnd ≥ bitStart`.
- Tek bit için ikisi de aynıdır (örn. 0 ve 0).
- Çok bitli alan: bitler birleşik sayı olarak okunur (örn. bit 4-5 = 0-3 arası değer).
- `scale`/`offset` (opsiyonel) bit alanları için de geçerlidir.
- Aynı register'daki TÜM alanlar tek okumayla çözülür — alanları aynı register adresi altında toplayın.
- `registerType` yalnızca `"INPUT_REGISTER"` veya `"HOLDING_REGISTER"` olabilir.
- Sistem bu bitlerden çıkan değerleri otomatik olarak telemetriye ekler; alarm bitleri için ayrıca cihaz config'inin üst seviyesindeki `alarms` bölümüne bakın.

## 4. Sık yapılan hatalar

| Hata | Belirti | Doğrusu |
|------|---------|---------|
| Yanlış `registerAddress` (örn. kılavuzda 40001 yazıyor, 40001 girildi) | Sürekli aynı/yanlış değer | Kılavuzun "absolute address" tablosuna bakın; bazı kılavuzlar offset'li yazar (40001 = adres 0). Bizim sistem HAM adres bekler. |
| `scale`/`offset` çarpanı ters | Değerler 10/100 katı veya eksi | `gerçek = ham × scale + offset` formülünü bir kez elle doğrulayın. |
| `INPUT_REGISTER` olması gereken değer `HOLDING_REGISTER` yazıldı | Cihaz yazma denemesine hata verir | Kılavuzda "Read Only" yazanları INPUT yapın. |
| 32-bit değerin 2 register'ı unutuldu | Bir sonraki ölçüm çöp değer gösterir | UINT32/INT32/FLOAT32 = 2 register, FLOAT64 = 4 register. |
| Bit numarası 1'den başlatıldı | Bitfield değerleri bir bit kayık | Bitler 0'dan başlar — en sağdaki bit 0'dır. |
| `priority`'ye okuma sırası için anlam yüklendi | — | `priority` YALNIZCA yazma sırasını etkiler. Okuma sırasını etkilemez. |

## 5. Sınırlar

- Tek istekte en fazla 125 register okunur/yazılır — sistem otomatik gruplar; bu limit aşılırsa açık bir hata verir.
- Bitfield alanı en fazla 32 bit olabilir.
- Config hatası durumunda cihaz açılışta fail-fast hata verir (yanlış çalışmaktansa çalışmamayı tercih ederiz).

## 6. İlgili kurallar (teknik ekip için)

- `device_id`/`container_id`/`field_id` tag'leri config'e YAZILMAZ — bu tag'lerin tek sahibi device-service `TelemetryTagger`'dır.
- `canonical` serbest string'dir; UI alan adı konvansiyonu için AGENTS.md "Telemetry tagging & canonical metrics" bölümüne bakın.
- Alarm tanımları config'teki üst seviye `alarms` bölümündedir (bkz. AGENTS.md "Cihaz alarm sözleşmesi").
