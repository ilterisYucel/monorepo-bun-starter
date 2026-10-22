# BSC → PCS Connector (Konnektör)

> ⚠️ Bu bir **simülatör değil**, bir **köprü (adapter)**dır. BSC register'larını okuyup
> PCS'nin BMS bloğuna yazan sanal bir "gateway" cihazıdır.
> Kod: `bsc-pcs-connector/connector.ts#BscPcsConnectorAdapter`,
> mapping: `bsc-pcs-connector/mapping.ts`, kaynak okuyucu: `bsc-pcs-connector/source-reader.ts`,
> hedef: `bsc-pcs-connector/tcp-target.ts`.
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
- `host.ts#SimulatorHost.plan`, `connector.sim` tanımlı BSC config'lerinden bu adapter'ı örnekler.

---

## 2. `tick(elapsedSeconds)` — BSC → PCS aktarımı

`bsc-pcs-connector/connector.ts#BscPcsConnectorAdapter.tick`:

1. **Kaynak okuma + ayna güncelleme (kademeli bozulma):**
   - `constant` eşleme → sabit değer aynaya yazılır.
   - `register` eşleme → `raw × ratio + offset` (yuvarlanır) aynaya yazılır.
   - `bit` eşleme → kaynak bit hedef register'ın ilgili bitine yansıtılır (diğer bitler korunur).
   - Bir eşleme okunamazsa sayaç artar, **diğer eşlemeler devam eder**.
   - `sourceStatus`: 0 = ok, 1 = kısmi, 2 = kaynak yok.
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
  "mappings": [ ... ]
}
```

- **`register`:** `raw_pcs = round(raw_bsc × ratio + offset)` — hedef `to` adresi **BMS
  bloğunda** olmalı (`BMS_BASE`…`BMS_BASE+BMS_SIZE`).
- **`bit`:** kaynak register'ın N. biti → hedef register'ın M. biti.
- **`constant`:** sabit değer (ör. anma enerji).
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

- Holding okuma → 0; holding/coil/discrete **yazma kabul edilmez** (no-op).

---

## 6. Notlar

- Bit eşlemeleri hedef register'ın **MIRROR'ı** üzerinde çalışır: hedef kelimenin diğer
  bitleri bozulmaz, bilinmeyen bitler 0'dır.
- Testler: `bsc-pcs-connector/connector.test.ts`, `source-reader.test.ts`, `tcp-target.test.ts`.
