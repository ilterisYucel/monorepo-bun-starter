# BSC → PCS Connector (Konnektör)

> ⚠️ Bu bir **simülatör değil**, bir **köprü (adapter)**dır. BSC register'larını okuyup
> PCS'nin BMS bloğuna yazan sanal bir "gateway" cihazıdır.
> Kod: `bsc-pcs-connector/connector.ts#BscPcsConnectorAdapter`,
> mapping: `bsc-pcs-connector/mapping.ts`, kaynak okuyucu: `bsc-pcs-connector/source-reader.ts`,
> hedef: `bsc-pcs-connector/tcp-target.ts`, ters kanal: `bsc-pcs-connector/pcs-power-reader.ts`
> + `bsc/power-input.ts#IBatteryPowerInput`.
> Kaynak: `docs/architecture/DEVICE-SERVICE-MIMARISI.md` (BSC↔PCS link/konnektör bölümü).

Gerçek donanımda BSC ile PCS arasındaki link bir ara katmanla sağlanır; bu adapter o
katmanı taklit eder.

---

## 1. Rol ve yaşam döngüsü

`bsc-pcs-connector/connector.ts#BscPcsConnectorAdapter` — `IModbusSimulatorAdapter`
uygular ve **kendi izleme register'larını** yayınlayan bir self-host sunucu açabilir:

- `start()` — `network` verilirse kendi izleme sunucusunu açar (idempotent).
- `stop()` — izleme sunucusunu durdurur + kaynak/hedef bağlantılarını kapatır.
- `port()` — izleme sunucusunun portu.
- `host.ts#SimulatorHost.start`, `connector.sim` tanımlı BSC config'lerinden bu adapter'ı örnekler.
- **Ters kanal (`powerLink`) opsiyoneldir:** PCS toplam gücü (`S16`) okunup BSC'nin
  dış güç girdisine (`applyPowerKw`) yazılır — BSC SOC'si gerçek akıştan beslenir.

---

## 2. `tick(elapsedSeconds)` — BSC → PCS aktarımı

`bsc-pcs-connector/connector.ts#BscPcsConnectorAdapter.tick`:

0. **Ters kanal (PCS→BSC, opsiyonel):** `syncPowerLink` her tick'te önce çalışır —
   `pcsSources`'tan S16 (grid active power, işaretli) okunur, toplam güç
   `powerScale` ile ölçeklenir ve `applyPowerKw` ile BSC'ye verilir. Erişilemeyen
   PCS katkısı 0 sayılır; `powerSourceStatus` = 0 ok / 1 kısmi / 2 yok.
1. **Kaynak okuma + ayna güncelleme (kademeli bozulma):**
   - `constant` eşleme → sabit değer aynaya yazılır.
   - `register` eşleme → `raw × ratio + offset` (yuvarlanır) aynaya yazılır.
   - `bit` eşleme → kaynak bit hedef register'ın ilgili bitine yansıtılır (diğer bitler korunur).
   - `computed` eşleme → `(numRaw × numScale) / (denRaw × denScale)` (C8: akım limiti
     = güç limiti ÷ DC gerilim); payda 0 ise `fallbackAddress` denenir.
   - `socEnergy` eşleme → `SOC × anma enerji` (PCS15; şarj modunda `1 − SOC`).
   - `register` eşlemede birincil değer 0 ise `from.fallbackAddress`'e düşülür (M12).
   - Bir eşleme okunamazsa sayaç artar, **diğer eşlemeler devam eder**.
   - `sourceStatus`: 0 = ok, 1 = kısmi, 2 = kaynak yok. `lossBit` tanımlıysa
     `sourceStatus === 2` iken hedef bit set edilir (PCS14 — BMS no-comm).
2. **Değişen (dirty) adresler toplanır** — son yazılan değerden farklı olanlar.
   Değişiklik yoksa tick biter.
3. **`intervalMs` kısıtı** — son yazımdan bu yana `intervalMs` geçmediyse yazım ertelenir.
4. **Yazım** — dirty adresler **bitişik koşulara** bölünür (aralıklı adresler FC 0x10'da
   kayma üretir) ve hedefe `writeRegisters` ile yazılır. Başarılıysa `link = 1`,
   `lastWriteAt` + `writeCount` güncellenir; hata olursa `link = 0`, `connected = false`,
   `failCount` artar (sonraki tick yeniden bağlanır).

---

## 3. Mapping sözleşmesi (`mapping.ts`)

`bsc-pcs-connector/mapping.ts#BscPcsMapping`:

```json
{
  "target": { "host": "...", "port": 0 },
  "intervalMs": 1000,
  "lossBit": { "to": 0, "bit": 0 },
  "mappings": [ ... ]
}
```

- **`register`:** `raw_pcs = round(raw_bsc × ratio + offset)` — hedef `to` adresi **BMS
  bloğunda** olmalı (`BMS_BASE`…`BMS_BASE+BMS_SIZE`); `from.fallbackAddress` yedek.
- **`bit`:** kaynak register'ın N. biti → hedef register'ın M. biti.
- **`constant`:** sabit değer (ör. anma enerji).
- **`computed`:** `to = round(((numRaw × numScale) / (denRaw × denScale)) × ratio + offset)`
  (C8: akım limiti = güç limiti ÷ DC gerilim; LGES'te limit register'ı yok).
- **`socEnergy`:** `to = round(energyKwh × ratio + offset)`, `energyKwh = SOC × ratedKwh`
  (şarj modunda `(1 − SOC) × ratedKwh`) — PCS15 B19/B20.

**`connector.sim` (BSC config'i) alanları:**

```json
{
  "registerMap": "mappings/bsc-pcs-mapping.json",
  "pcsSources": [{ "deviceId": "PCS-1", "host": "127.0.0.1", "port": 502 }],
  "target": { "host": "field-device-service", "port": 15502 },
  "powerScale": 9
}
```

- `pcsSources` ters kanalın okuduğu PCS EMS uçlarıdır; `target` PCS BMS yüzü
  (demo: PCS-1 → 15502, PCS-2 → 15503, PCS-3 → 15504, PCS-4 → 15505).
- `powerScale` (demo **9**): az sayıda gerçek PCS, N sanal grubun temsilcisidir;
  ters kanalda `totalKw × powerScale` uygulanır.
- Kaynak referansı: `{ deviceId, table: "input"|"holding", address, size?, signed? }`;
  `size > 1` → big-endian kelime birleştirme (uint32/sint32).
- `parseBscPcsMapping` **STRICT** parse eder; geçersiz yapı `ValidationError` fırlatır (fail-fast).

---

## 4. Kaynak okuyucu (`source-reader.ts`)

`bsc-pcs-connector/source-reader.ts`:
- `ISourceReader` — `read(from)` + opsiyonel `close()`.
- `AdapterSourceReader` — in-process adapter map'inden okur (geçiş shim'i).
- `TcpSourceReader` — kaynak BSC'yi **gerçek Modbus TCP** ile okur (`deviceId → endpoint`);
  `combineWords` ile çok kelimeli değerleri birleştirir.

---

## 5. İzleme register'ları (input)

`bsc-pcs-connector/connector.ts#BscPcsConnectorAdapter.readInputRegister`:

| Adres | Ad | Anlam |
| :--- | :--- | :--- |
| 0x0000 | `REG_LINK` | 0 kopuk / 1 bağlı |
| 0x0001 | `REG_SOURCE` | 0 ok / 1 kısmi / 2 kaynak yok |
| 0x0002–0x0003 | `REG_LAST_WRITE` | Son yazım zamanı (LOW/HIGH) |
| 0x0004–0x0005 | `REG_WRITE_COUNT` | Başarılı yazım sayacı (LOW/HIGH) |
| 0x0006–0x0007 | `REG_FAIL_COUNT` | Başarısız yazım sayacı (LOW/HIGH) |
| 0x0008 | `REG_POWER_SOURCE` | Ters kanal durumu: 0 ok / 1 kısmi / 2 yok |

- Holding okuma → 0; holding/coil/discrete **yazma kabul edilmez** (no-op).

---

## 6. Notlar

- Bit eşlemeleri hedef register'ın **MIRROR'ı** üzerinde çalışır: hedef kelimenin diğer
  bitleri bozulmaz, bilinmeyen bitler 0'dır.
- Ters kanal okuması `TcpPcsPowerReader` ile gerçek Modbus TCP'dir (S16 = 0x2f7e);
  erişilemeyen PCS katkısı 0'dır (kademeli bozulma).
- Testler: `bsc-pcs-connector/connector.test.ts`, `source-reader.test.ts`,
  `tcp-target.test.ts`, `pcs-power-reader.test.ts`.
