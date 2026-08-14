# Konteyner-Field Mimari Değerlendirmesi

Tarih: 2026-08-13
Kapsam: Container-level (RevPi) ve Field-level uygulama katmanları, servisler, compose stack'leri.

## Hedef Mimari

1. **Container-level app**: BESS konteynerindeki RevPi üzerinde kendi TimescaleDB + Redis'i ile data, device, web, management servisleri ve Electron (LCD panel) uygulaması.
2. **Field-level app**: Saha merkezindeki bilgisayarda kendi TimescaleDB + Redis'i ile data, device, web, management servisleri ve web uygulaması.
3. Container app'ler yalnızca lokal ağdan erişilebilir; field app dışarıdan da erişilebilir. Yetkili kullanıcılar field'ın device servisi üzerinden PCS'ler ile container'ları yönetebilir, verilerine erişip durumlarını izleyebilir.
4. **PPC durumu**: Container app ile field app arasındaki bağlantıyı gösterir; bağlıysa `true`.

## PCS Modeli (2026-08-13 düzeltmesi)

- **Her konteynerin kendi PCS'i vardır** — sahada tek PCS yoktur. N konteyner = N PCS.
- PCS'ler **field-level app'in device-service'i** tarafından poll edilir (site ağı üzerinden, Modbus).
- Komut yolu: **Field UI → field web-service → BullMQ → field device-service → Modbus → PCS → konteyner**. PCS'e `charge` komutu verilir; PCS konteyneri şarj/deşarj durumuna getirir. Konteyner içindeki BSC'ye doğrudan charge/discharge **gönderilmez**.
- Konteyner içi cihazlar (BSC, HVAC, CB, DC-Output) **container-level device-service** tarafından poll edilir — field ile karıştırılmamalıdır.
- Sonuç: PCS komutları container→field WS kanalından geçmez. Container→field WS yalnızca telemetri + PPC durumu taşır.

## Bağlantı Modeli: NAT, Outbound vs Inbound, PCS Eşleştirme

### NAT nedir?

Network Address Translation. Saha/konteyner ağları özel IP bloğu kullanır (192.168.x, 10.x). Bu cihazlar internete çıkarken modem/switch NAT yapar: her cihazın iç IP'sini tek bir dış IP'ye çevirir, cevapları doğru cihaza geri yönlendirir.

Kritik sonuç: **dışarıdan içeriye bağlantı kurulamaz** (port yönlendirme yapmadıkça), **içeriden dışarıya bağlantı serbesttir**. RevPi saha ağındaysa merkezdeki field bilgisayarı konteynerin IP'sine ulaşamaz — ama konteyner field'a ulaşabilir.

### Outbound (container→field) vs Inbound (field→container IP)

| Kriter | Container bağlantıyı başlatır | Field konteyner IP'sine istek atar |
|---|---|---|
| NAT/firewall | Çalışır — konteynerde port açmak/yönlendirme gerekmez | Her konteynerde port yönlendirme gerekir → saldırı yüzeyi N kat |
| IP değişimi (DHCP) | Sorun değil — konteyner IP'si hiç bilinmez | IP değişince kopar; field'da tüm IP'leri güncel tutmak gerekir |
| Güvenlik | Tek giriş noktası (field WS portu) — auth/rate-limit tek yerde | Field'ın her konteynere girebilmesi için her cihazda kural → yönetim yükü |
| Kopma algısı | Anlık: WS kapanır = PPC false | Field sürekli retry/timeout tarar — geç algılar |
| Yeni konteyner ekleme | Konteynerde field URL ayarla, bitti | Field DB'sine IP + firewall kuralı ekle |
| Komut/push | Field push edemez → duplex WS veya long-poll gerekir | Field istediği an HTTP ile komut/geçmiş sorgusu atabilir |

**Verdict:** Konteynerlerin outbound bağlanması endüstriyel standarttır (MQTT broker, IIoT gateway'leri: edge dışa bağlanır, merkez dinler). PCS modeli bunu kolaylaştırır: PCS komutları field device-service → Modbus → PCS üzerinden gider, WS'ten geçmez. WS'nin tek yönlü (telemetri + PPC) kalması yeterlidir — duplex'e acil ihtiyaç yoktur.

### Outbound bağlantıda PCS eşleştirme ve ekran gösterimi

**Eşleştirme (3 katman):**

1. **Register**: Konteyner field'a bağlanınca kendini tanıtır: `{type:"register", containerId:"container-1", containerUrl:...}` — `container-ws-routes.ts` bunu `ContainerProxy.registerContainer()`'a verir.
2. **Field kayıt defteri**: Field DB'sinde `field_containers` tablosu var (`field_id, container_id, container_url, layout`). Ek olarak **PCS eşleme tablosu** gerekir: `pcs_id → container_id` (kurulumda bir kez kaydedilir: "PCS-1, container-1'i kontrol ediyor"). Register'daki `containerId` bu eşlemeden `pcs_id`'yi çözer.
3. **Kimlik doğrulama**: Her konteynere kurulumda verilen API key/servis token'ı register mesajında gider; field doğrular (bugün yok, kritik).

**PPC = WS durumu.** `ContainerProxy.connectionStatus()` container başına `connected/idle/error` tutar; WS kopunca `close` event'i ile anında güncellenir.

**Ekran akışı:**

```
field UI (ContainersPage)
  → GET /fields/:id/containers        (field-routes.ts)
  → her container için: connectionStatus (PPC) + latestTelemetry + PCS bilgisi
  → ContainerCard `connected` prop'u → PPC badge
```

Bugün mock'tan gelen `connected` alanı, gerçekte bu endpoint'in `connectionStatus` alanından gelecek — aynı prop, aynı bileşenler, sadece veri kaynağı değişir.

**Eksik parçalar:**

- FieldConnector istemcisi (container tarafı): outbound WS + register + reconnect/backoff + PPC durumunu kendi UI'ına sunma.
- Register auth (servis token'ı).
- `pcs_id → container_id` eşleme tablosu + endpoint.
- Heartbeat/last_seen: WS kopuklukta "yarı ölü" bağlantıları ayırt etme (`ContainerProxy` sweep'i var ama last_seen bazlı stale işaretleme yok).
- Field DB'ye hafif aggregate yazımı (onaylanan proxy + hafif aggregate stratejisi).

## Verdict

Mimari yön doğru ve endüstriyel kalıplarla uyumlu (ISA-95 edge autonomy, outbound-only gateway, supervision tier'ları). Ancak uygulama durumu tamamlanmış değil — PPC bağlantısını ve field'dan yönetimi bloklayan kritik boşluklar var.

İlgili: [DEVICE-SERVICE-TRANSPORT-MIMARISI.md](./DEVICE-SERVICE-TRANSPORT-MIMARISI.md) — device-service taşıma katmanı (Strategy + Adapter, `transport.kind` config modeli, simülatör altyapısı).

## Bloklayıcı Eksiklikler

| # | Eksiklik | Konum | Etki |
|---|----------|-------|------|
| 1 | Container→Field WS istemcisi yok. Field'da `/ws/container` + `ContainerProxy` var ama `register` mesajı gönderen hiçbir container tarafı kod yok | `web-service/src/infrastructure/container-proxy/*` | PPC asla `true` olamaz |
| 2 | PPC göstergesi container UI'ında beslenmiyor (prop default `false`) | `container-web/src/layouts/MainLayout.tsx:69` | Gereksinim 4 bloklu |
| 3 | Field stack'te device-service ve data-service yok | `deployment/docker-compose.field.yml` | Field'dan PCS polling/komut imkansız |
| 4 | Field komut yolu arka uçta yok: manevra adımları mock'ta dolu (`PCS-N` hedefli) ama field'da device-service/BullMQ consumer olmadığı için gerçek komut yürütülemez | `apps/field/src/features/field-control/maneuvers.ts` | Gereksinim 3 uygulanmamış |
| 5 | Field UI'ı mock veride çalışıyor | `apps/field/src/features/**/hooks/*` | Gerçek API'ya bağlı değil |
| 6 | Management servisi yok; kullanıcı yönetimi web-service içinde | `web-service/src/presentation/routes/auth-routes.ts` | Karar bekliyor |

## Mantık / Tasarım Hataları

7. **Service-to-service auth yok.** `/ws/container` doğrulamasız; `ContainerProxy.historical()` JWT'siz HTTP. Dışarıya açık field'a sahte container kaydı mümkün.
8. **Field→Container komut kanalı tanımsız.** PCS komutları WS'ten geçmez (field device-service → Modbus). Ancak container içi cihazlara field'dan komut gerekecekse duplex WS/long-poll açık karar olarak duruyor.
9. **Redis kalıcılığı kapalı** (`--save "" --appendonly no`, `allkeys-lru` 64MB). Güç kesintisi = kayıp BullMQ job (komut/telemetri); `allkeys-lru` bellek baskısında pending job evict eder.
10. **RevPi kaynak profiliyle uyumsuz prod ayarları**: `shared_buffers=4GB`, `effective_cache_size=12GB` (`docker-compose.container.yml`).
11. **Sırlar sabit**: `JWT_SECRET` compose içinde; seed kullanıcılar `admin/admin123` kodda (`web-service/src/config/default.ts`).
12. **Image pinleme yok** (`timescale/timescaledb:latest-pg14`).
13. **PPC semantiği belirsiz**: field header'da agrega (`onlineContainers > 0`), container'da beslenmiyor. Per-container mı global mı netleşmeli. Not: enerji endüstrisinde "PPC" = Power Plant Controller; adlandırma çakışması riski.
14. **Field veri stratejisi tanımsız**: `ContainerProxy` sadece `latest` RAM'de tutar; field Timescale'ine hiçbir şey yazılmaz.
15. **NTP/zaman senkronizasyonu yok** — dağıtık zaman serisi ve `last_seen` mantığı için gerekli.

## Mimari Kararlar

| Konu | Durum |
|------|-------|
| Field veri stratejisi | **Karar verildi**: Proxy + hafif aggregate. Canlı telemetri RAM'de, geçmiş veri istek üzerine container'dan; field DB'ye yalnızca alan bazlı aggregate/summary yazılır. |
| Field→Container komut kanalı | **Daraltıldı**: PCS komutları field device-service → Modbus → PCS üzerinden gider (WS gerekmez). Container→field WS yalnızca telemetri + PPC. Container içi cihazlara field'dan komut gerekecekse duplex WS yine değerlendirilecek (evdeki PC). |
| Management ayrı servis mi | **Açık karar**. Şu an web-service içinde. |

## Güçlü Yönler

- Container otonomisi: field bağlantısı kopunca container tam çalışmaya devam eder (edge autonomy).
- Outbound-only container→field bağlantı yönü (NAT arkası uyumlu).
- Tek web-service + `SERVICE_TIER` (container/field/boss) ile tier ayrımı.
- RBAC (`admin/boss/guest` + `fieldIds`), maneuver sistemi, Timescale chunk/compress/retention, Electron crash handler'ları.

## Yol Haritası

1. **FieldConnector** (container tarafı): field'a outbound WS + `register {containerId, containerUrl}`, reconnect + backoff, PPC durumunu UI'a sunar. Duplex komut protokolü.
2. Service-to-service auth (API key / servis tokeni; `/ws/container` ve historical fetch doğrulaması).
3. Field'a device-service + data-service eklenmesi (PCS tanımı `device-library`'de hazır).
4. Redis AOF + `noeviction`.
5. Field UI'ın mock'tan gerçek API'a bağlanması.
6. Sırların ortamdan çıkarılması, seed kullanıcıların üretimde zorunlu değişimi.
7. RevPi profiline göre PG ayarları, image pinleme, NTP, SD-card wear (log rotasyonu).

## Bugün Yapılan Field Ön Yüz Değişiklikleri

- `FieldControlPage`: placeholder → ManeuverPanel deseninde grid, mock çalıştırma simülasyonu. Manevra adımları PCS cihazlarını hedefler (`PCS-N charge/discharge/stop`); PPC kopuk konteynerin PCS'i başarısız döner.
- Container başına PPC durumu göstergesi (mock `connected` alanı, mevcut `ContainerCard`/`ContainerConnectionBadge` üzerinden).
- `FieldDevicesPage`: field device-service cihaz listesi — container başına bir PCS satırı (`PCS-1 → Konteyner 1`, ...), status bağlı konteynerden türetilir + seçili PCS için telemetri özet kartı (Aktif Güç, Verim, DC-Link, AC Voltaj).
- `FieldDashboardPage`: Saha Enerji Akışı topoloji şeridi (Şebeke ⟷ PCS'ler ⟷ Konteynerler, PPC işaretli), şarj/deşarj gücü + PCS + PPC stat kutuları, container kartlarına SOC sparkline.
- `ContainerDetailPage`: hardcoded veri yerine mock jeneratör; yeni PCS telemetri kartı + son görülme + şarj durumu etiketi.
- `FieldChartsPage`: Tabs — Saha Toplam Güç / Saha Ort. SoC / Konteyner Bazlı grafikler.
- `SystemHeader`: PCS online/total göstergesi.
- Mock veriye PCS telemetrisi (`mockPcs`/`mockPcsList`), saha aggregate serisi (`mockFieldAggregate`) ve PCS/manevra logları eklendi.

Not: `packages/ui/ContainerCard` içindeki sabit `"PPC: Bağlı"` label'ı container tarafı değişiklikleriyle birlikte düzeltilecek (merge conflict riski).
