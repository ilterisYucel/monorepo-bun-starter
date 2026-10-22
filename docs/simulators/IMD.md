# IMD Simülatörü (İzolasyon İzleme Cihazı)

> Cihaz: Bender **isoPV1685RTU** izolasyon monitörü (gerçek Modbus haritası — K4).
> Kod: `imd/imd-simulator.ts#ImdSimulator`, register: `imd/register-map.ts`.
> Kaynak: isoPV1685RTU Modbus PDF §3. FL-11 (toprak/izolasyon direnci hatası) veri kaynağı.

Bu cihaz, DC sistemin **toprak izolasyon direncini** ölçen salt-okunur bir izleme
cihazıdır. Direnç düştüğünde "Warning" (4) alarmı üretir.

---

## 1. Başlangıç durumu

`imd/imd-simulator.ts#ImdSimulator.constructor`:
- `resistance = 1_000_000 Ω` (1 MΩ — sağlıklı)
- `prewarning = false`, `alarm = false`, `deviceError = 0`

Sabitler: `HEALTHY_RESISTANCE = 1_000_000`, `OK = 0`, `WARNING = 4`.

---

## 2. `start()` / `stop()` / `port()`

Standart `SelfHostedSimulator` deseni; `tick: (s) => this.tick(s)` bağlanır.

---

## 3. `tick(elapsedSeconds)` — adım adım

`imd/imd-simulator.ts#ImdSimulator.tick` (süre kullanılmaz; anlık örnekleme):

1. **Alarm aktifse** (`alarm === true`):
   `resistance = round(random × 80_000) + 10_000` → **10 kΩ – 90 kΩ** arası rastgele.
   Bu, FL-11 toprak arızasının düşük direnç bölgesidir (eşik 100 kΩ'un altı). Erken `return`.
2. **Sağlıklıysa:**
   `resistance = 1_000_000 + round((random − 0.5) × 100_000)` → **950 kΩ – 1.05 MΩ** bandında jitter
   (gerçek ölçüm gürültüsü).

Rastgelelik `crypto.getRandomValues` ile üretilir (`imd/imd-simulator.ts#randomFloat`) — deterministik değildir.

---

## 4. Arıza enjeksiyonu (sınıf API'si — Modbus yazma YOK)

| Metot | Etki |
| :--- | :--- |
| `imd/imd-simulator.ts#ImdSimulator.setFault(true)` | `prewarning = true`, `alarm = true`; **bir sonraki tick** direnci 10–90 kΩ'a düşürür |
| `imd/imd-simulator.ts#ImdSimulator.setFault(false)` | Bayraklar temizlenir, `resistance = 1 MΩ` (**anında**) |
| `imd/imd-simulator.ts#ImdSimulator.setDeviceError(code)` | `deviceError = code` (0 temizler, >0 hata kodu) |

Modbus üzerinden IMD'ye **yazma yoktur**; salt-okunur izleme cihazıdır.

---

## 5. Okuma davranışı (INPUT REGISTER)

`imd/imd-simulator.ts#ImdSimulator.readInputRegister`:

| Adres (dec) | Adres (hex) | Dönen |
| :--- | :--- | :--- |
| 8192 | 0x2000 | İzolasyon direnci **yüksek kelime** (UInt32 BE) |
| 8193 | 0x2001 | İzolasyon direnci **düşük kelime** |
| 8196 | 0x2004 | Prewarning: 0 = OK, 4 = Warning |
| 8197 | 0x2005 | Alarm: 0 = OK, 4 = Warning |
| 8206 | 0x200E | Device Error: 0 yok, >0 kod |
| Diğer | — | 0 |

- Direnç okuma: `hi × 0x10000 + lo` (big-endian iki kelime).
- **FL-11 kural girdileri:** `0x2005` (Insulation Alarm) + `0x200E` (Device Error).

---

## 6. Register grupları

`imd/register-map.ts#INPUT`: `INSULATION_RESISTANCE: 8192`, `PREWARNING: 8196`,
`ALARM: 8197`, `DEVICE_ERROR: 8206`.

> Gerçek Bender haritasında başka alanlar da vardır (kaçak kapasitesi, net gerilim,
> U+/U- toprak gerilimleri, kuplaj sıcaklıkları, aşırı sıcaklık alarmları, toprak
> bağlantı/test durumu) ancak **simüle edilmez** ve 0 döner.

---

## 7. Notlar

- Alarm semantiği Bender'e özgüdür: **0 = OK, 4 = Warning** (1 değil).
- Test: `imd/imd.test.ts` (sağlıklı bant, `setFault` → <100 kΩ, `setDeviceError`).
