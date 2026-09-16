---
status: active
space: architecture
tags: [test-kapsami, simulator, connector, bsc, pcs]
review_date: 2026-09-15
---

# BSC→PCS Connector — Test Kapsamı (Aşama 6/6)

> **Yaşayan doküman** (AGENTS hibrit kural). Kapsam: `packages/simulators/src/bsc-pcs-connector/*` + `wattox-pcs/bms-port-server` + `config-connector.test.ts`.

## 1. Mapping parser — `connector.test.ts` parse bölümü (7)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| Geçerli dosya | üç kind (register/bit/constant) | parse |
| Bilinmeyen kind | `dance` | throw |
| Eksik from/ratio | register'da from yok | throw |
| Eksik from.bit | bit mapping'de | throw |
| BMS dışı `to` | 767 | throw |
| Bilinmeyen kök/entry/from anahtarı | strict | throw |
| Boş mappings | [] | throw |

## 2. BscPcsConnectorAdapter — `connector.test.ts` (8 davranış)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| Dönüşüm + koşular | ratio/offset; 769/770 bitişik koşu, 772, 788 ayrı | 3 koşu, birebir değerler |
| Değişmeyen değer | 2. tick (değişiklik yok) | yazım YOK |
| Değişen + intervalMs | interval dolmadan yazım yok; dolunca yalnız değişen adres | 1 yeni koşu |
| Kademeli kaynak hatası | bir kaynak yok | diğerleri yazılır; source status 1 |
| Yazım hatası | ilk yazım reject | link 0 + fail 1; sonraki tick bağlanır + yazar |
| Kaynak yok | tümü yok | yazım yok; source status 2; connect çağrılmaz |
| Bit eşlemesi | iki bit aynı hedef kelimeye | diğer bitler bozulmaz (0x82) |
| Yazma girişimi | writeHoldingRegister | yok sayılır |

## 3. TcpBmsTarget — `tcp-target.test.ts` (4)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| Uçtan uca yazım | gerçek BmsPortServer'a FC 0x10 | simülatör deposu güncellenir |
| Sunucu kapalı | connect | throw |
| Retry deseni | close → yeniden connect + yazım | çalışır |
| BMS dışı yazım | 767 | Modbus exception throw |

## 4. BmsPortServer — bkz. [PCS-WATTOX-TEST-KAPSAMI.md](./PCS-WATTOX-TEST-KAPSAMI.md) §4 (8 test)

## 5. Config — `config-connector.test.ts` (5)

| Durum | Beklenen |
|:------|:---------|
| Connector config şema | bsc-pcs-connector simulator tipi |
| Mapping strict + BMS aralığı | 24 eşleme, 768-790 |
| B01-B23 tam kapsam | tüm adresler dolmuş |
| Kaynak cihazlar mevcut | BSC-1, EMU-1 config-docker'da |
| Telemetri ad benzersizliği | 8 izleme register'ı |

## KAPSANMAYAN (boşluklar)

| # | Boşluk | Neden | Öncelik |
|:--|:-------|:------|:--------|
| C1 | Çift BSC kaynak seçimi (BSC-1/BSC-2 agregasyon) | SPEC A6 — MVP mapping'de açık deviceId | Orta |
| C2 | B02 status word bit kaynaklarının (şarj/deşarj yasak) gerçek BSC bitfield eşlemesi | SPEC A2 — devreye alımda netleşecek | Orta |
| C3 | B17/B18 doğru kaynak (Rack ID değil gerçek voltaj limiti) | S9 — BSC haritası semantiği | Yüksek |
| C4 | B22 SOP türetimi (min(charge,discharge) limiti) | SPEC A5 | Düşük |
| C5 | Connector tick'in gerçek SimulatorTransport ile (registry üzerinden) testi | birim seviyede fake target yeterli; canlı K-C8 gözle kanıtlandı | Düşük |
