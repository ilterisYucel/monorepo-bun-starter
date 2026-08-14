// InfluxDB implementasyonu — henüz yazılmadı (YAGNI).
// ITimeseriesDatabase kontratının InfluxDB karşılığı gerektiğinde buraya eklenir:
//   - influxdb-config.ts     (InfluxDBConfig + buildInfluxDBConfig)
//   - influxdb-adapter.ts    (ITimeseriesDatabase implementasyonu)
//   - index.ts               (barrel)
// Kurallar (kontrat seviyesinde kararlaştırıldı):
//   - Bucket hizalaması: Timescale'de time_bucket(interval, ts, origin=query.from);
//     Influx karşılığı GROUP BY time(interval, offset) veya aggregateWindow —
//     offset mutlaka sorgunun `from` zamanı olmalıdır (Grafana datasource kuralı).
//   - MaterializedViewManager'ın Influx karşılığı continuous aggregate'lardır
//     (uygulama katmanında ayrı ele alınır).
