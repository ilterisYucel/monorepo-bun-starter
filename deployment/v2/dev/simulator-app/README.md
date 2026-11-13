# simulator-app — Sim-Lab saha simülatörü (docker)

Tek konteyner, üç parça:

| Parça | Ne yapar |
| :--- | :--- |
| Simülatörler | Site dosyasındaki her cihaz (BSC, konnektör, HVAC, DC şalter/metre/çıkış, PM5340, IMD, FSS, kontrol paneli IO, Wattox PCS EMS + BMS yüzü, OG köşk) ayrı bir **Modbus TCP sunucusu** |
| Backend | `apps/sim-lab/src/http/api.ts` — REST + SSE (`/api/state`, `/api/point`, `/api/series/*`, `/api/fault`, `/api/scenario/*`, `/api/export` …) |
| Ön yüz | `apps/sim-lab/public/index.html` — backend aynı porttan (8090) sunar |

## Çalıştırma (repo kökünden)

```bash
cp deployment/v2/dev/simulator-app/.env.example deployment/v2/dev/simulator-app/.env
docker compose --env-file deployment/v2/dev/simulator-app/.env \
  -f deployment/v2/dev/simulator-app/docker-compose.yml up -d --build
# arayüz: http://localhost:8090
docker compose --env-file deployment/v2/dev/simulator-app/.env \
  -f deployment/v2/dev/simulator-app/docker-compose.yml logs -f sim-lab
```

`.env` ile: `SIM_SITE_FILE` (demo-v2 / gd1 / tek-konteyner), `SIM_PROFILE` (uyumlu / gercek),
`SIM_SPEED`, `SIM_EMS_HOST`, `SIM_HTTP_PORT`.

> **Host portları varsayılan olarak KAPALIDIR.** v2 stack'leri `gd-simnet` ağı üzerinden
> `sim-lab:<port>`'a bağlanır. Host'tan hata ayıklama ve entegrasyon testleri için:
>
> ```bash
> docker compose --env-file deployment/v2/dev/simulator-app/.env \
>   -f deployment/v2/dev/simulator-app/docker-compose.yml \
>   -f deployment/v2/dev/simulator-app/docker-compose.host-ports.yml up -d
> ```
>
> Override, yeni port aralıklarına ek olarak testlerin kullandığı eski alias'ları da yayınlar
> (`1502→30001`, `15501→20001`, `15504→20051`, `15511→20011`, `15536→20052`,
> `15540→30201`, `5030→20041`). `bun run start:demo-integration` bu override'ı içerir.

## Klasör

| Yol | İçerik |
| :--- | :--- |
| `sites/` | Saha tanımları (konteyner/BSC/HVAC/PCS sayısı, OG fiderleri, port şeması). Yeni saha = yeni dosya + `.env`'de `SIM_SITE_FILE` |
| `device-configs/` | Register şablonları — kök `configs/`'ten **kopya** (AGENTS-DEPLOYMENT kural 4). Kök değişince yeniden kopyalayın |
| `scenarios/` | Arayüzden kaydedilen senaryolar (kalıcı) |

## Portlar

> Aşağıdaki portlar **konteyner ağı içinde** (`gd-simnet`) açıktır; host'a yayın için
> `docker-compose.host-ports.yml` override'ı gerekir.

| Aralık | Cihazlar |
| :--- | :--- |
| `8090` | arayüz + REST (tek host yayını) |
| `20000+(N-1)×100 + 1…54` | konteyner N: 1–2 BSC, 6–7 konnektör, 11–18 HVAC, 31–32 DC şalter, 41 DC metre, 42–43 DC çıkış, 51 PM5340, 52 IMD, 53 FSS, 54 kontrol paneli IO |
| `30001–30018` | PCS-n (EMS yüzü) |
| `30101–30118` | PCS-n (BMS yüzü) |
| `30201` | OG köşk `DEMO-MV-1` |

Compose GD-1 (9 konteyner) için yayın yapar; daha büyük bir saha tanımlarsanız `ports`
listesine konteyner aralıklarını ekleyin.

## EMS'i bağlama

v2 stack'leri (container, container2, site) bu compose'un yarattığı `gd-simnet` ağına
`external` olarak katılır; device-config'leri zaten `sim-lab:<port>` hedeflidir.
`bun run start:demo-integration` sırası: sim-lab → container → container2 → site
(`stop:demo-integration` ters sıra).

Alternatif saha (GD-1) için: arayüz → **EMS bağlantısı → Export** (veya `POST /api/export`),
ardından üretilen `deployment/simlab/<saha>/` overlay'lerini kullanın. Bağlantıyı arayüzdeki
EMS sayaçları ve **Olaylar & trafik** sekmesinden izleyin.
