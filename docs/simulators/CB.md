# CB Simülatörü — DC Şalter (SYW6GZ-4000)

> Cihaz: DC şalter (K2 rework: **kesici → şalter** modeli).
> Kod: `cb/cb-simulator.ts#CbSimulator`, register: `cb/register-map.ts`.

Bu simülatör bir DC şalterin **uzaktan açma/kapama bobinlerini** ve **yardımcı
kontak geri bildirimini** taklit eder. Trip / akım / sıcaklık / eşik / reset
semantiği **yoktur** — şalterde trip mekanizması modellenmez.

---

## 1. Model ve başlangıç durumu

- `open` = **shunt trip bobin** (uzaktan açma komutu), `close` = **closing coil** (kapatma bobini).
- Gerçek pozisyon **yardımcı kontaklardan** (aux contact) geri bildirilir.
- Başlangıç: `closed = true` (şalter kapalı), `pendingOpen = false`, `pendingClose = false`
  (`cb/cb-simulator.ts#CbSimulator.constructor`).
- CB **input/holding register taşımaz** — bu tablolar hep 0 döner.

---

## 2. `start()` / `stop()` / `port()`

Standart `SelfHostedSimulator` deseni (`network` yoksa no-op, idempotent);
`tick: (s) => this.tick(s)` bağlanır.

---

## 3. `tick(elapsedSeconds)` — komut darbelerinin uygulanması

`cb/cb-simulator.ts#CbSimulator.tick` (süre kullanılmaz):

1. `pendingOpen` true ise bayrak temizlenir; şalter kapalıysa `closed = false` yapılır.
2. `pendingClose` true ise bayrak temizlenir; şalter açıksa `closed = true` yapılır.

**Kritik tasarım:** Darbe **yazım anında değil, tick'te** uygulanır. Böylece
"yaz → sonraki okumada doğru değeri gör" (validate/read-back) akışı tutarlı olur.

---

## 4. Yazma davranışı

`cb/cb-simulator.ts#CbSimulator.writeCoil` — yalnızca `value === true` işlenir;
`false` **yok sayılır**. Bilinmeyen adres yok sayılır.

| Tablo | Adres | Sembol | Yazılan | Tepki |
| :--- | :--- | :--- | :--- | :--- |
| COIL | 0 | `COILS.OPEN` | `true` | `pendingOpen = true` → sonraki tick'te şalter açılır |
| COIL | 1 | `COILS.CLOSE` | `true` | `pendingClose = true` → sonraki tick'te şalter kapanır |

- `readCoil` → yalnız **bekleyen darbe** bayrağını döner (OPEN → `pendingOpen`, CLOSE → `pendingClose`).
- `writeHoldingRegister` → no-op; `readHoldingRegister` / `readInputRegister` → hep 0.

---

## 5. Okuma davranışı — yardımcı kontaklar (DISCRETE)

`cb/cb-simulator.ts#CbSimulator.readDiscreteInput`:

| Adres | Sembol | Dönen | Anlam |
| :--- | :--- | :--- | :--- |
| 0 | `DISCRETE.IS_CLOSED` | `closed` | Şalter kapalı (NC kontak) |
| 1 | `DISCRETE.IS_OPEN` | `!closed` | Şalter açık (NO kontak) |

Bu iki değer her zaman birbirinin değilidir (tek fiziksel durum).

---

## 6. Register grupları

`cb/register-map.ts`:
- **COILS:** `OPEN: 0`, `CLOSE: 1` (RESET kaldırıldı — şalterde trip yok)
- **DISCRETE INPUTS:** `IS_CLOSED: 0`, `IS_OPEN: 1`
- **INPUT / HOLDING REGISTERS:** yoktur (okuma döndürmez)

---

## 7. Notlar

- Şaltere yazılıp okunabilen gerçek durum **aux kontak (DI)** üzerinden gelir;
  kontrol noktaları coil'e darbe gönderir, sonucu DI'den teyit eder.
- Test senaryoları: `cb/cb.test.ts` (aç/kapa darbeleri, bilinmeyen adres ihmal).
