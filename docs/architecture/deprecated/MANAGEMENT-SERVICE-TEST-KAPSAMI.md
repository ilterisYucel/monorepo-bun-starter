---
status: active
space: architecture
tags: [test-kapsami, otomasyon, kural-motoru, management]
review_date: 2026-09-15
---

# Management Service — Test Kapsamı (Aşama 6/6)

> **Yaşayan çalışma dokümanı:** Test genişletileceği zaman üzerinde çalışılacak kaynak — boşluk listesi (§5) birincil girdidir. Test değişince bu doküman + `docs/roadmap/test-envanteri.md` birlikte güncellenir (AGENTS.md hibrit kural).
> Kapsanan modüller: `services/management-service/*` + `packages/platform/commands/*` + `packages/shared-types/src/automation-rule*` + ilgili refactor (`command-routes` K9 koruması).

## 1. CycleSnapshotStore — `cycle-snapshot-store.test.ts` (10 test)

| # | Durum | Koşul | Beklenen | Test ref |
|:--|:------|:------|:---------|:---------|
| 1 | Kayıt + okuma | record(deviceId, [t]) → snapshot | Değer adıyla okunur; unit + recordedAt taşınır | "record + snapshot: değer adıyla okunur" |
| 2 | Üzerine yazma | Aynı anahtara ikinci record (yeni now) | Yeni değer + yeni recordedAt | "yeni kayıt eskisini ezer" |
| 3 | TTL bayatlama | recordedAt + maxAgeMs aşımı | snapshot'ta YOK + deviceIds'ta YOK | "maxAgeMs aşan giriş snapshot'a girmez" |
| 4 | Bayat temizliği | snapshot sonrası ikinci snapshot | Depodan silinmiş — tutarlı boş görüntü | "bayat giriş depodan temizlenir" |
| 5 | Eksik anahtar | Olmayan cihaz/telemetri sorgusu | undefined | "olmayan cihaz/anahtar → undefined" |
| 6 | canonical erişim | tags.canonical="soc" | key "soc" VE "BSC SOC" ikisi de bulur | "canonical etiketiyle erişim" |
| 7 | canonical güncelleme | İkinci record canonical değeri değiştirir | canonical indeks yeni değeri döner | "canonical indeksi de yeni kayıtla güncellenir" |
| 8 | Boş depo | record yok | deviceIds boş | "boş store → boş snapshot" |
| 9 | Immutability | snapshot sonrası record | Dönen görüntü eski değeri tutar | "snapshot anlık görüntüdür" |
| 10 | Çok cihaz | 2 cihaz record | deviceIds ikisini de listeler | "çok cihaz: deviceIds tümünü listeler" |

## 2. RuleEvaluator — `rule-evaluator.test.ts` (16 test)

| # | Durum | Koşul | Beklenen | Test ref |
|:--|:------|:------|:---------|:---------|
| 1 | Kenar-tetik | TRUE snapshot × 2 evaluate | İlk döner, ikinci boş | "yükselen kenarda bir kez döner" |
| 2 | Yeniden yükseliş | TRUE → FALSE → TRUE (cooldown yok) | Yeni ateşleme | "düşüş sonrası yeniden yükseliş yeni kenardır" |
| 3 | Debounce sınırı | debounce 5000; t+4999 ve t+5000 | Sınır altı yok, sınırda ateşler | "debounce: süre dolmadan aktifleşme olmaz" |
| 4 | Debounce sıfırlama | Debounce sırasında düşüş → yeniden yükseliş | Tam süre yeniden gerekir | "debounce sırasında düşüş sayaç sıfırlar" |
| 5 | Cooldown bastırma | Fire → düşüş → t+1sn yükseliş (cooldown 5sn) | Bastırılır | "cooldown içinde yeni kenar bastırılır" |
| 6 | Cooldown sonrası | Fire → düşüş → t+6sn yükseliş | Ateşler | (5 ile aynı testin ikinci yarısı) |
| 7 | when.any | Tek koşul TRUE | Ateşler | "when.any: bir koşul sağlansa yeterli" |
| 8 | when.all | Bir koşul FALSE | Ateşlemez | "when.all: bir koşul false ise ateşleme yok" |
| 9 | enabled:false | Koşul TRUE | Hiç ateşlemez | "enabled: false kural hiç ateşlemez" |
| 10 | Seçici dışı cihaz | Değer seçilmeyen cihazda | Koşul FALSE | "device seçicisi hedef dışındaki cihazı yok sayar" |
| 11 | Çok cihaz OR | types=["bsc"], tek cihazda değer | Koşul TRUE | "koşul hedef sette en az bir cihazda sağlanırsa" |
| 12 | Veri yok | Boş snapshot | FALSE (bayat veriyle tetiklenmez) | "veri yok → koşul FALSE" |
| 13 | Tip uyuşmazlığı | gt op + string değer | FALSE | "sayısal op string değerde false" |
| 14 | eq | Sayısal eşitlik | TRUE | "eq sayısal eşitlikte çalışır" |
| 15 | Tekrarlı tick | Aynı snapshot × 2 | İkinci boş | "aynı snapshot ile ikinci çağrı boş döner" |
| 16 | Operatörler | gte/lt/lte/neq sınırları | Her biri doğru karar | "gte/lt/lte/neq operatorleri" |

## 3. ActionExecutor — `action-executor.test.ts` (16 test)

| # | Durum | Koşul | Beklenen | Test ref |
|:--|:------|:------|:---------|:---------|
| 1 | Ateşleme logu | execute(rule) | `auto_rule_fired` info, context.rule | "kural ateşleme logu" |
| 2 | Komut başarı | stop (validate+timeoutMs 2000) | executeAndWait(timeout 4000) + `auto_rule_action_ok` | "command aksiyonu başarı" |
| 3 | Timeout formülü | validate'siz komut | 3000 + 2000 = 5000 | "validate olmayan komutta timeout" |
| 4 | Job başarısız | executeAndWait success:false | Fail + `auto_rule_action_failed` (reason) | "command aksiyonu job başarısız" |
| 5 | Çözümleme hatası | device_not_found sonrası geçerli komut | İlk fail, ikinci ok (akış durmaz) | "command aksiyonu çözümleme hatası" |
| 6 | Zorunlu param | missing_param + notify | İlk fail, notify ok | "zorunlu param eksik command" |
| 7 | Log aksiyonu | config eventCode + level + message | Logger'a birebir | "log aksiyonu: config eventCode" |
| 8 | Logger yok | log aksiyonu logger'sız | console.warn fallback, ok sonuç | (7'nin ikinci yarısı) |
| 9 | Log hatası | logger.log reject | Fail; sonraki komut ok | "log aksiyonu logger hatası" |
| 10 | Notify | notify aksiyonu + logger | `auto_rule_<name>` warn logu, ok | "notify aksiyonu: eventCode" |
| 11 | Notify logger'sız | logger yok | Atlanır (ok + reason) | "logger yoksa notify ATLANIR" |
| 12 | Notify hatası | logger.log reject | Fail; akış devam | "notify logu hatası → fail" |
| 13 | Mq throw | executeAndWait reject | Fail; notify devam | "beklenmeyen mq throw" |
| 14 | Sonuç logu hatası | logger reject (komut ok) | Aksiyon sonucu DEĞİŞMEZ | "sonuç logu hatası aksiyon sonucunu değiştirmez" |
| 15 | Console fallback | level error/info, logger yok | console.error/info çağrılır | "console fallback: error ve info" |
| 16 | Sıra koruması | command+log+notify | Sonuç listesi aksiyon sırasında | "sonuç listesi aksiyon sırasını korur" |

## 4. DeviceCatalog + RuleConfigLoader — `device-catalog.test.ts` (7) + `rule-config-loader.test.ts` (9)

| # | Durum | Koşul | Beklenen | Test ref |
|:--|:------|:------|:---------|:---------|
| 1-7 | Seçici çözümü | yok/ids/types/ikisi/bilinmeyen/type'sız/id-yok | Birleşim, dedup, boş sonuç kuralları | device-catalog tüm testler |
| 8-11 | Kural yükleme | geçerli/yok/bozuk-json/boş-then/bilinmeyen-anahtar | Yükle veya ValidationError THROW | rule-config-loader loadRules testleri |
| 12-15 | Katalog üretimi | dizin tarama, bozuk dosya atlama, dizin yok, type'sız cihaz | Doğru girdi seti | rule-config-loader loadCatalog testleri |

## 5. ManagementService — `management-service.test.ts` (5 test)

| # | Durum | Koşul | Beklenen | Test ref |
|:--|:------|:------|:---------|:---------|
| 1 | Worker + kayıt | start → MANAGEMENT job | registerWorkerFor + snapshot'a kayıt | "start: MANAGEMENT worker" |
| 2 | runCycle | Snapshot + koşul sağlanmış | 1 kural ateşler, executor 1 kez; ikinci cycle 0 | "runCycle: koşul sağlanınca" |
| 3 | Tick döngüsü | fake timers 10s | Değerlendirme kendiliğinden çalışır | "tick döngüsü" |
| 4 | Tip filtresi | WS_BROADCAST job | Kaydedilmez (0 kural) | "worker yalnızca MANAGEMENT" |
| 5 | stop/health | stop × 2 + health döngüsü | close 1 kez; health running'e bağlı | "stop: döngü durur" + "health" |

## 6. Şema — `automation-rule.test.ts` (24 test)

Senaryo matrisi: geçerli dosya (all/any/ids+types/seçicisiz/opsiyonel alanlar), red vakaları (boş when/all, enum dışı op/level, string threshold, boş ids/types, boş then, bilinmeyen aksiyon, negatif süreler, strict anahtarlar, boş rules), çıktı tipi derleme kontratı. Tam liste: `docs/roadmap/test-envanteri.md` §9.

## 7. K9 Koruma — web-service `command-routes.test.ts` (12 test)

Refactor sonrası davranış koruması: 400 (zod/param), 404 (cihaz/komut), 200, 422, execute-multi parallel/sequential, GET commands, zamanlı stop audit (3). Tam liste: `docs/roadmap/test-envanteri.md` §3.

## 8. KAPSANMAYAN (boşluklar — genişletme girdisi)

| # | Boşluk | Neden açık | Öncelik |
|:--|:-------|:-----------|:--------|
| B1 | `RuleEvaluator`'da aynı kuralın snapshot İÇİNDE birden çok ateşlenmesi (tek cycle'da) | Durum makinesi kural başına 1 kenar üretir — tanım gereği; test senaryosu zaten "ikinci çağrı boş" ile kapanır | — |
| B2 | `CycleSnapshotStore` eşzamanlı record (aynı tick'te çift job) | BullMQ concurrency 5 — race pratikte yok; tek iş parçacığı JS | Düşük |
| B3 | ManagementService `runCycle` executor hata yayılımı (allSettled sonrası log yok) | allSettled bilinçli yutuyor; konsol uyarısı döngüde var ama runCycle içi sessiz | Orta |
| B4 | Komut aksiyonunda `executeAndWait` İPTALİ (service stop sırasında bekleyen job) | MVP'de timeout tavanı yeterli; graceful shutdown iyileştirmesi | Düşük |
| B5 | Kural başına durum kalıcılığı — restart sonrası dedup state sıfırlanır (bilinçli: yeni gözlem dönemi, alarm deseniyle aynı) | SPEC §6 bilinçli karar; test eklenebilir (restart = yeni instance) | Düşük |
| B6 | `types` çözümünde device config dosya adı ≠ deviceId uyuşmazlıkları | DeviceConfigFileSource dosya adından değil JSON `deviceId` alanından okur | — |
| B7 | SMTP/SMS bildirim sink'leri canlı doğrulaması | Faz 1 (S4 sapması) | Faz 1 |
| B8 | Field/boss tier'da çalışma doğrulaması | SPEC §9 — MVP container only | Faz 1 |
| B9 | E2E (Playwright/curl) — servis seviyesi akış testi | K7 gözle kanıtlandı; otomatik E2E spec'i eklenebilir | Orta |
