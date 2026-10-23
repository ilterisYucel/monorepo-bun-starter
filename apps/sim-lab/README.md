# Sim-Lab — GD-PMS saha simülatörü

Config'ten bir BESS sahası üretir ve **her cihazı ayrı bir Modbus TCP sunucusu** olarak
çalıştırır. EMS/PMS bu sunuculara gerçek cihazlara bağlanır gibi bağlanır; arayüzden
register'lar tek / seçili / tüm cihazlarda değiştirilir, zaman damgalı seriler oynatılır,
arızalar ve senaryolar çalıştırılır.

Model ve mimari: [docs/simulators/FIZIKSEL-SAHA-SIMULATORU.md](../../docs/simulators/FIZIKSEL-SAHA-SIMULATORU.md) ·
Config ↔ vendor denetimi: [docs/simulators/VENDOR-UYUM-DENETIMI.md](../../docs/simulators/VENDOR-UYUM-DENETIMI.md)

## Hızlı başlangıç

```bash
bun install
bun run apps/sim-lab/src/main.ts --site apps/sim-lab/sites/gd1.site.json   # GD-1: 226 sunucu
# arayüz: http://localhost:8090
bun run apps/sim-lab/src/main.ts --site apps/sim-lab/sites/tek-konteyner.site.json   # hızlı deneme
```

| Bayrak | Anlamı |
| :--- | :--- |
| `--site <dosya>` | saha tanımı (varsayılan `sites/gd1.site.json`) |
| `--profile uyumlu\|gercek` | gerçeklik profili (FC/adres katılığı, heartbeat denetimi, saha zamanlamaları) |
| `--speed <n>` | simülasyon hız çarpanı (GD-1'de ~60× üstü CPU sınırına yaklaşır) |
| `--http <port>` · `--bind <ip>` · `--ems-host <host>` | arayüz portu · Modbus dinleme arayüzü · export'ta EMS'in kullanacağı adres |
| `--export` | açılışta EMS config'lerini de üret |

> Not: `nx run-many --target=dev` (kök `bun run dev`) Sim-Lab'ı **başlatmaz**; bilerek `dev`
> hedefi tanımlanmadı. `nx run sim-lab:start` kullanın.

## Docker

Hazır compose: [`deployment/v2/dev/simulator-app/`](../../deployment/v2/dev/simulator-app/README.md)
(imaj: `apps/sim-lab/deployment/Dockerfile`).

## Saha dosyası

`sites/gd1.site.json`: 9 konteyner × (2 BSC × 8 raf, 8 HVAC, 2 DC şalter, DC metre, 2 DC çıkış,
PM5340, IMD, FSS, kontrol paneli IO), 18 Wattox PCS (BSC başına 1), OG köşk `DEMO-MV-1`
(H04 → BESS#1–5, H05 → BESS#6–9). Register listeleri kök `configs/`'ten gelir; site dosyası
yalnız şekli ve port şemasını belirler. Port şeması ve tüm alanlar: model dokümanı §3.

## EMS'i bağlama

```bash
bun run apps/sim-lab/src/tools/export-ems-config.ts --site apps/sim-lab/sites/gd1.site.json
# → deployment/simlab/gd-1/ (container-1..9, field, topology.json, compose overlay'leri, README)
docker compose --env-file deployment/v2/dev/field/.env -f deployment/v2/dev/field/docker-compose.yml \
  -f deployment/simlab/gd-1/field/docker-compose.simlab.yml up -d --build
docker compose --env-file deployment/v2/dev/container/.env -f deployment/v2/dev/container/docker-compose.yml \
  -f deployment/simlab/gd-1/container-1/docker-compose.simlab.yml up -d --build
```

Arayüzde **EMS bağlantısı** sekmesindeki düğme de aynı export'u yapar. Bağlanan EMS'i
"EMS" sayaçlarından (üst şerit, konteyner kartları, Cihazlar tablosu) ve **Olaylar & trafik**
sekmesindeki Modbus istek kaydından izleyin.

## Arayüz

| Sekme | İçerik |
| :--- | :--- |
| Saha | OG köşk hücreleri, fider gruplarına göre konteyner kartları (BSC durum/SOC/online raf, PCS durum/güç, 8 klima zon sıcaklığı, IMD/kapı/haberleşme rozetleri). Karta tıklayınca cihaz penceresi açılır |
| Cihazlar | konteyner → cihaz ağacı (çoklu seçim), 226 sunucunun haberleşme tablosu |
| Cihaz penceresi | sürüklenebilir, aynı anda birden çok: **Register** (EMS config'indeki tüm noktalar; ham kelime + mühendislik değeri; ✎ ile `write`/`hold`, süreli), **Model** (BSC raf tablosu + teşhisler, PCS durum/sıcaklık/fault bitleri/BMS bloğu, HVAC kontrol), **Trafik**, **Arıza** |
| Toplu işlem | seçici (`C*.HVAC-*`, `type:wattox-pcs`, `container:4`, ağaçta seçili…) + register + değer + mod → cihaz başına sonuç; toplu haberleşme arızası; toplu arıza enjeksiyonu; aktif üstyazımlar |
| Zaman serisi | CSV (`t,target,register,value,mode`; t = s / HH:MM:SS / ISO), sim/duvar saati, basamak/doğrusal, döngü; rampa/basamak/sinüs/rastgele üreteci |
| Arızalar / Senaryolar | ~60 arıza (raf, BSC, PCS, HVAC, haberleşme, şebeke, OG, FSS…) ve 10 hazır senaryo + kabul kontrolleri |
| EMS bağlantısı | export, EMS yardımcısı (heartbeat / klima sıcaklık yazımı — varsayılan kapalı), otomatik devreye alma, uyumluluk uyarıları |

## Doğrulama

```bash
cd packages/simulators && npx vitest run src/physical        # fizik + register + EMS okuma yolu testleri
bun run apps/sim-lab/src/tools/smoke-test.ts                 # GD-1 uçtan uca (226 sunucu + EMS komut zinciri)
bun run apps/sim-lab/src/tools/smoke-test.ts --profile gercek --site apps/sim-lab/sites/tek-konteyner.site.json
bun run apps/sim-lab/src/tools/ems-probe.ts --site apps/sim-lab/sites/gd1.site.json --only "C1.*,PCS-1,PCS-2" --commands
```

`ems-probe` çalışan bir Sim-Lab'a device-service'in okuma sınıfıyla (`@gd-monorepo/core`
`ModbusDevice`) bağlanır: config'teki her telemetriyi okur, sentinel (veri yok) düşen
noktaları listeler, `--commands` ile config `commands` bölümünü EMS gibi yazıp `validate`
koşullarını bekler.

## REST API (özet)

`GET /api/meta · /api/state · /api/stream (SSE) · /api/device/:key[/registers|/catalog] · /api/select?q= · /api/overrides · /api/traffic · /api/compat`
`POST /api/point {selector, point, value, mode, durationS} · /api/release · /api/series/start|stop|parse · /api/fault · /api/comm · /api/scenario/start|stop|save · /api/sim · /api/autostart · /api/export`
