---
status: active
space: architecture
tags: [dogrulama, simulator, bsc, pcs, connector, test]
review_date: 2026-09-15
---

# BSC→PCS Connector — Doğrulama Dokümanı (Aşama 5/6)

Bağlı tasarım: [BSC-PCS-CONNECTOR-MIMARISI.md](./BSC-PCS-CONNECTOR-MIMARISI.md)

## 1. Genel Durum

| Görev | Durum | Kanıt |
|:------|:------|:------|
| T-C1 — mapping tipleri (strict parse) | ✅ | `connector.test.ts` parse 7 test |
| T-C2 — `DeviceTransportConfig.bmsPort` | ✅ | schema + config testi |
| T-C3 — config'ler (`bsc-pcs-connector-1.json`, `mappings/bsc-pcs-mapping.json`, `pcs-1.json` bmsPort) | ✅ | `config-connector.test.ts` 5/5 |
| T-C4 — BmsPortServer (FC 0x03/0x06/0x10, exception 0x01/0x02) | ✅ | `bms-port-server.test.ts` 8/8 |
| T-C5 — BscPcsConnectorAdapter (dönüşüm/koşu/izleme/retry) | ✅ | `connector.test.ts` 15/15 + `tcp-target.test.ts` 4/4 |
| T-C6 — SimulatorRegistry adapter haritası + kayıt | ✅ | device-service 78/78 |
| T-C8 — K-C8 gözle kontrol | ✅ | canlı iki device-service — aşağıda §5 |

## 2. Değişiklik Matrisi

| Değişiklik | Dosya | Geçme |
|:-----------|:------|:------|
| Mapping tipleri + `parseBscPcsMapping` (strict; `to` BMS bloğu zorunlu; `size`/`signed` kaynak alanları) | `packages/simulators/src/bsc-pcs-connector/mapping.ts` (YENİ) | ✅ |
| `BscPcsConnectorAdapter` — ayna/bitişik-koşu yazım/izleme register'ları/kademeli hata/retry | `.../bsc-pcs-connector/connector.ts` (YENİ) | ✅ |
| `TcpBmsTarget` — Modbus TCP FC 0x10 istemcisi | `.../bsc-pcs-connector/tcp-target.ts` (YENİ) | ✅ |
| `BmsPortServer` — minimal Modbus TCP sunucu (BMS bloğu yazılabilir; EMS RO) | `packages/simulators/src/wattox-pcs/bms-port-server.ts` (YENİ) | ✅ |
| Wattox simülatörü: `ensureBmsServer`/`stopBmsServer` + `bmsPort` | `.../wattox-pcs/simulator.ts` | ✅ |
| `SimulatorTransport` `onDisconnect` kancası | `packages/simulators/src/simulator-transport.ts` | ✅ |
| SimulatorRegistry: adapter haritası + `bsc-pcs-connector` fabrikası | `services/device-service/src/simulator-registry.ts` | ✅ |
| registerMap config-dir-göreli çözümleme | `services/device-service/src/device-service.ts` | ✅ |
| Config'ler + mapping alt dizini | `config-docker/{bsc-pcs-connector-1.json,mappings/bsc-pcs-mapping.json}` | ✅ |

## 3. Kabul Kriteri Kanıtları

| Kod | Kriter | Sonuç |
|:----|:-------|:------|
| K-C1 | Config şemadan geçer; bmsPort şema uzantısı | ✅ |
| K-C2 | Mapping strict; B01-B23 tam kapsam (768-790) | ✅ config-connector testi |
| K-C3 | ratio/offset/yuvarlama; S16 negatif word'ler | ✅ |
| K-C4 | bit eşlemesi hedef kelimeyi bozmaz | ✅ |
| K-C5 | BmsPortServer: FC'ler + exception'lar + EMS/BMS izolasyonu | ✅ 8/8 |
| K-C6 | tick→yazım + sayaç/link + retry | ✅ |
| K-C7 | Purity: core'a connector DAL'ı yok; registry 1 kayıt | ✅ kod inceleme |
| K-C8 | Gözle: BSC değeri PCS BMS bloğunda | ✅ §5 |
| K-C9 | Kapılar: ≥%70 satır / ≥%90 branch (dönüşüm/BmsPortServer) | ✅ connector %80.7 satır; bms-port-server %97.5 |

## 4. Sapmalar (onaylı)

| Kod | Sapma | Neden |
|:----|:------|:------|
| S5 | **Oran yönü düzeltildi:** SPEC §7 "BSC SOC ×10" yazıyordu — connector RAW register oranı kullanır: `raw_pcs = raw_bsc × (scale_kaynak/scale_hedef)` → SOC ratio **0.1**, voltaj **0.001**, güç limitleri **0.01** | SPEC oranları mühendislik birimi dönüşümüydü; register katmanı ham word taşır |
| S6 | Kaynak `size`/`signed` alanları eklendi (uint32/sint32 kaynaklar: DC voltaj/akım, Max Current, EMU enerji) | BSC register haritasında çok-word kayıtlar mevcut; SPEC'te yoktu |
| S7 | İlk implementasyonda bitişik olmayan kirli adresler tek FC 0x10'da kayma üretti (canlı demoda yakalandı) → **bitişik koşulara** bölme düzeltmesi + test sabitleme | GAP'lı yazım gruplarının BMS bloğunda adres kaydırması |
| S8 | Mapping dosyası config dizini KÖKÜNDE cihaz config sayılıyordu (loader tüm *.json'ı cihaz sanır) → `mappings/` alt dizinine taşındı + registerMap config-dir göreli çözümleme | DeviceConfigLoader davranışı |
| S9 | B17/B18 kaynağı `Rack Max/Min Voltage` (30124/30125) aslında **Rack ID** register'ları — SPEC A3'te bayraklıydı; doğru kaynak devreye alımda netleşecek | BSC haritası semantiği |

## 5. Gözle Kontrol — K-C8 (2026-09-15)

İki device-service birlikte çalıştırıldı (field: wattox-pcs PCS-1, bmsPort 15502; konteyner: BSC-1/2 + EMU-1 + BSC-PCS-CONNECTOR-1). BMS portundan doğrudan Modbus okumayla doğrulandı:

| BMS kaydı | Beklenen (kaynak) | Ölçülen | Sonuç |
|:----------|:------------------|:--------|:------|
| B05 SOC | BSC SOC 50% → raw 500 | 500 | ✅ |
| B06 SOH | BSC SOH 99% → 990 | 990 | ✅ |
| B03 voltaj | BSC DC 1356.6V → 13566 | 13566 | ✅ |
| B13/B14 sıcaklık | BSC 23°C → 230 | 230 | ✅ |
| B15/B16 hücre V | BSC 35.288V → 35288 | 35288 | ✅ |
| B19/B20 enerji | EMU 592.8kWh → 5928 | 5928 | ✅ |
| B21 anma enerji | sabit 5018 | 5018 | ✅ |
| B01/B23 durum | BSC State 3 | 3 | ✅ |
| B09/B10 limitler | BSC durumuna göre 0 (şarj setpoint 0) | 0 | ✅ (sim semantiği) |

Kayma bug'ı (S7) canlı yakalandı: düzeltme öncesi 769'da BSC SOC değeri görülüyordu; düzeltme sonrası adresler birebir eşleşti.

`review_date: 2026-09-15`
