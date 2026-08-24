---
status: active
space: architecture
tags: [mimari, frontend, bilesen]
review_date: 2026-08-24
---

# Bileşen Mimarisi: Cihaz Bazlı Veri Erişim Desenleri

## 1. Mimari Katmanlar

Monorepo üç katmanlı bir mimari izler. Her katmanın veriye erişim kuralları farklıdır:

```
┌──────────────────────────────────────────────────────────────────┐
│  apps/ (uygulama katmanı)                                        │
│  Sayfalar, Zustand store'lar, TanStack Query hook'ları          │
│  TransportProvider, RealtimeProvider, React Router               │
│  → Doğrudan API çağrısı yapabilir, state management kullanabilir │
├──────────────────────────────────────────────────────────────────┤
│  packages/ui (durumdan bağımsız)                                  │
│  Bileşenler, IoC arayüzleri, transport implementasyonları        │
│  → API çağıramaz, state kütüphanesi import edemez                │
│  → Tüm veri props veya React Context üzerinden alınır            │
├──────────────────────────────────────────────────────────────────┤
│  packages/core (altyapı)                                          │
│  TimescaleDB, BullMQ, Modbus, Postgres adaptörleri               │
│  → Servisler tarafından kullanılan temel sınıflar                │
└──────────────────────────────────────────────────────────────────┘
```

**Kural:** `packages/ui` hiçbir state management kütüphanesini (TanStack Query, Zustand, SWR) import edemez. Tüm veri akışı IoC (Inversion of Control) ile sağlanır.

---

## 2. Üç Veri Erişim Deseni

Tek bir desene zorlamak hem performans hem esneklik kaybına yol açar. Bunun yerine, her kullanım senaryosu için optimize edilmiş üç desen bir arada kullanılır:

### 2.1 İzole (Device-Level) Desen

**Ne zaman kullanılır:** Tek bir cihaza ait gerçek zamanlı göstergeler (Gauge, StatusBadge).

**Nasıl çalışır:**

```
DeviceTelemetryProvider (compound component)
  └── useRealtimeTelemetry({ transport, deviceId })
       ├── useSyncExternalStore → React 18 concurrent-safe
       ├── requestAnimationFrame batching → frame başına max 1 render
       └── Tampon sınırı: bufferSize (varsayılan 100 giriş)
```

**Örnek kullanım:**

```tsx
<DeviceTelemetryProvider deviceId="bsc-1" transport={wsTransport}>
  <DeviceTelemetryProvider.Gauge metric="Voltage" label="Voltaj" />
  <DeviceTelemetryProvider.Gauge metric="Current" label="Akım" />
  <DeviceTelemetryProvider.StatusBadge />
</DeviceTelemetryProvider>
```

**Avantajları:**
- Crash izolasyonu: Bir cihazın stream'i çökerse diğer paneller etkilenmez (Grafana panel modeli)
- Her provider kendi tamponuna, kendi rAF döngüsüne, kendi transport aboneliğine sahiptir
- `useSyncExternalStore` sayesinde concurrent rendering ile uyumlu

**Dikkat edilmesi gerekenler:**
- N adet `DeviceTelemetryProvider` = N adet `useRealtimeTelemetry` çağrısı
- Ancak transport seviyesinde tek bir WebSocket bağlantısı kullanılır (`RealtimeProvider` tüm cihaz ID'lerini birleştirir)
- Yani N provider ≠ N WebSocket bağlantısı — bağlantı seviyesinde multiplexing yapılır

### 2.2 Toplu (Aggregate) Desen

**Ne zaman kullanılır:** Birden fazla cihazın geçmiş verilerini sorgulayan grafikler ve tablolar (TelemetryChart, DeviceTable).

**Nasıl çalışır:**

```
useTelemetryProvider({ deviceIds, telemetryNames, filters })
  ├── useQuery → GET /unified/telemetry/downsampled?deviceIds=bsc-1,bsc-2&...
  ├── useRealtimeStream → WebSocket aggregate stream
  └── useTelemetry → merge(historical, realtime)
       └── TelemetryProvider (IoC arayüzü) döndürür
```

**Arayüz sözleşmesi:**

```ts
interface TelemetryProvider {
  data: TelemetryData[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  range: TimeRange;
  points: number;
  setRange(range: TimeRange): void;
  setPoints(points: number): void;
  refetch(): void;
}
```

**Örnek kullanım:**

```tsx
const provider = useTelemetryProvider({
  deviceIds: ["bsc-1", "bsc-2", "bsc-3"],
  telemetryNames: ["Voltage", "Current", "SOC"],
});
<TelemetryChart provider={provider} />
```

**Avantajları:**
- Sunucu tarafında downsampling → ağ trafiği optimize edilir
- Tek bir HTTP sorgusu ile tüm cihazların verisi alınır
- `staleTime: 30000` ile React Query cache → gereksiz yeniden sorgulama önlenir

### 2.3 Hesaplanmış (Computed / Resolved) Desen

**Ne zaman kullanılır:** Birden fazla cihazın verisini çapraz hesaplayan paneller (DashboardPage, FieldDashboardPage).

**Nasıl çalışır:**

```
Sayfa (apps/container-web)
  ├── useRealtimeStream() → tüm cihazların ham verisi
  ├── İstemci tarafında hesaplama:
  │   breakerStatuses = BSC verisi + CB verisi cross-reference
  │   totalPower = tüm container'ların güç toplamı
  └── Hesaplanmış veri props olarak bileşene iletilir
       └── <BSCCard voltage={...} current={...} soc={...} breakerStatus={...} />
```

**Örnek kullanım (DashboardPage.tsx):**

```tsx
// Sayfa seviyesinde cross-device hesaplama
const breakerStatuses = bscDevices.map((_bsc, idx) => {
  const cbEntry = realtimeData.find(
    (t) => t.deviceId === `CB-${idx + 1}` && t.name === "Is Tripped"
  );
  // ...
});

// Hesaplanmış veri props ile bileşene iletilir
<BSCCard
  voltage={bsc.voltage}
  current={bsc.current}
  breakerStatus={breakerStatuses[idx]}
/>
```

**Avantajları:**
- Bileşenler saf presentasyonel kalır — tek sorumluluk: veriyi göstermek
- Hesaplama mantığı bileşende değil, sayfa seviyesinde
- Aynı bileşen farklı sayfalarda farklı hesaplanmış verilerle kullanılabilir

---

## 3. IoC Sözleşmeleri (Interface Contracts)

Tüm veri akışı arayüzler üzerinden soyutlanır. Bileşenler somut implementasyona değil, arayüze bağımlıdır:

| Arayüz | Konum | Amaç |
|--------|-------|------|
| `ITelemetryTransport` | `shared-types/src/telemetry/transport.ts` | Gerçek zamanlı veri taşıma soyutlaması |
| `TelemetryProvider` | `ui/src/interfaces/telemetry-provider.ts` | Zaman serisi sorgulama ve filtreleme |
| `LogProvider` | `ui/src/interfaces/log-provider.ts` | Log kaydı durumu ve yönetimi |
| `EventAnnotationsProvider` | `ui/src/interfaces/event-annotations.ts` | Grafikler için olay işaretleri |

### Taşıma Stratejisi (ITelemetryTransport)

```
ITelemetryTransport (arayüz)
  ├── WebSocketTransport    → Production gerçek zamanlı
  ├── HttpPollingTransport  → Fallback, basit kurulum
  └── MockTransport         → Storybook, test, demo
```

Her üçü de aynı arayüzü uygular. `TransportProvider` ile uygulama seviyesinde hangisinin kullanılacağı seçilir. Bileşenler transport'tan tamamen habersizdir — sadece provider tüketir.

---

## 4. Veri Akış Diyagramı

### Uygulama başlatma:

```
TransportProvider
  ├── ws: new WebSocketTransport(WS_URL, getToken)
  └── http: new HttpPollingTransport({ endpoint, intervalMs })

RealtimeProvider
  └── useRealtimeTelemetry({ transport: ws, deviceId: "bsc-1,bsc-2,..." })
       └── Tüm cihazları tek WebSocket bağlantısında birleştirir

useTelemetryProvider({ deviceIds, options })
  ├── useQuery → /unified/telemetry/downsampled (geçmiş veri, HTTP)
  ├── useRealtimeStream → RealtimeProvider context (anlık veri, WS)
  └── merge → TelemetryProvider (IoC)
```

### Sayfaların veri kaynakları:

| Sayfa | Veri Deseni | Veri Kaynağı |
|-------|------------|--------------|
| DashboardPage | Hesaplanmış | `useRealtimeStream()` + istemci cross-reference |
| SystemChartsPage | Toplu | `useSystemTelemetry()` → aggregate HTTP query |
| RacksPage | Toplu | `useRackTelemetry()` → filtered HTTP query |
| ControlPage | İzole | `ManeuverCard` → props + API callbacks |
| EventsPage | Toplu | `useFilteredLogProvider()` → Zustand store |
| DevicesPage | Toplu | `useDeviceList()` → HTTP query |
| FirePanelPage | Hesaplanmış | `useRealtimeStream()` + istemci durum makinesi |

---

## 5. Performans Analizi

### 5.1 İzole desenin olumlu etkileri

| Mekanizma | Etki |
|-----------|------|
| `useSyncExternalStore` | React 18 concurrent rendering uyumlu, tutarsız render önlenir |
| `requestAnimationFrame` batching | Saniyede binlerce telemetri gelse bile frame başına max 1 render |
| Tampon sınırı (`bufferSize: 100`) | Bellek kullanımı sabit, haftalarca çalışsa bile sızıntı yok |
| Crash izolasyonu | Bir cihazın stream hatası diğer panelleri etkilemez |

### 5.2 İzole desende dikkat edilmesi gerekenler

| Endişe | Gerçek durum |
|--------|-------------|
| N cihaz = N WebSocket bağlantısı mı? | **Hayır.** `RealtimeProvider` tüm cihaz ID'lerini tek bir WebSocket'te birleştirir. Transport seviyesinde multiplexing yapılır. |
| Çapraz-cihaz hesaplamaları nasıl yapılır? | Hesaplanmış desen ile. Sayfa seviyesinde `useRealtimeStream()` ile tüm veri alınır, istemcide hesaplanır, props ile bileşene iletilir. |
| Çoklu-cihaz grafikleri? | Toplu desen ile. `TelemetryProvider` `deviceIds[]` alır, sunucu tarafında aggregate sorgu yapılır. |

### 5.3 Üç desenin birlikte çalışması

Her desen kendi kullanım senaryosu için optimize edilmiştir:

- **İzole:** Düşük gecikme, yüksek izolasyon → gerçek zamanlı göstergeler
- **Toplu:** Sunucu optimizasyonu, cache → geçmiş veri analizi
- **Hesaplanmış:** Sayfa seviyesinde mantık, saf bileşenler → dashboard panelleri

Tek bir desene zorlamak, diğer senaryolarda performans ve esneklik kaybına yol açar. Örneğin:
- Tüm veriyi izole desenle almak → N kat daha fazla ağ trafiği
- Tüm veriyi toplu desenle almak → gerçek zamanlı güncelleme gecikmesi
- Tüm veriyi hesaplanmış desenle almak → bileşenlerin yeniden kullanılabilirliği azalır

---

## 6. Editör Uygulaması için Esneklik

Düşük kodlu/kodsuz bir panel editörü (Grafana benzeri) için mimari temel:

```
Panel = Görselleştirme Bileşeni + Veri Kaynağı (IoC)

┌──────────────────────────────────────────────────────┐
│  Panel Editörü                                        │
│                                                      │
│  1. Görselleştirme Seç: [Gösterge] [Grafik] [Tablo] │
│  2. Veri Kaynağı Seç:                                │
│     ├── Cihaz (BSC-1, Voltage)                       │
│     ├── Toplu (Tüm BSC, Avg SOC)                     │
│     └── Formül (custom expression)                    │
│  3. Önizleme (MockTransport ile canlı)               │
│                                                      │
│  Tüm veri kaynakları → ITelemetryProvider            │
│  Tüm görselleştirmeler → ITelemetryProvider tüketir  │
│  Sıfır bağlaşım                                      │
└──────────────────────────────────────────────────────┘
```

Her panel bağımsız olarak:
- Kendi veri kaynağını yapılandırır
- Kendi görselleştirme tipini seçer
- Kendi yenileme aralığını belirler
- Diğer panellerin çökmesinden etkilenmez

---

## 7. Bileşen → Veri Kaynağı Eşleme Tablosu

| Bileşen | Veri Deseni | Arayüz | Çoklu Cihaz? | Konum |
|---------|------------|--------|-------------|-------|
| `Gauge` | İzole | DeviceTelemetryProvider context | Hayır | `ui/core/DeviceTelemetryProvider/` |
| `StatusBadge` | İzole | DeviceTelemetryProvider context | Hayır | `ui/core/DeviceTelemetryProvider/` |
| `TelemetryChart` | Toplu | TelemetryProvider (IoC) | Evet | `ui/components/TelemetryChart/` |
| `LogTerminal` | Toplu | LogProvider (IoC) | — | `ui/components/LogTerminal/` |
| `BSCCard` | Hesaplanmış | Props (~22 adet) | Evet | `ui/components/BSCCard/` |
| `RackCard` | Hesaplanmış | Props | Hayır | `ui/components/RackCard/` |
| `ContainerCard` | Hesaplanmış | Props | Evet | `ui/components/ContainerCard/` |
| `FieldCard` | Hesaplanmış | Props | Evet | `ui/components/FieldCard/` |
| `DeviceTable` | Hesaplanmış | Props | Evet | `ui/components/DeviceTable/` |
| `ManeuverCard` | Hibrit | Props + callback'ler | Evet | `ui/components/ManeuverCard/` |
| `FieldMap` | Hesaplanmış | Props | Evet | `ui/components/FieldMap/` |
| `PlayCanvasViewer` | Hesaplanmış | Props | Evet | `ui/components/PlayCanvasViewer/` |
| `ContainerConnectionBadge` | Hesaplanmış | Props | Hayır | `ui/components/ContainerConnectionBadge/` |

---

## 8. Transport Stratejisi

### Uygulama seviyesinde transport seçimi

```tsx
// apps/container-web/src/contexts/TransportContext.tsx
const transports: TransportMap = {
  ws: new WebSocketTransport(WS_URL, getToken),
  http: new HttpPollingTransport({ endpoint, intervalMs: 10000, getToken }),
};

// Bileşenler transport'tan habersiz:
<DeviceTelemetryProvider deviceId="bsc-1" transport={transport}>
  {/* transport WebSocket mi HTTP mi bilmez */}
</DeviceTelemetryProvider>
```

### Transport değiştirme maliyeti

WebSocket'ten HTTP polling'e geçmek için **sıfır bileşen değişikliği** gerekir. Sadece `TransportProvider`'da transport nesnesi değiştirilir.

Aynı şekilde yeni bir transport tipi (SSE, MQTT, vb.) eklemek için:
1. `ITelemetryTransport` arayüzünü uygulayan yeni bir sınıf oluştur
2. `TransportProvider`'a kaydet
3. Tüm mevcut bileşenler yeni transport ile çalışır — değişiklik gerekmez

---

## 9. Çapraz-Cihaz Veri Sorgulamaları: Mevcut Durum ve Gelecek

### 9.1 Mevcut mimari

`/unified/telemetry/downsampled` endpoint'i, her cihaz için **bağımsız**
TimescaleDB sorguları çalıştırır ve sonuçları `.flat()` ile birleştirir:

```
istemci → GET /unified/telemetry/downsampled?deviceIds=bsc-1,bsc-2&points=120
           │
           ├── SELECT time_bucket(...) FROM device_bsc_1  → 120 satır
           ├── SELECT time_bucket(...) FROM device_bsc_2  → 120 satır
           │
           └── .flat() → 240 satır → istemciye tek cevap
```

**Önemli:** TimescaleDB'nin `time_bucket()` fonksiyonu epoch'a hizalı sabit bir
grid kullanır. Aynı `bucketInterval` ile sorgulanan iki farklı hypertable,
**zaten örtüşen bucket sınırları** üretir. Bu nedenle mevcut mimaride zaman
ekseninde bir senkronizasyon sorunu **yoktur.** Farklı cihazların bucket
sayısının farklı olması (biri 120, diğeri 115) cihazın o anki veri durumunu
yansıtır — bu beklenen bir davranıştır.

Tag filtreleme (`rack_id` vb.) sorgu içinde `tags->>'rack_id' = $1` olarak
uygulanır. `GROUP BY bucket, tags` sayesinde farklı tag kombinasyonları aynı
bucket içinde ayrı satırlar olarak döner.

**Sorgu yapısı (cihaz başına):**

```sql
SELECT time_bucket('30 seconds', timestamp) AS bucket,
       tags,
       AVG(CASE WHEN name = 'Voltage' THEN (value)::numeric END) AS "Voltage",
       AVG(CASE WHEN name = 'Current' THEN (value)::numeric END) AS "Current",
       AVG(CASE WHEN name = 'SoC'    THEN (value)::numeric END) AS "SoC"
FROM device_bsc_1
WHERE timestamp BETWEEN $from AND $to
GROUP BY bucket, tags
ORDER BY bucket ASC
```

### 9.2 Gelecek optimizasyon: UNION ALL ile tek sorguda birleştirme

#### Yaklaşım

Tüm cihazlar için **tek bir SQL sorgusu**, `UNION ALL` ile hypertable'ları
birleştirir:

```sql
SELECT bucket, device_id,
       AVG(CASE WHEN name = 'Voltage' THEN value END) AS "Voltage",
       AVG(CASE WHEN name = 'Current' THEN value END) AS "Current"
FROM (
  SELECT time_bucket('30 seconds', timestamp) AS bucket,
         'bsc-1' AS device_id, name, (value)::numeric AS value
  FROM device_bsc_1
  WHERE timestamp BETWEEN $from AND $to
  UNION ALL
  SELECT time_bucket('30 seconds', timestamp) AS bucket,
         'bsc-2' AS device_id, name, (value)::numeric AS value
  FROM device_bsc_2
  WHERE timestamp BETWEEN $from AND $to
) sub
GROUP BY bucket, device_id
ORDER BY bucket;
```

#### Artıları

| Artı | Açıklama |
|------|----------|
| **Tek round-trip** | N cihaz → 1 sorgu. Bağlantı havuzu yükü azalır. |
| **Doğal hizalama garantisi** | Tek `time_bucket` bağlamı. Farklı `bucketInterval` hesaplama riski sıfırlanır. |
| **Sorgu planlayıcı** | PostgreSQL, UNION ALL + dış GROUP BY için paralel plan üretebilir. |

#### Eksileri

| Eksi | Açıklama |
|------|----------|
| **CASE WHEN patlaması** | Her cihaz alt-sorgusunda aynı `AVG(CASE WHEN name = 'X'...)` pivot'u tekrarlanır. 3 cihaz × 40 telemetri adı = SQL string'i ~15KB. Dinamik sorgu üretimi karmaşıklaşır. |
| **Chunk elimination riski** | TimescaleDB hypertable'larda `WHERE timestamp BETWEEN` ile chunk eleme yapar. Dış `GROUP BY` bu optimizasyonu bozabilir — test edilmeden varsayılamaz. |
| **Hata izolasyonu kaybı** | Tek bir alt-sorgu hatası tüm sonucu kaybettirir. Mevcut `Promise.all` yaklaşımı da aynı zaafiyete sahip — `Promise.allSettled` ile düzeltilebilir. |
| **Kod karmaşıklığı** | İki mod (bağımsız vs birleşik) desteklemek, SQL üretecini ve test matrisini büyütür. |

#### Ne zaman implemente edilmeli?

Aşağıdaki koşullardan **en az biri** gerçekleştiğinde:

1. **>20 cihaz** aynı anda sorgulanıyor — bağlantı havuzu darboğazı metriklerle kanıtlandığında
2. **Yavaş ağ** (RevPi cellular üzerinden uzak TimescaleDB'ye bağlanıyorsa) — round-trip sayısı kritik hale geldiğinde
3. **Yüksek eşzamanlı kullanıcı** (>10 dashboard) — veritabanı bağlantı sayısı sınırına yaklaşıldığında

Mevcut deployment'da (2-6 BSC cihazı, container içi LAN, tek kullanıcılı RevPi)
bu koşulların hiçbiri geçerli değildir. **Şu an için implemente edilmesi önerilmez.**
İhtiyaç doğduğunda bu doküman karar kriteri olarak kullanılmalıdır.

### 9.3 Cihaz-tipi bazlı veri akışı (son durum)

| Cihaz Tipi | Cihaz Başına Tablo | WS Akışı | HTTP Downsampling | Polling Hizalaması |
|------------|:---:|:---:|:---:|:---:|
| BSC | `device_bsc_N` | Global WS | Bağımsız sorgu | Aynı 5s sınırı |
| XRack | `device_xrack_N` | Global WS | Bağımsız sorgu | Aynı 5s sınırı |
| HVAC | `device_hvac_N` | Global WS | Bağımsız sorgu | Bağımsız |
| CB | `device_cb_N` | Global WS | Bağımsız sorgu | Bağımsız |
| DC-Output | `device_dc_output_N` | Global WS | Bağımsız sorgu | Bağımsız |

**Notlar:**
- BSC ve XRack cihazları `alignedStart` ile aynı zaman sınırında polling'e başlar — aynı tip cihazların veri noktaları zaman olarak birbirine yakındır.
- Farklı tipler (BSC vs HVAC) bağımsız zamanlarda polling yapar — bu beklenen davranıştır.
- `time_bucket()` epoch'a hizalı olduğu için, farklı hypertable'larda aynı `bucketInterval` ile çalışan sorgular zaten örtüşen bucket sınırları üretir.
