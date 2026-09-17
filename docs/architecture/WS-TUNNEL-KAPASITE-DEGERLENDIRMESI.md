# ws-tunnel Kapasite Değerlendirmesi — Operasyon Trafiği İçin Yeterlilik (SPEC)

> Soru: "Soket tünel, her sistemi birbirine bağlamak için generic olarak yeterli mi?
> Herhangi 2 servisi mi bağlar yoksa yalnızca web-servisleri mi?"
> İlişkili dökümanlar: `KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md` (§4.2, §5.x, §12.3),
> `WS-TUNNEL-URUN-TESCILI.md`, `BOSS-UYGULAMA-MIMARISI.md` §7.4,
> `KOMUT-MANEVRA-OPERASYON-MIMARISI.md`.
>
> **Durum: GÖZDEN GEÇİRME BEKLİYOR** — onay alınmadan geliştirme başlamaz.

## İçindekiler

1. Sonuç (Özet)
2. Bugün Ne Bağlar?
3. Best Practice Araştırması
4. Karşılaştırma ve Gerekçeler
5. Operasyon Trafiği Tünelde Nasıl Akar?
6. Yeni Mesaj Şemaları
7. Açık Kararlar (YAGNI)
8. Limitler ve Sözleşmeler
9. Kabul Kriterleri

---

## 1. Sonuç (Özet)

**ws-tunnel çekirdeği DEĞİŞTİRİLMEZ.** Operasyon/komut trafiği için pakete yeni stream
tipi, yönlendirme tablosu veya duplex sink EKLEMEYE GEREK YOKTUR.

- Çapraz sistem komut/operasyon dağıtımı, tünelin **kontrol kanalı** (text frame —
  serbest JSON) ve mevcut **programatik HTTP stream** mekanizması üzerinden taşınır.
- Tünel sistem SINIRINDA çalışır (best practice: uç trafiği için reverse-tunnel;
  sistem içi için veri yolu). Sistem içi servisler arasında tünel KULLANILMAZ —
  BullMQ/Redis zaten vardır.
- Tek eklenen: iki yeni kontrol mesaj tipi (`operation-execute`, `operation-result`) ve
  bunların responder'ı (§5-6) — `telemetry-query` pattern'inin birebir kopyası.

## 2. Bugün Ne Bağlar?

Tünel iki katmana ayrılır (`packages/ws-tunnel/src/`):

| Katman | İçerik | Generic mi? |
|:---|:---|:---|
| **Binary stream katmanı** | `FrameCodec` (9 bayt başlık, opak payload), `TunnelClient` (client tarafı stream multiplex), `TunnelProxy` (hub tarafı reverse proxy), `SessionGateway`/`HubSessionStore` | ⚠️ Payload opaktır AMA `StreamOpenMessage` yalnızca `method/path/headers/upgrade` taşır (`protocol/messages.ts:271-279`); stream'ler uçtan uca **HTTP/WS şekillidir**. Hub açar, client yerel `fetch()` ile yanıtlar (`tunnel-client.ts:247-310`). |
| **Kontrol kanalı** | `TunnelConnector`/`ITunnelChannel`/`IHubChannel` üzerinden serbest JSON text frame'leri; bilinmeyen tipler subscriber'lara iletilir (`tunnel-connector.ts:304-307`). | ✅ **Tamamen generic** — çift yönlü, per-peer adresleme (`IHubChannel.sendControl(peerId, msg)`). |

**"Herhangi 2 servis bağlanır mı?" sorusunun yanıtı:** Bugün yalnızca **web-service
çiftleri** bağlanır (hub web-service ↔ client web-service; client tarafı yerel HTTP/WS
komşularına köprü kurar). device-service/data-service/integration-service tünele
BAĞLANMAZ ve bağlanması da GEREKMEZ — bu servislere erişim, sistem içinde BullMQ ile
zaten sağlanır (komut akışı: `web-service → COMMAND_DEVICE job → device-service`).
Tünelin işi sistemler arası uçtur; sistem içi taşıma katmanını ÇİFTLEMEZ.

Kontrol kanalında bugün akan backend-to-backend trafik (kanıt — desen hazır):

- `telemetry-query` → `telemetry-result`/`telemetry-query-error` (request/response,
  `queryId` korelasyonu) — `services/web-service/src/infrastructure/field-connector/telemetry-query-responder.ts:46-94`.
- `event` frame'leri (alarm/audit olayları field→boss) — `UplinkEventRelay`,
  `protocol/messages.ts:175-184`.
- Field→konteyner komut: programatik oturum + `POST /api/commands/execute-multi` HTTP
  stream'i (`presentation/routes/field-container-commands.ts:128-174`) — komut dağıtımı
  için çalışan, testli bir kanal ZATEN VAR.

## 3. Best Practice Araştırması

### 3.1 Reverse tunnel / NAT traversal (ngrok, Cloudflare Tunnel, Chisel, frp, Bore)

Standart çözüm: erişilemeyen (NAT arkası) taraf **tek outbound bağlantı** açar; tüm
trafik o bağlantıdan çoklanır. Bizim `TunnelConnector` tam olarak bu desendir ve
`KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md` R4/R5 kararlarının sonucudur (konteyner inbound
TCP/HTTP almaz; field konteynere BAĞLANMAZ, konteyner field'a bağlanır). Yaygın
uygulamalar HTTP odaklıdır; bizim farkımız ek olarak generic kontrol kanalı taşımamız —
bu bir avantajdır, değişiklik gerektirmez.

### 3.2 Service mesh (Linkerd, Istio, Consul Connect)

- Kapsam: BİR küme içi servis-servis mTLS/gözlenebilirlik/politika. Çapraz-site
  (NAT arkası, outbound-only ağlar) için tasarlanmamıştır.
- Bizim sistem içi ihtiyaç zaten BullMQ/Redis ile karşılanıyor; mesh eklemek
  yeni kontrol düzlemi + sertifika yönetimi demek — **gereksiz**.

### 3.3 Çapraz-site veri yolu (NATS leaf nodes, MQTT bridge, AMQP federation)

- Kullanım nedeni: yüksek hacimli, düşük gecikmeli, çok aboneli mesaj trafiği.
- Bizim operasyon trafiğimiz: DÜŞÜK hacimli, request/response şekilli, tek hedefli
  (orkestratör → hedef sistem) — veri yolu eklemek, iki sistem arasında üçüncü bir
  taşıma protokolü işletmek demektir. Mevcut tünel kontrol kanalı aynı işi
  ek altyapısız görür.

### 3.4 Pub/sub (sonuçların "tüm sistemlere iletilmesi" için gerekli mi?)

- Gerekmez. "Tüm sistemlere iletim" iki yolla karşılanır:
  (1) isteyen taraf doğrudan sonucu alır (HTTP yanıtı / `operation-result`),
  (2) gözlemlenebilirlik için operasyon audit olayları mevcut `event` frame
  mekanizmasıyla üst sisteme akar (field→boss — `UplinkEventRelay` deseni).
- Topic aboneliği + kalıcı kuyruk + replay gerektiren bir ihtiyaç BELİRMEDİ;
  belirirse de bu tünelin değil, sistem içi veri yolunun (Redis pub/sub) konusudur.

## 4. Karşılaştırma ve Gerekçeler

| Seçenek | Maliyet | Sonuç |
|:---|:---|:---|
| Mevcut tünel (kontrol kanalı + HTTP stream) | 2 yeni mesaj tipi + responder | ✅ SEÇİLEN |
| Tünele generic binary `streamType` + client tarafı handler kaydı | Codec/`TunnelClient`/`TunnelProxy` protokol değişikliği, iki deployment'ın regresyon riski | ❌ Gereksiz — komutlar JSON payload'dır; binary stream ihtiyacı yok (§7) |
| Client-initiated stream desteği | Protokol değişikliği | ❌ Gereksiz — orkestratör her zaman yönlendirici tarafta; kontrol kanalı çift yönlü |
| Çapraz-site veri yolu (NATS/MQTT) | Yeni altyapı, yeni güvenlik yüzeyi | ❌ Gereksiz (§3.3) |
| Service mesh | Küme içi çözüm; sorunumuzu çözmez | ❌ Gereksiz (§3.2) |

## 5. Operasyon Trafiği Tünelde Nasıl Akar?

Üç topoloji, üç kanal — hepsi MEVCUT altyapı:

### 5.1 Field → Konteyner (uzak adım): mevcut komut kanalı — DEĞİŞİKLİK YOK

```
field web-service OperationExecutor
  → uzak adım { system: "container-3", maneuver: "bsc_stop" }
  → fieldContainerCommandRoutes (POST /:fieldId/containers/:cid/commands,
      field-container-commands.ts:96-197)
  → TunnelProxy.startHttpStream (POST /api/commands/execute-multi)   [mevcut]
  → konteyner web-service (kendi komut hattı → kendi device-service)
  → yanıt AYNEN geri (CollectingStreamSink)
```

Not: uzak manevra adımı için konteynerde de `ManeuverRegistry`/yürütücü bulunur
(`maneuvers.json` tier config) — proxy gövdesi `execute-multi` yerine manevra yürütme
uç noktasına da gidebilir; iki uç nokta da aynı izin/sözleşme setini kullanır.

### 5.2 Boss → Field (operasyon tetikleme): yeni kontrol mesajları

`telemetry-query` deseninin kopyası (hub tarafı ister, client yanıtlar):

```
boss web-service (OperationRequester)
  → IHubChannel.sendControl(fieldPeerId, { type: "operation-execute",
        operationId, name, params, traceId })
  → field TunnelConnector → subscriber (OperationResponder)
  → yerel OperationExecutor çalıştırır (içindeki konteyner adımları §5.1'den gider)
  → { type: "operation-result", operationId, status, results } → boss
```

- Korelasyon: `operationId` (boss üretir) — `queryId` deseni.
- Boss'ta device-service YOKTUR; operasyonu YÜRÜTMEZ, yalnızca yönlendirir ve
  sonucunu gösterir/kaydeder. İş mantığı field'da kalır (katman sızmaz — mevcut
  `field-container-commands.ts:1-6` ilkesinin boss seviyesi tekrarı).
- Field operasyonu boss'un talebiyle başlatırken güvenlik: peer kayıt (register v2
  `peerId`+`peerType`) zaten kimliktir; ek yetkilendirme gerekmez çünkü boss↔field
  uplink'i ayrı token'la kurulur (`FIELD_UPLINK_TOKEN`, `default.ts:276-320`).

### 5.3 İki-hop röle (Boss → Field → Konteyner)

Boss'tan konteyner cihazına doğrudan kanal YOKTUR ve GEREKMEZ. Operasyon
adımları sistem sınırında çözülür: boss → field (`operation-execute`), field →
konteyner (mevcut komut kanalı). Her hop kendi audit'ini basar (`operation_started`
field'da, `field_container_command` proxy'de) — denetim zinciri kopmaz.

### 5.4 Sonuç yayılımı

- İsteyene: HTTP yanıtı (yerel/UI) veya `operation-result` (boss).
- Gözlemlenebilirlik: `operation_*` audit olayları mevcut `event` frame akışına
  eklenir (field→boss). Yeni dağıtım mekanizması YOK.

## 6. Yeni Mesaj Şemaları

`packages/ws-tunnel/src/protocol/messages.ts`'e iki tip + zod şeması (mevcut
`EventMessage`/`TelemetryQueryMessage` formatıyla aynı stilde; v2 register'ı ile
uyumlu, eskiye dokunmaz):

```ts
// boss → field
{ type: "operation-execute", operationId: string, name: string,
  params?: Record<string, unknown>, traceId?: string }

// field → boss (her zaman — başarı/başarısızlık farkı `status`'ta)
{ type: "operation-result", operationId: string,
  status: "completed" | "failed" | "rolled_back" | "rejected",
  reason?: string, results?: OperationStepResult[] }
```

- `rejected`: kayıt yok/parametre hatası/operasyon zaten çalışıyor.
- `results`: adım başına `{ step: number, system?: string, maneuver?: string,
  ok: boolean, reason?: string }` — operasyon sonucunun makine-okunur özeti.
- Bilinmeyen `operation-execute` (client'ta responder yoksa) sessiz yok sayılır —
  kontrol kanalı sözleşmesi (`tunnel-connector.ts:304-307`).
- Responder `Result` döndürür; yürütme hatası kontrol kanalını KAPATMAZ (event/
  telemetry-query ile aynı kademeli bozulma ilkesi).

## 7. Açık Kararlar (YAGNI)

| Karar | Durum | Ne zaman tekrar açılır |
|:---|:---|:---|
| Generic binary `streamType` (`kind: "raw"`) + client handler kaydı | YAPILMAZ | Backend servisler arasında büyük binary stream (firmware, kayıt) ihtiyacı doğarsa — o zaman `StreamOpenMessage`'a `streamType` + `TunnelClient`'a handler kaydı tek değişiklik noktasıdır |
| Client-initiated stream (hub dışında stream açma) | YAPILMAZ | Cihaz→boss push stream ihtiyacı doğarsa — komut/operasyon trafiği hub-başlatmalı kalır |
| Duplex `IStreamSink` | YAPILMAZ | Yukarıdakilerle birlikte |
| Peer-to-peer röle (boss hub üzerinden field↔field) | YAPILMAZ | Sistemler arası koordinasyon ihtiyacı doğarsa — bugün orkestratör her zaman üst sistemdedir |
| Tünel üzerinden pub/sub | YAPILMAZ | Topic abonelik + replay gereksinimi belirirse — sistem içi Redis pub/sub tercih edilir |
| Admin tanımlı manevra/operasyon kayıtlarının tier'lar arası SENKRONU | YAPILMAZ | Boss UI'ında tanım LİSTESİ gerekirse — bugün yalnızca yürütme sonuçları (`operation_*`) event frame ile akar; kayıtlar tier-local'dir (KOMUT-MANEVRA-OPERASYON §11.3) |

## 8. Limitler ve Sözleşmeler

- Kontrol mesajı boyutu: WS text frame limitine tabidir (~1 MiB tipik); operasyon
  istekleri küçüktür. Büyük params gereksinimi olursa HTTP stream yolu kullanılır.
- Yarı-ölü bağlantı: client liveness ping/pong'u (60 sn) ve hub stale zamanlayıcısı
  (45 sn) aynen geçerlidir — operasyon sırasında kopma, `operation-result` yerine
  timeout/`rollback_step_failed(system_unreachable)` ile sonuçlanır (§7.2 komut spec).
- Operasyon mesajları **tekrarsızdır**: BullMQ retry'leri yerel sistem içindedir;
  çapraz sistemde retry YOKTUR (idempotency sözleşmesi: `operationId` korelasyonu —
  aynı `operationId` ile gelen ikinci `operation-execute`, ilk çalıştırma hâlâ
  `running` ise `rejected` ile reddedilir).
- Audit: `operation-execute/result` alışverişi field tarafında TamperLogger'a
  `operation_boss_request`/`operation_result_sent` olarak basılır (best-effort —
  yürütme akışını kesmez).

## 9. Kabul Kriterleri

- K1: `operation-execute` → yürütme → `operation-result` uçtan uca (gerçek WS
  integration spec'i + gözle demo, `telemetry-query` spec'lerinin deseni).
- K2: İki-hop (boss→field→konteyner) komut akışında konteyner cihaz audit'i,
  field proxy audit'i ve boss istek audit'i üçü birden mevcut.
- K3: Bilinmeyen mesaj tipi / kopuk peer / yarı-ölü bağlantı senaryolarında
  kademeli bozulma (çökme yok, yanlış sonuç yok).
- K4: ws-tunnel paketinde **protokol değişikliği YOK** — yalnızca `protocol/messages.ts`'e
  iki ek tip; codec/connector/client/proxy değişmez (regresyon yüzeyi sıfır).

---

*review_date: 2026-09-17 — ilk sürüm, gözden geçirme bekliyor.*
