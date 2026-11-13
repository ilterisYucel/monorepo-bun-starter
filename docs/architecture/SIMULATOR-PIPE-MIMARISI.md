---
status: active
space: architecture
tags: [mimari, simulator, pipe, sim-lab, spec]
review_date: 2026-11-12
---

# Simulator Pipe — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ Approved (2026-11-12 — developer onayı). Test/implementasyon build modunda başlar.
> **Revizyon:** 2026-11-12 — R-1..R-4 (KAPANIŞ önerileri) uygulandı: kapsam, gerçekleşen davranışa hizalandı (port benimsemesi İleri İş; fider fail-fast → uyarı; mock default wiring ve hücre benzersizliği açık karar).
> **İlişkili:** [SIMULATORS-MIMARISI.md](./SIMULATORS-MIMARISI.md) (oturunca bu SPEC ile birleşir — A2),
> [../simulators/FIZIKSEL-SAHA-SIMULATORU.md](../simulators/FIZIKSEL-SAHA-SIMULATORU.md) (Plant/solver modelleri),
> [../simulators/MEVCUT-DURUM-VE-EKSIKLER.md](../simulators/MEVCUT-DURUM-VE-EKSIKLER.md) (BSC-PCS connector geçmişi).

## 1. Amaç ve Bağlam

**Sorun:** Fiziksel saha simülatöründe cihazlar arası bağlar bugün üç özel, hardcode
mekanizmayla kuruluyor:

- `Plant#physics` içinde gömülü kuplajlar (PCS↔BSC vDc/iReq iki geçişi, CB→bara, IMD→PCS
  izolasyonu, HVAC zon↔raflar) — yeni bir bağ türü yeni bir özel kod demek.
- `GridLinkBus` (MV→PCS enerjizasyon) ve `BmsLink` (BSC→PCS BMS bloğu) tek amaçlı kanallar —
  üçüncü bir kanal türü için üçüncü sözleşme yazılır.
- Transport katmanı yok: simülatörler servis içinde in-memory bağlı, ama servis dışında
  bağımsız üniteler birbirine bağlanamıyor (dökümandaki "protokol bazlı pipe" isteği).

Saha 3 katmanlıdır (istasyon → dal → konteyner) ve katmanlar arası etki sinyalleri vardır:
"Dal A'nın CB'si açık → yalnız Dal A etkilenir", "konteynerin DC şalteri açık → charge
komutu gitse de enerji akmaz", "2. istasyon standby → o istasyonun dalları pasif". Gelecek
manevralar (dal bazlı peak/şebeke satışı) aynı sinyal altyapısını gerektirir.

**Çözüm:** Cihazlar arası sinyal taşıma için **pipe kontratı**: bir veri kanalı + kontrol
flag'ları (energized/remote/mode/limit) taşıyan, transport'u değişebilen, karar vermeyen
saf taşıyıcı. Sayısal enerji dengesi (bara gerilimi/akım dağılımı, ısıl zon) solver'larda
kalır; solver'lar pipe katılımcısı olur ve site JSON'dan seçilir.

| Katman | Kapsam |
| :--- | :--- |
| dahil | Signal + pipe kontratı (son değer, transport değişebilir), mock fallback, cihaz portları, site JSON'dan wiring, istasyon/dal/konteyner sinyalleri, solver port kontratı + config'ten solver seçimi |
| hariç | Solver'ların sayısal içerikleri (Thevenin/lumped — Plant'te kalır), TcpTransport (A1), kolaylık simülatörleri değişikliği, Plant kuplajlarının toptan migrasyonu (kademeli — A3), manevra yürütme (EMS alanı) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
| :--- | :--- | :--- |
| K1 | (2026-11-12, kullanıcı) Pipe = veri kanalı + kontrol flag'ları taşıyan kontrat; **taşıyıcıdır, karar verici değildir** — bir sinyalin etkisi daima tüketici cihazın state machine'inde yaşar | "CB açık → şarj gitmez" kuralı pipe'da değil batarya modelinde |
| K2 | Transport değişebilir: `InMemoryTransport` (servis içi, bugün), `MockTransport` (bağlı yayıncı yoksa config default'u), `TcpTransport` (İleri İş — A1). Bağımsız ünite = yalnız mock default'larla çalışan simülatör | Servis içi + bağımsız ünite tek kontratla |
| K3 | Pull-based son değer okuma: yayıncı komutla yazar (`publish`), tüketici sorguyla okur (`read`); sinyaller immutable DTO; tek tick gecikmeli görünürlük determinizmi garanti eder | `GridLinkBus` önceliğiyle tutarlı; tick sırasından bağımsız |
| K4 | Kontrol sinyalleri (energized/remote/mode/limitler) pipe'dan; **sayısal enerji dengesi solver'dan**. Solver tipi site JSON'da seçilir; yeni proje/vendor = yeni solver modülü + registry satırı (SIMULATORS-MIMARISI K7 deseni) | Proje agnostik fizik: topoloji config'te, fizik solver modülünde |
| K5 | Mevcut `GridLinkBus` ve `BmsLink` korunur; `BmsLink` pipe kontratının ilk uyarlaması olur (basit transform'lu kanal). `Plant#physics` hardcode kuplajları kademeli taşınır (A3) | Regresyon yok; geçiş adım adım |
| K6 | Site katmanları (istasyon/dal/konteyner) pipe topolojisinin **ilk kanıt senaryosudur**: H04 CB açılınca yalnız Dal A üyeleri `energized:false` okur | Dal izolasyonu GWT ile sabitlenir (UC-3) |
| K7 | Elegant Object: `Signal` readonly; port API'leri komut (void) / sorgu (değer) ayrımında; mock default = Null-Object benzeri davranış; `ELEGANT-EXCEPTION` yalnız durum makinelerinde | AGENTS.md kurallarıyla uyum |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
| :--- | :--- | :--- |
| B1 | Fiziksel kuplajlar `Plant#physics` içinde hardcode (PCS↔BSC vDc/iReq, IMD→PCS, HVAC zon↔raflar) | `packages/simulators/src/physical/site/plant.ts#physics` |
| B2 | İki özel kanal sözleşmesi: enerjizasyon bus'ı ve BMS link'i — genel kontrat yok | `packages/simulators/src/grid-link/bus.ts#GridLinkBus` · `packages/simulators/src/physical/link/bms-link.ts#BmsLink` |
| B3 | Transport katmanı yok — servis dışında bağımsız simülatörler birbirine bağlanamaz | `packages/simulators/src/physical/link/bms-link.ts` (yalnız in-process) |
| B4 | Dal/istasyon seviyesinde genel sinyal yayını yok; enerjizasyon yalnız PCS'e özel | `packages/simulators/src/grid-link/bus.ts#isEnergized` (yalnız PCS sorgusu) |

## 4. Mimari

```
site JSON (topoloji + solver seçimi + mock default'ları)
                │ kurulum
   ┌────────────┼─────────────────────┐
   │            ▼                     │
   │        PipeSet                   │
   │   (adlandırılmış kanallar:       │
   │    son değer + transport)        │
   │            ▲ │                   │
   publish ─────┘ └───── read ────┐   │
   (komut)             (sorgu)    │   │
   │                             │   │
 cihaz modelleri              solver'lar
 (BSC/PCS/HVAC/CB/..)        (grid-chain/
  input/output port'ları      dc-bus/zone)
  + state machine             — terminal sinyallerini
    (kararlar burada)           okur, sonuç yayınlar
```

- **Port bildirimi model kodundadır** (tipli: hangi sinyal adları girilir/çıkar).
- **Bağlama site JSON'dadır**: hangi port hangi pipe adına bağlı, yayıncı yoksa mock default ne.
- **Solver ayrımı (K4):** kontrol sinyalleri pipe'dan, sayısal çözüm solver'dan; solver cihaz
  nesnelerine dokunmaz, yalnız uç sinyallerini okur/yayınlar.

## 5. Purity Kuralları (ZORUNLU)

1. Pipe karar vermez — transform dışında mantık taşımaz (K1).
2. Cihaz modelleri birbirini tanımaz — yalnız pipe adları üzerinden konuşur.
3. Solver'lar cihaz nesnelerine erişmez — yalnız pipe uçları (K4).
4. Kolaylık simülatörleri ve mevcut test sözleşmeleri değişmez (K5).
5. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Pipe Çekirdeği (Signal + Transport + Mock)

**Status:** ✅ Approved (2026-11-12)

**Kapsam:**
- dahil: `Signal` DTO (name/value/tick/source), `IPipeTransport` (publish/read), `InMemoryTransport`, `MockTransport` (default'lar site JSON'dan), `PipeSet` (adlandırılmış kanal kaydı)
- hariç: `TcpTransport` (A1), karmaşık computed mapping (BmsLink'te kalır)

**Akış:**
1. Site config'ten pipe adları + mock default'ları kurulur.
2. Yayıncı `publish` ile son değeri günceller (komut).
3. Tüketici `read` ile son değeri alır (sorgu); yayın yoksa mock default döner.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-1.1 | Pipe son yazılan sinyali saklar ve tüketiciye döner | AK-1.1 |
| FR-1.2 | Yayıncısız pipe mock default döner; default tanımsızsa "tanımsız sinyal" uyarısı basılır | AK-1.2 |
| FR-1.3 | Sinyaller immutable'dır — son değer okunup değiştirilse kanal tarihçesi bozulmaz | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** bir pipe **WHEN** yayıncı iki kez farklı değer yazar **THEN** tüketici son değeri okur
2. **AK-1.2 — GIVEN** yayıncısız pipe **WHEN** tüketici okur **THEN** config default'u döner; default yoksa uyarı basılır
3. **AK-1.3 — GIVEN** pipe'da sinyal **WHEN** tüketici değeri alıp üzerinde değişiklik yapar **THEN** kanaldaki değer değişmez

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-1.1 | Son değer saklama | unit (`pipe.test.ts`) | ⬜ |
| AK-1.2 | Mock fallback + uyarı | unit (`pipe.test.ts`) | ⬜ |
| AK-1.3 | Immutability | unit (`pipe.test.ts`) | ⬜ |

**T Görev Listesi:**
- [x] T-1: `Signal` + `IPipeTransport` + `InMemoryTransport` + `MockTransport` + `PipeSet` implementasyonu (JSDoc sözleşmeleriyle)
- [x] T-2: `pipe.test.ts` — son değer, mock fallback, immutability, uyarı dalı

**Edge Cases:**

| Durum | Davranış |
| :--- | :--- |
| Bilinmeyen pipe adı okunur | Tanımsız sinyal + uyarı (uyumlu profilde default; katı profilde ilk okumada compat kaydı) |
| Aynı pipe adına iki yayıncı | Son yazan kazanır + uyarı |

**Involved Files:**

| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `packages/simulators/src/physical/link/pipe.ts` | Pipe çekirdeği (yeni) |
| `packages/simulators/src/physical/link/pipe.test.ts` | Kanıt testleri (yeni) |

### 6.2 UC-2 — Cihaz Portları

**Status:** ✅ Approved (2026-11-12)

**Kapsam:**
- dahil: port API'si (`InputPort`: okuma/sorgu; `OutputPort`: yayın/komut), basit transform (ratio/offset/bit — `BmsLink#MappingEntry` alt kümesi), mock/fallback davranışı
- hariç: cihaz modellerinin port benimsemesi (İleri İş — model sınıfları henüz port bildirmiyor), karmaşık computed mapping (BmsLink'te kalır), port dışı doğrudan model erişimi (mevcut Plant akışı)

**Akış:**
1. Cihaz tick'inde input portlarından son değerleri okur.
2. State machine kararlarını verir (K1 — etki burada).
3. Output portlarına yeni durumunu yayınlar.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-2.1 | Port API'si hiçbir yayıncı yokken mock default/fallback ile eksiksiz çalışır (bağımsız ünite); cihaz modellerinin port benimsemesi İleri İş'tir | AK-2.1 |
| FR-2.2 | Port okuması tick sırasından bağımsızdır — aynı tick içinde okunan değer önceki yayından gelir (tek tick gecikme) | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** pipe'sız port tüketicisi (MockTransport + `fallback`) **WHEN** tick ilerler **THEN** mock/fallback değerlerle çalışır, hata vermez
2. **AK-2.2 — GIVEN** iki cihaz bir pipe ile bağlı **WHEN** A cihazı t tick'inde yayınlar **THEN** B cihazı aynı tick'te eski değeri, sonraki tick'te yeni değeri okur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-2.1 | Bağımsız ünite (port + stub) | unit (`port.test.ts`) | ⬜ |
| AK-2.2 | Deterministik gecikme | unit (`pipe.test.ts`) | ⬜ |

**T Görev Listesi:**
- [x] T-3: Port API'si (`InputPort`/`OutputPort`) + okuma/yazma sözleşmeleri (JSDoc)
- [x] T-4: Bağımsız ünite mock testi (port tüketicisi stub, pipe'sız)
- [x] T-5: Basit transform (ratio/offset/bit) + testi

**Edge Cases:**

| Durum | Davranış |
| :--- | :--- |
| Output portu bağlı değilken yayın | Sinyal kaydedilmez (bağlanınca başlar) — uyarısız |
| Transform sonucu aralık dışı | İşaretsiz 16-bit maskeleme (BmsLink davranışıyla aynı) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `packages/simulators/src/physical/link/port.ts` | Port bildirimi + API (yeni) |
| `packages/simulators/src/physical/link/port.test.ts` | UC-2 kanıtları (yeni) |

### 6.3 UC-3 — Saha Topolojisi Wiring (istasyon/dal/konteyner)

**Status:** ✅ Approved (2026-11-12)

**Kapsam:**
- dahil: site JSON'dan pipe kurulumu, katman sinyalleri (istasyon→dal→konteyner `energized`), grid solver katılımı (H01∧fider∧H02 mantığı solver'da — pipe yalnız taşır), PCS + konteyner yardımcılarının tüketimi, dal izolasyonu
- hariç: manevra yürütme (EMS alanı), enerji dengesi sayısal içeriği (UC-4)

**Akış:**
1. Site JSON `branches`/`containers` tanımlarından pipe adları + üyelikler kurulur (fider tanımı eksikse uyarı + varsayılan).
2. MV hücre pozisyonları grid solver'a girer (mevcut `GridLinkBus` semantiği).
3. Solver dal `energized` sinyalini pipe'a yayınlar.
4. Dal üyeleri tick'te okur; state machine'leri de-enerjili davranışı uygular.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-3.1 | Site JSON'dan istasyon/dal/konteyner pipe topolojisi kurulur; fider tanımı eksikse uyarı + varsayılan `energized:true` | AK-3.1 |
| FR-3.2 | Dal sinyali yalnız o dalın üyelerine ulaşır — diğer dallar etkilenmez | AK-3.2 |
| FR-3.3 | Konteyner içi bağ (DC şalter→bara) aynı mekanizmayla taşınır — CB açıkken şarj enerjisi akmaz | AK-3.3 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** GD-1 site dosyası (DEMO-MV-1; H04→Dal A konteyner 1–5, H05→Dal B 6–9) **WHEN** saha kurulur **THEN** dal pipe'ları + üyelikler kurulur; fider tanımı olmayan konteyner için uyarı basılır ve `energized:true` varsayılır
2. **AK-3.2 — GIVEN** saha çalışıyor **WHEN** H04 CB açılır **THEN** Dal A üyeleri (PCS-1..10 + konteyner 1–5 yardımcıları) `energized:false` okur ve de-enerjili davranır; Dal B üyeleri etkilenmez
3. **AK-3.3 — GIVEN** konteynerin DC şalteri açık **WHEN** PCS'e şarj komutu yazılır **THEN** batarya SOC'si değişmez (enerji akmaz)

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-3.1 | Topoloji kurulumu + eksik fider uyarısı | unit (`plant.test.ts` — wiring dalı) | ⬜ |
| AK-3.2 | Dal izolasyonu (H04 senaryosu) | unit (`plant.test.ts` — branch dalı) | ⬜ |
| AK-3.3 | CB→bara enerji kesintisi | unit (`plant.test.ts` — branch dalı) | ⬜ |

**T Görev Listesi:**
- [x] T-6: Site JSON wiring şeması (`branches`/pipes) + kurulum kodu
- [x] T-7: H04→Dal A `energized:false` GWT testi (dal izolasyonu)
- [x] T-8: CB→bara sinyali + "şarj komutu SOC değiştirmez" testi

**Edge Cases:**

| Durum | Davranış |
| :--- | :--- |
| Fider tanımı olmayan konteyner | Uyarı + varsayılan `energized:true` |
| İstasyon manevrası (tüm dallar) | Solver istasyon sinyalini yayınlar; dallar kendi pipe'larından alır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `packages/simulators/src/physical/site/site-config.ts` | Wiring şeması |
| `packages/simulators/src/physical/site/plant.ts` | Kurulum + grid solver katılımı |
| `packages/simulators/src/physical/site/plant.test.ts` | UC-3 kanıtları |
| `apps/sim-lab/sites/gd1.site.json` | Örnek dal tanımları |

### 6.4 UC-4 — Solver Katılımı (config'ten seçilebilir fizik)

**Status:** ✅ Approved (2026-11-12)

**Kapsam:**
- dahil: solver port kontratı (`IDcBusSolver` / `IGridSolver` / `IZoneSolver` — `step(dt, terminals) → results` sinyal değişimi), site JSON'da `solver` tip anahtarı, registry (builder deseni), mevcut Thevenin/lumped/grid-chain solver'larının pipe uçlarına bağlanması
- hariç: solver'ların sayısal modellerinin içeriği (Plant'te kalır — taşınmaz), yeni vendor solver modülleri (İleri İş), TcpTransport arkasında solver (A1)

**Akış:**
1. Site JSON'daki `solver` anahtarı registry'den çözülür (bilinmeyen tip fail-fast).
2. Solver terminal sinyallerini pipe'dan okur.
3. `step` sonuçlarını pipe'a yayınlar; cihazlar sonraki tick'te okur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-4.1 | Solver tipi site JSON'dan seçilir; bilinmeyen tip açılışta fail-fast | AK-4.1 |
| FR-4.2 | Solver yalnız pipe uçlarından beslenir — cihaz nesnelerine doğrudan erişmez | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** site JSON'da `dcBus.solver: "thevenin"` **WHEN** saha kurulur **THEN** registry'den çözülür ve DC bara solver'ı pipe'dan terminal okur; `solver: "bilinmeyen"` açılışta hata verir
2. **AK-4.2 — GIVEN** solver çalışıyor **WHEN** solver sonuç yayınlar **THEN** bağlı cihazlar sonraki tick'te güncel terminal değerlerini okur; solver cihaz nesnesine erişimi yoktur (kod inceleme)

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-4.1 | Solver seçimi + fail-fast | unit (`plant.test.ts` — solver dalı) | ⬜ |
| AK-4.2 | Uç izolasyonu | kod inceleme + unit | ⬜ |

**T Görev Listesi:**
- [x] T-9: Solver port kontratları + registry (JSDoc sözleşmeleriyle)
- [x] T-10: Mevcut grid-chain/dc-bus/zone solver'larının pipe uçlarına bağlanması (sayısal içerik Plant'te)
- [x] T-11: Solver seçimi + fail-fast testi

**Edge Cases:**

| Durum | Davranış |
| :--- | :--- |
| Solver yayını yokken | Cihaz mock terminal default'uyla ilerler |
| Solver kaynaklı sayısal sapma | Uyarı günlüğü (mevcut olay günlüğüne) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `packages/simulators/src/physical/link/solver-ports.ts` | Solver kontratları + registry (yeni) |
| `packages/simulators/src/physical/link/solver-ports.test.ts` | UC-4 kanıtları (yeni) |
| `packages/simulators/src/physical/site/plant.ts` | Solver uç bağlantısı |
| `packages/simulators/src/physical/site/plant.test.ts` | UC-4 kanıtları |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
| :--- | :--- |
| Bilinmeyen pipe adı okunur | Tanımsız sinyal + uyarı (mock default yoksa) |
| Yayıncısız pipe | Mock default (config'ten); default yoksa uyarı |
| Aynı ada iki yayıncı | Son yazan kazanır + uyarı |
| Bilinmeyen solver tipi | Açılış fail-fast (beklenmeyen hata kategorisi) |
| Fider tanımı eksik (wiring) | Uyarı (konteyner başına bir kez) + varsayılan `energized:true` |
| Transform aralık dışı | 16-bit maskelenir (BmsLink ile aynı) |
| TcpTransport kopması (A1) | Son değer + bayat sinyal bayrağı (taslak — A1'de kesinleşir) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
| :--- | :--- | :--- |
| SC-1 | H04→Dal A izolasyon senaryosu yeşil (AK-3.2) | `plant.test.ts` branch dalı |
| SC-2 | Bağımsız ünite (pipe'sız port tüketicisi) mock/fallback ile çalışır (AK-2.1) | unit |
| SC-3 | Mevcut `plant.test.ts` + `ems-read-path.test.ts` regresyonsuz yeşil kalır | `nx run simulators:test` |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
| :--- | :--- |
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | JSDoc sözleşmeleri (pipe/port/solver-port) + kırmızı testler (T-2/T-4/T-5/T-7/T-8/T-11) |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-11; değişen dosyalarda mutasyon ≥%80 |
| 4. REVIEW (GLM-5.3) | `SIMULATOR-PIPE-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
| :--- | :--- | :--- |
| A1 | `TcpTransport` (protokol: satır tabanlı JSON mu ikili mi; yeniden bağlanma politikası) | İleri İş — ilk servis-dışı bağlantı ihtiyacında ayrı karar |
| A2 | Bu SPEC'in `SIMULATORS-MIMARISI.md` ile birleştirilmesi | Kontrat oturduktan sonra (KAPANIŞ sonrası) |
| A3 | `Plant#physics` hardcode kuplajlarının kademeli migrasyonu (önce grid/branch sinyalleri UC-3, sonra PCS↔BSC/zon çiftleri) | Her adım ayrı onay kapısı — bu SPEC'te yalnız UC-3/UC-4 kapsamı |
| A4 | Solver registry'sinin yeni vendor solver'larına açılması | İlk somut proje ihtiyacında |
| A5 | Mock default'ların site JSON'a bağlanması (KAPANIŞ G3) | Açık — ilk site-seviyesi default ihtiyacında; şimdilik port `fallback` yeterli |
| A6 | `normalizeSiteSpec`'te fider hücre adı benzersizliği doğrulaması (KAPANIŞ G4/S5) | Açık — çok istasyonlu sahada zorunlu hale gelecek |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. `TcpTransport` + servis dışı bağımsız ünitelerin protokol pipe'larıyla bağlanması (A1).
2. Yeni vendor/proje solver modülleri (seri bara, sıvı soğutma vb.) (A4).
3. Cihaz modellerinin (fiziksel BSC/PCS/HVAC dahil) port benimsemesi — SIMULATOR-MODEL-BIRLESTIRME ile birlikte.
4. Site JSON'dan mock default / açık pipe bildirimi (A5).
5. Fider hücre adı benzersizliği doğrulaması (A6).

## 12. T Görev Özeti

| T-1 | Pipe çekirdeği (Signal/transport/mock/PipeSet) — UC-1 |
| T-2 | pipe.test.ts: son değer, mock, immutability, uyarı — UC-1 |
| T-3 | Port API'si (`InputPort`/`OutputPort`) + okuma/yazma - UC-2 |
| T-4 | Bağımsız ünite mock testi (port tüketicisi stub) — UC-2 |
| T-5 | Basit transform + testi — UC-2 |
| T-6 | Site JSON wiring şeması + kurulum — UC-3 |
| T-7 | H04→Dal A izolasyon GWT testi — UC-3 |
| T-8 | CB→bara + "şarj SOC değiştirmez" testi — UC-3 |
| T-9 | Solver port kontratları + registry — UC-4 |
| T-10 | Mevcut solver'ların pipe uçlarına bağlanması — UC-4 |
| T-11 | Solver seçimi + fail-fast testi — UC-4 |
