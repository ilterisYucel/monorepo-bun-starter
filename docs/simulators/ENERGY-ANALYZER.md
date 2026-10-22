# Energy Analyzer Simülatörü (PM5340)

> Cihaz: Schneider **PM5340** enerji analizörü / enerji sayacı (3 fazlı).
> Kod: `energy-analyzer/simulator.ts#EnergyAnalyzerSimulator`,
> register: `energy-analyzer/register-map.ts`.
> Kaynak: PM51xx/PM53xx/PMC Register List.

Bu cihaz **salt okunurdur (ölçüm cihazı)** — komut kabul etmez; 3 faz akım/gerilim,
güç, güç faktörü, THD, enerji sayaçları ve talep (demand) değerlerini üretir.

---

## 1. Başlangıç durumu

`energy-analyzer/simulator.ts#defaultState`:
- 3 faz taban akımları: A=120 A, B=115 A, C=125 A
- `voltageLN = 230.0 V`, `voltageLL = 400.0 V`, `pf = 0.90`, `frequency = 50.0 Hz`
- Enerji sayaçları: aktif teslim 15750 kWh, aktif alış 120 kWh, reaktif teslim 4800 kvarh,
  reaktif alış 60 kvarh, görünür enerji 17200 kVAh
- Talep: `demandPowerPresent = 75`, `demandPowerPeak = 85`, `demandCurrentPresent = 120`

---

## 2. `start()` / `stop()` / `port()`

Standart `SelfHostedSimulator` deseni; `tick: (s) => this.tick(s)` bağlanır.

---

## 3. `tick(elapsedSeconds)` — adım adım

`energy-analyzer/simulator.ts#EnergyAnalyzerSimulator.tick`:

1. `secs = min(elapsedSeconds, 5)` — tek adımda en fazla 5 saniye ilerletilir.
2. **Fazlar güncellenir** (`updatePhase`, A/B/C):
   - `voltageLN` → 230 ± 3 V gürültüsüne **%30/sn** yakınsar.
   - `voltageLL = voltageLN × √3 × (1 ± %0.3)`.
   - `current` → taban akım ± 8 A gürültüsüne **%25/sn** yakınsar.
   - `powerFactor = 0.85 + rastgele×0.1`.
   - `activePower = V_LN × I × pf / 1000` (kW), `reactivePower = V_LN × I × sin(acos(pf)) / 1000` (kvar),
     `apparentPower = √(P²+Q²)` (kVA).
   - `thdCurrent` → %2–7 arası, `thdVoltage` → %1–3 arası yakınsar.
3. **Nötr akımı** faz dengesizliğine bağlı güncellenir.
4. **Frekans** → 50.0 ± 0.05 Hz'e **%30/sn** yakınsar.
5. **Enerji sayaçları** (Δsaat = `secs/3600`):
   - Aktif teslim `+= max(0, totalP) × Δsaat`; aktif alış `+= max(0, −totalP) × Δsaat × 0.05`
   - Reaktif teslim `+= max(0, totalQ) × Δsaat`; reaktif alış `+= max(0, −totalQ) × Δsaat × 0.02`
   - Görünür enerji `+= totalS × Δsaat`
6. **Talep (demand):** anlık güç talebi toplam aktif güce, akım talebi toplam akımın
   ~1/3'üne yakınsar; `demandPowerPeak` **peak-hold** (anlık değerin maksimumu) tutulur.

---

## 4. Yazma davranışı — YOK (salt okunur)

- `energy-analyzer/simulator.ts#EnergyAnalyzerSimulator.writeHoldingRegister` → **no-op**.
- `writeCoil` → no-op; `readCoil` / `readDiscreteInput` → her zaman `false`.
- `readHoldingRegister(address)` → **doğrudan** `readInputRegister(address)`'e delege edilir:
  yani Modbus FC3 (holding) okuması FC4 (input) ile aynı veriyi döner (bazı sayaç
  config'leri holding adresinden okur). **Yazma yine etkisizdir.**

---

## 5. Register grupları

`energy-analyzer/register-map.ts` — tümü **INPUT_REGISTER, FLOAT32 BE (2 register)**:

| Grup | Adresler | Adlar |
| :--- | :--- | :--- |
| Akımlar | 3000–3010 | `CURRENT_A/B/C/N/G/AVG` (G hep 0) |
| Akım dengesizliği | 3012–3018 | `CURRENT_UNBAL_A/B/C/WORST` |
| Faz-faz gerilim | 3020–3026 | `VOLTAGE_LL_AB/BC/CA/AVG` |
| Faz-nötr gerilim | 3028–3036 | `VOLTAGE_LN_A/B/C/NG/AVG` |
| Aktif güç | 3054–3060 | `ACTIVE_POWER_A/B/C/TOTAL` |
| Reaktif güç | 3062–3068 | `REACTIVE_POWER_A/B/C/TOTAL` |
| Görünür güç | 3070–3076 | `APPARENT_POWER_A/B/C/TOTAL` |
| Güç faktörü | 3078–3084 | `PF_A/B/C/TOTAL` (toplam = Σaktif / Σgörünür) |
| Frekans | 3110 | `FREQUENCY` |
| Enerji | 2700–2716 | `ACTIVE_ENERGY_DELIVERED/RECEIVED`, `REACTIVE_ENERGY_*`, `APPARENT_ENERGY_DELIVERED` |
| THD | 21300–21334 | `THD_I_A/B/C/N`, `THD_V_AB/BC/CA/AN/BN/CN` |
| Talep | 3766–3878 | `DEMAND_POWER_PRESENT/PEAK`, `DEMAND_CURRENT_PRESENT` |

---

## 6. Notlar

- `floatToRegisters` ile her değer big-endian iki kelimeye bölünür.
- `VOLTAGE_NG` (3034) haritada tanımlı ama okuma switch'inde işlenmez → 0 döner.
- Test yok; davranış `readInputRegister` switch'i üzerinden uçtan uca gözlemlenir.
