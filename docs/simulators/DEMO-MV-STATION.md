# Demo MV İstasyon Simülatörü (OG Köşk)

> Rol: 34,5 kV **orta gerilim (OG) köşkü** — H01/H02/H04/H05 hücreleri ve toprak
> ayırıcıları. İnterlock mantığı burada uygulanır.
> Kod: `demo-mv-station/demo-mv-simulator.ts#DemoMvStationSimulator`,
> register: `demo-mv-station/register-map.ts`.
> SPEC: UC-9 / T-37 · FR-9.2 interlock'ları.

---

## 1. Başlangıç durumu

`demo-mv-station/demo-mv-simulator.ts#DemoMvStationSimulator` başlangıç (`MvState`):

- **Kesiciler kapalı:** H01, H02, H04, H05 = `true`
- **Toprak ayırıcıları açık:** H01, H04, H05 = `false`
- Bara gerilimi `kV = 34.5`, frekans `hz = 50`
- **Şebeke yolu bus'ı** (`gridLink`): yayın gelmeyen hücre "kapalı" varsayılır
  (`GridLinkBus`); her coil yazımından sonra güncel pozisyonlar yayınlanır.

---

## 2. `start()` / `stop()` / `port()`

Standart `SelfHostedSimulator` deseni. **Tick boştur** (`tick: () => {}`):
zamanla değişen dinamik simülasyon yoktur; tüm değişiklikler coil yazımında anında olur
ve `publish()` ile şebeke yolu bus'ına yayınlanır (`gridLink` varsa).

---

## 3. `tick(elapsedSeconds)` — yok

`tick: () => {}` olarak bağlanır. Kesici/toprak pozisyonları yalnızca coil
yazımıyla değişir; her yazımdan sonra `publish()` şalterleri bus'a yazar
(`demo-mv-station/demo-mv-simulator.ts#DemoMvStationSimulator.publish`).

---

## 4. Yazma davranışı — komut darbeleri (COIL) ve interlock

`demo-mv-station/demo-mv-simulator.ts#DemoMvStationSimulator.writeCoil` — yalnızca
`value === true` işlenir (komut darbesi). Adresler `demo-mv-station/register-map.ts#COILS`:

| Coil | Ad | Tepki / interlock |
| :--- | :--- | :--- |
| 0 | `H01_OPEN` | H01 kesici açılır |
| 1 | `H01_CLOSE` | H01 toprağı açıksa H01 kapanır |
| 2 | `H02_OPEN` | H02 ayırıcı açılır |
| 3 | `H02_CLOSE` | H02 kapanır (**interlock yok** — H02'nin toprağı yok) |
| 4 | `H04_OPEN` | H04 kesici açılır |
| 5 | `H04_CLOSE` | **H04 toprağı açıkken** kapanır |
| 6 | `H05_OPEN` | H05 kesici açılır |
| 7 | `H05_CLOSE` | **H05 toprağı açıkken** kapanır |
| 8 | `H01_ES_OPEN` | H01 toprağı açılır |
| 9 | `H01_ES_CLOSE` | **HER ZAMAN KİLİTLİ** (H01 toprağı POI'den enerjili — no-op) |
| 10 | `H04_ES_OPEN` | H04 toprağı açılır |
| 11 | `H04_ES_CLOSE` | **H04 kesici açıkken** toprak kapanır |
| 12 | `H05_ES_OPEN` | H05 toprağı açılır |
| 13 | `H05_ES_CLOSE` | **H05 kesici açıkken** toprak kapanır |

**Uygulanan FR-9.2 interlock'ları:**
1. Toprak kapalıyken kesici kapanmaz.
2. Kesici kapalıyken toprak kapanmaz.
3. H01 toprağı POI'den enerjili olduğu için **her zaman** kilitli (H01_ES_CLOSE no-op).

Bilinmeyen coil ve interlock ihlali → **değişiklik yok** (sessiz reddedilir).

### Şebeke yolu yayını (gridLink)

- Host (`host.ts#createGridLinks`) her `demo-mv-station` config'i için bir
  `GridLinkBus` kurar; demo'da **DEMO-MV-1** ve **DEMO-MV-2** ayrı bus'lardır.
- PCS simülatörleri `details.gridLink: { deviceId, feeder }` ile bu bus'ı sorgular;
  zincir `H01 ∧ fider (H04/H05) ∧ H02` kapanmadan PCS enerjili sayılmaz.
- Demo eşlemesi: PCS-1/H04 + PCS-2/H05 → `DEMO-MV-1`; PCS-3/H04 + PCS-4/H05 →
  `DEMO-MV-2`. Detay: [GRID-LINK.md](GRID-LINK.md).

---

## 5. Okuma davranışı (INPUT REGISTER)

`demo-mv-station/demo-mv-simulator.ts#DemoMvStationSimulator.readInputRegister`
(`INPUT_REGS`):

| Adres | Ad | Değer |
| :--- | :--- | :--- |
| 0 | `H01_BREAKER` | 1=kapalı / 0=açık |
| 1 | `H02_BREAKER` | 1/0 |
| 2 | `H04_BREAKER` | 1/0 |
| 3 | `H05_BREAKER` | 1/0 |
| 4 | `H01_EARTH` | 1/0 |
| 5 | `H04_EARTH` | 1/0 |
| 6 | `H05_EARTH` | 1/0 |
| 7 | `KV_X10` | `round(kV × 10)` = **345** (34,5 kV) |
| 8 | `HZ_X100` | `round(hz × 100)` = **5000** (50 Hz) |

- `readDiscreteInput` → input register `!= 0` ise `true` (türetilmiş).
- `readCoil` → her zaman `false`.
- `readHoldingRegister` → 0; `writeHoldingRegister` → no-op (holding yok).

---

## 6. Register grupları

`demo-mv-station/register-map.ts`:
- **INPUT_REGS:** `H01_BREAKER: 0` … `H05_BREAKER: 3`, `H01_EARTH: 4` …
  `H05_EARTH: 6`, `KV_X10: 7`, `HZ_X100: 8`
- **COILS:** `H01_OPEN: 0` … `H05_ES_CLOSE: 13` (14 komut darbesi)

---

## 7. Notlar

- Gerilim (34,5 kV) ve frekans (50 Hz) **sabittir**; değişen tek şey kesici/toprak
  pozisyonlarıdır.
- Test: `demo-mv-station/demo-mv-simulator.test.ts` (AK-9.1/9.2 interlock senaryoları).
- Yardımcı sorgular: `cellPosition(id)`, `earthClosed(id)` (test/gözle erişim).
