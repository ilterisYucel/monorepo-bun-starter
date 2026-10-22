# Şebeke Yolu Bus'ı (Grid Link)

> Rol: MV şalter pozisyonlarını tutan **in-process** paylaşımlı durum. Simülatör
> değildir, Modbus yüzeyi yoktur; aynı device-service süreci içinde MV simülatörü
> yayınlar, PCS simülatörleri sorgular.
> Kod: `grid-link/bus.ts#GridLinkBus` (+ `IGridLink`).
> SPEC: SEBEKE-YOLU-ESLESMESI K1/K3; gdems `computeEnergization` semantiği.

---

## 1. Neden var?

Gerçek sahada PCS'in AC tarafı, OG köşkteki enerji zincirine bağlıdır:

```
POI H01 ─── fider kesici (H04 / H05) ─── RMU H02 ─── PCS
```

Zincirdeki herhangi bir hücre açıksa PCS **de-enerjilidir**: standby'a düşer,
güç/akım/gerilim sıfırlanır. Simülatörler bu fiziksel bağı ayrı bir süreç/Modbus
yüzeyiyle değil, aynı süreçteki bir bus ile modeller — MV ve PCS sınıfları
birbirine bağımlı olmaz (PCS yalnız `IGridLink` arayüzünü bilir).

---

## 2. Sözleşme

```ts
// grid-link/bus.ts#IGridLink
interface IGridLink {
  /** Fiderin enerjili olup olmadığı (H01 ∧ fider ∧ H02). */
  isEnergized(feeder: string): boolean;
}
```

`grid-link/bus.ts#GridLinkBus`:

- `setBreaker(cell, closed)` — **komut**; bilinmeyen hücre adı kabul edilir
  (config'ten gelen isim serbesttir).
- `isEnergized(feeder)` — **sorgu**: `H01` kapalı ∧ `feeder` kapalı ∧ `H02` kapalı.
- Hiç yayın gelmemiş hücre **kapalı varsayılır** (başlangıç: tüm kesiciler kapalı).

---

## 3. Host entegrasyonu

- `host.ts#createGridLinks` — her `demo-mv-station` config'i için bir `GridLinkBus`
  kurar (`deviceId` → bus). Demo'da ayrı bus'lar: **DEMO-MV-1**, **DEMO-MV-2**.
- MV simülatörü her coil yazımından sonra `publish()` ile güncel kesici
  pozisyonlarını bus'a yazar (`demo-mv-station/demo-mv-simulator.ts#DemoMvStationSimulator.publish`).
- PCS simülatörü `details.gridLink: { deviceId, feeder }` alanından bus'ı ve fideri
  çözer (`ctx.gridLink` / `ctx.gridFeeder`); `gridLink` yoksa PCS **enerjili**
  varsayılır (geriye uyum).

---

## 4. PCS etkisi (de-enerjize semantiği)

`wattox-pcs/simulator.ts#WattoxPcsSimulator.syncGridState` her tick'te çalışır:

- Zincir kopuksa: `opStatus = OP_STANDBY` (fault değilse), aktif güç / DC güç /
  DC akım / PF = 0.
- Yeniden enerjide güç **otomatik uygulanmaz** — operatörün setpoint'i yeniden
  göndermesi gerekir (gerçek cihaz davranışı).
- Fault durumu (`OP_FAULT`) şebeke kontrolünden önce gelir.

---

## 5. Demo eşlemesi

| PCS | `details.gridLink.deviceId` | `feeder` | Bus |
| :--- | :--- | :--- | :--- |
| PCS-1 | DEMO-MV-1 | H04 | MV-1 |
| PCS-2 | DEMO-MV-1 | H05 | MV-1 |
| PCS-3 | DEMO-MV-2 | H04 | MV-2 |
| PCS-4 | DEMO-MV-2 | H05 | MV-2 |

Kesici/toprak koşulları ve interlock'lar için [DEMO-MV-STATION.md](DEMO-MV-STATION.md);
PCS tarafı için [WATTOX-PCS.md](WATTOX-PCS.md).

---

## 6. Testler

- `grid-link/bus.test.ts` — kapalı/açık hücre, varsayılan "kapalı", bilinmeyen hücre.
- `grid-link/pcs-deenergized.test.ts` — zincir kopukken PCS standby/0 güç, yeniden
  enerjide otomatik güç uygulanmaması.
