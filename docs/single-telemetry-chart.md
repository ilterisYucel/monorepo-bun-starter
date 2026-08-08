# SingleTelemetryChart

## Amaç

Telemetri seçiminin **tekli** (single-select), etiket (tag) filtrelemesinin **çoklu** (multi-select) olduğu bir grafik bileşeni. Standart `TelemetryChart` bileşeninden farkı: tag kombinasyonları grafikte **ayrı seriler** olarak gösterilir — filtreleme yapmak yerine, seçilen her tag kombinasyonu için bir çizgi çizilir.

## Kullanım

```tsx
<SingleTelemetryChart
  provider={telemetryProvider}
  telemetryNames={allNames}
  title="Analitik"
  yAxisLabel="Değer"
  tagFilters={[
    { tagKey: "deviceId", label: "Cihaz" },
    { tagKey: "rack_id", label: "Rack" },
  ]}
/>
```

## Davranış

### Tekli Metrik Seçimi

- Açılır menüde `●` işaretiyle gösterilir
- Bir metrik seçildiğinde diğerleri otomatik kalkar
- Arama filtresi destekler
- Kategori başlığı yok (sadece düz liste)

### Çoklu Tag Seçimi

- Checkbox ile birden fazla değer seçilebilir
- Açılır menü seçim sonrası kapanmaz (birden fazla seçim yapılabilir)
- Tetikleyici buton `"{n} seçili"` gösterir
- Seçilen tag'lerin **kartezyen çarpımı** alınır → her kombinasyon bir seri olur

### Seri Oluşturma (Tag Kombinasyonları)

| deviceId seçimi | rack_id seçimi | Oluşan seriler |
|:---|:---|:---|
| BSC-1, BSC-2 | 1, 3 | `SOC (deviceId:BSC-1 / rack_id:1)`, `SOC (deviceId:BSC-1 / rack_id:3)`, `SOC (deviceId:BSC-2 / rack_id:1)`, `SOC (deviceId:BSC-2 / rack_id:3)` |
| BSC-1 | (hiçbiri) | `SOC` (tek seri) |
| (hiçbiri) | (hiçbiri) | `SOC` (tek seri) |

```
┌────────────────────────────────────────────────────────┐
│  Zaman Aralığı  Nokta  Metrik  Cihaz       Rack       │
│  [Son 1 Sa ▾]  [120 ▾] [● SOC] [☑ BSC-1]  [☑ 1]     │
│                                [☑ BSC-2]  [☑ 3]      │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 100% ┤    ╱‾‾‾╲                                  │  │
│  │      │───╱      ╲──────  BSC-1 / 1              │  │
│  │  50% ┤   ╱╲    ╱╲                                 │  │
│  │      │──╱  ╲──╱  ╲────  BSC-2 / 1              │  │
│  │   0% ┤                                          │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  Seri                          Son    Min   Max   Ort  │
│  ── SOC (deviceId:BSC-1 / rack_id:1)  53.2  48.1  55.3  51.2 │
│  ── SOC (deviceId:BSC-1 / rack_id:3)  52.8  47.5  54.1  50.9 │
│  ── SOC (deviceId:BSC-2 / rack_id:1)  48.3  43.2  49.8  46.5 │
│  ── SOC (deviceId:BSC-2 / rack_id:3)  47.1  42.8  48.9  45.8 │
└────────────────────────────────────────────────────────┘
```

## Mimari

### Dosya yapısı

```
packages/ui/src/components/SingleTelemetryChart/
  index.ts
  SingleTelemetryChart.tsx
  SingleTelemetryChart.types.ts
```

`TelemetryChart.styles.ts` ve `TelemetryChart.types.ts`'teki stilleri ve tip tanımlarını **tekrar kullanır** — kendi styles dosyası yoktur.

### Performans optimizasyonları

**1. Stabil `tagFilters` referansı**

Ebeveyn sayfada inline dizi yerine `useMemo` ile stabilize edilir:

```tsx
// RacksPage.tsx
const tagFilterList = useMemo(() => [
  { tagKey: "deviceId", label: "Cihaz" },
  { tagKey: "rack_id", label: "Rack Numarası" },
], []);
```

Her render'da yeni referans oluşmasını engeller — `seriesNames` ve `chartData` memo'ları gereksiz yere invalidate olmaz.

**2. Hash tabanlı seri eşleme**

Tag kombinasyonları önceden `Map<string, string>` (tag imzası → seri adı) olarak hesaplanır:

```
sigMap:
  "BSC-1|1"     → "SOC (deviceId:BSC-1 / rack_id:1)"
  "BSC-1|3"     → "SOC (deviceId:BSC-1 / rack_id:3)"
  "BSC-2|1"     → "SOC (deviceId:BSC-2 / rack_id:1)"
  "BSC-2|3"     → "SOC (deviceId:BSC-2 / rack_id:3)"
```

Her telemetri kaydı için O(M) döngü yerine O(1) hash araması:

```ts
// Önce: O(N × M) — N telemetri, M kombinasyon
for (const combo of seriesNames) {
  if (combo.match(telemetry.tags)) { ... break; }
}

// Sonra: O(N) — hash araması
const sig = tagFilters.map(f => tags?.[f.tagKey] ?? "").join("|");
const colName = sigMap.get(sig);  // O(1)
```

### TelemetryChart ile karşılaştırma

| Özellik | TelemetryChart | SingleTelemetryChart |
|---------|:---:|:---:|
| Metrik seçimi | Çoklu (checkbox) | Tekli (radio) |
| Tag işleme | Filtreleme | Seri olarak gruplama |
| Tag seçimi | Tekli (native select) | Çoklu (checkbox) |
| Kategorili metrikler | Evet | Hayır |
| Tümü/Sadece Temel/Sadece Detay | Evet | Hayır |
| Arama | Evet | Evet |
| Zaman aralığı | Evet | Evet |
| Özel zaman aralığı | Evet | Evet |
| Olay anotasyonları | Evet | Evet |
| Legend tablosu | Evet | Evet |
| `labels` prop | Evet | Evet |
| `locale` prop | Evet | Evet |
| Kullanım yeri | FieldChartsPage (field app) | SystemChartsPage, RacksPage (container app) |

### IoC uyumluluğu

- `TelemetryProvider` arayüzü ile çalışır — veri kaynağından bağımsız
- `TelemetryChart` ile aynı props arayüzünü kullanır (`TelemetryChartProps`)
- `labels` prop ile çeviri metinleri dışarıdan alınır
- Hiçbir state management kütüphanesi import etmez (UI paketi kuralı)
