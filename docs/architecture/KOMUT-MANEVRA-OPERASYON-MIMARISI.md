# Komut, Manevra, Operasyon — Mimari Tasarım (SPEC)

> Kaynak girdi: yeni Komut/Manevra/Operasyon spesifikasyonu (developer talebi).
> İlişkili dökümanlar: `MANEVRA-SISTEMI-MIMARISI.md` (mevcut komut/manevra kılavuzu),
> `WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md` (çapraz sistem taşıma), `KURAL-MOTORU-V2-MIMARISI.md`
> (otomatik tetikleme). Bu SPEC mevcut tasarımı değiştirir; çelişkide kaldığı yerde bu döküman
> üstündür.
>
> **Durum: GÖZDEN GEÇİRME BEKLİYOR** — onay alınmadan geliştirme başlamaz.
>
> **REV.02 (2026-09-17):** dinamik cihaz hedefleme (§5.1), interlock sözleşmesi (§7.3),
> admin tanım arayüzü (§11). REV.01'e eklemelerdir; diğer bölümler değişmedi.
>
> **REV.03 (2026-09-17):** §6.1 — Field Charge/Discharge operasyon kararı (çift sistem:
> konteyner BSC + saha Wattox PCS); **REV.03.1:** K12 düzeltmesi — uzak adımlar
> `bsc_prepare` (hazırlık), güç param'ı YALNIZCA yerel PCS adımında (BSC'de charge komutu
> YOK); UC-1/UC-4/UC-6 bu sözleşmeye göre düzeltildi.

## İçindekiler

1. Amaç ve Kapsam
2. Mevcut Durum — Spesifikasyonla Kıyas Matrisi
3. Hedef Mimari — Üç Katmanlı Varlık Hiyerarşisi
4. Yeni Bileşenler
5. Manevra Kaydı (`maneuvers.json`)
6. Operasyon Kaydı (`operations.json`)
7. Rollback Sözleşmesi
8. Operasyon Durum Makinesi ve Kalıcılık
9. Sonuç Yayılımı
10. Timer Genelleştirmesi
11. Admin Tanım Arayüzü (REV.02)
12. Kullanım Senaryoları (Use-Case)
13. Kabul Kriterleri ve Faz Görev Listesi
14. Kapsam Dışı (YAGNI)

---

## 1. Amaç ve Kapsam

Bu doküman; komut (command), manevra (maneuver) ve operasyon (operation) hiyerarşisinin
sunucu tarafında **birinci sınıf varlık** olmasını tanımlar. Bugün:

- **Komut** sunucuda birinci sınıftır (config `commands` + `CommandJobBuilder` + BullMQ job).
- **Manevra** yalnızca frontend kataloğudur (`apps/container-web/src/features/control/maneuvers.ts`
  `MANEUVERS`), sunucu tarafında varlığı YOKTUR — kural motoru manevra referans edemez,
  state/kalıcılık yoktur, rollback kullanıcı tıklamasına bağlıdır.
- **Operasyon** (çok sistemli) YOKTUR.

Hedef: üçü de config ile tanımlanır (`maneuvers.json`/`operations.json`), manuel (UI/API) veya
otomatik (kural motoru) tetiklenir, tek bir yürütücüden geçer, durumu kalıcıdır ve
denetlenebilir (TamperLogger audit).

## 2. Mevcut Durum — Spesifikasyonla Kıyas Matrisi

| Spesifikasyon Maddesi | Mevcut Durum | Karar |
|:---|:---|:---|
| Komut bir aygıtı hedefler | ✅ `CommandDeviceJob.deviceId` (`packages/shared-types/src/job.ts:26-52`) | Değişiklik yok |
| Aygıt herhangi bir protokolle konuşabilir; ortak kontrat | ✅ **Zaten var**: `IDevice` (`packages/shared-types/src/device-interface.ts:9-15`, `write`/`writeAtomic?`); device-service `device-factory.ts:10-14` protokolden bağımsız `IDevice` üretir (`ModbusDevice | CANBusDevice | MQTTDevice`). Job seviyesi de protokol-nötrdür (`telemetries: TelemetryData[]`). | Değişiklik yok. **Not:** CANbus/MQTT stub'ları gerçekleşince `IDevice.write/writeAtomic` implemente etmelidir; komut hattına dokunulmaz. |
| Konfigde isimlendirilmiş işlem | ✅ config `commands` bölümü + `CommandJobBuilder` (`packages/platform/commands/src/command-job-builder.ts`) | Değişiklik yok |
| İsimsiz, doğrudan adımlar | ✅ `commandStepSchema` `telemetries` fallback'i (`services/web-service/src/presentation/routes/command-routes.ts:93-104`) | Değişiklik yok |
| Adımlar paralel/sıralı | ✅ `POST /api/commands/execute-multi` `mode: parallel|sequential` (`command-routes.ts:226-242`) | Değişiklik yok |
| Adım hatasında rollback | ⚠️ Yalnızca cihaz içi: `ModbusDevice.writeAtomic` (`packages/core/src/modbus/device.ts:328-450`). Manevra düzeyinde rollback = frontend manuel buton (`ManeuverPanel.tsx:136-171`). | **Yeni:** §7 rollback sözleşmesi |
| Manevra: 1+ komut, 1+ cihaz | ⚠️ Frontend `MANEUVERS` kataloğu (18 manevra) + `execute-multi` | **Yeni:** §5 sunucu kaydı |
| Manevra komutları paralel/sıralı | ✅ `mode` alanı (frontend'de) | Sunucuya taşınır (§5) |
| Manevra hatasında rollback | ❌ Otomatik yok | **Yeni:** §7 |
| Operasyon: 1+ komut VEYA manevra, çok sistem | ❌ Yok | **Yeni:** §6 + §9 |
| Operasyon paralel/sıralı | ❌ | **Yeni:** §6 |
| Operasyonda birim hatasında rollback | ❌ | **Yeni:** §7 |
| Manuel veya otomatik tetikleme, config ile | ⚠️ Otomatik: kural motoru YALNIZCA tek komut aksiyonu bilir (`automation-rule.ts:102-127`); manevra/operasyon aksiyonu yok | **Yeni:** `KURAL-MOTORU-V2-MIMARISI.md` §3 |
| Kural evaluator: "x cihazı y register > değer → komut" | ✅ **Zaten var**: `RuleEvaluator` (`management-service/src/rule-evaluator.ts`), op'lar gt/gte/lt/lte/eq/neq, debounce/cooldown | Değişiklik yok (aksiyon genişletmesi ayrı spec) |

**Sonuç:** Komut katmanı tamamdır; değişiklik yok. Manevra sunucuya taşınır; operasyon
yeni kurulur; ikisi de mevcut komut hattını (`execute-multi`) yeniden kullanır.

## 3. Hedef Mimari — Üç Katmanlı Varlık Hiyerarşisi

```
OPERASYON   (çok sistem)        operations.json → OperationExecutor (web-service, field/boss tier)
   │ adım = { manevra | komut zinciri } + hedef sistem
MANEVRA     (tek sistem, 1+ cihaz) maneuvers.json → ManeuverRegistry + aynı executor
   │ adım = CommandStep (komut veya ham telemetri)
KOMUT       (tek cihaz)         config commands + CommandJobBuilder → COMMAND_DEVICE job → IDevice.write
```

- **Komut**: tek `deviceId`; config'de isimli (`CommandConfig`) veya ham adımlar. Değişmez.
- **Manevra**: tek SİSTEM içinde 1+ komut; `mode`, `onFailure`, `rollbackSteps`.
- **Operasyon**: 1+ adım; her adım ya yerel (bu sistemde bir manevra/komut zinciri) ya da
  uzak (adı verilen sistemde bir manevra — §6). Sıralı/paralel, `onFailure`, adım-başı rollback.

Yürütme birleşik akış:

```
UI / Kural / Boss kontrol mesajı
  → web-service: /api/maneuvers/:name/execute | /api/operations/:name/execute
  → OperationExecutor (packages/platform/commands)
      ├─ yerel adım  → POST /api/commands/execute-multi mantığı (komut hattı) → BullMQ → device-service → IDevice.write
      └─ uzak adım  → IContainerCommandChannel benzeri tünel kanalı (WS-TUNNEL spec §5)
  → durum: operation_runs (PG) + TamperLogger audit
  → sonuç: isteyene dönüş + boss'a event frame (fan-out)
```

## 4. Yeni Bileşenler

| Bileşen | Yer | Görev |
|:---|:---|:---|
| `ManeuverConfigFile`/`OperationConfigFile` şemaları | `packages/shared-types/src/commands/` (mevcut `maneuver.ts` genişler) | Strict zod şemaları; yazım hatası → açılışta fail-fast (rules.json deseni) |
| `ManeuverRegistry` | `packages/platform/commands/src/` | `maneuvers.json`/`operations.json` + DB kayıtlarını birleştirir (hibrit — §11.1), doğrular, isimle çözer (`Result<T,E>`). Davranış yok — yalnızca kayıt. |
| `OperationDefStore` (adaptör: PG) | web-service `src/infrastructure/` | `operation_defs` tablosu — admin tanımlı manevra/operasyon kayıtları (§11). |
| Manevra/operasyon CRUD rotaları | web-service `presentation/routes/` | Tanım YÖNETİMİ (`GET/POST/PUT/DELETE /api/maneuvers` + `/api/operations`) — yürütme rotalarından ayrı. RBAC: yalnız `admin` (§11.2). |
| `OperationExecutor` | `packages/platform/commands/src/` | Manevra/operasyon adımlarını paralel/sıralı yürütür; rollback (§7); sonuç toplar. Bağımlılıkları DI: `IMessageQueue`, `CommandJobBuilder`, `ICommandChannel` (yerel), `IRemoteCommandChannel` (tünel), `IOperationRunStore`, `TamperLogger`. |
| `IOperationRunStore` (adaptör: PG) | web-service `src/infrastructure/` | `operation_runs` tablosu (§8). |
| REST rotaları | web-service `presentation/routes/` | `GET /api/maneuvers`, `POST /api/maneuvers/:name/execute`, `GET/POST /api/operations*`, `GET /api/operations/runs/:id`. RBAC: `admin|teknik` (mevcut `/api/commands` kuralı) + iç token (management-service). Tanım yönetimi uçları §11'de (admin-only). |
| Kural aksiyonları | `shared-types/src/automation-rule.ts` | `maneuver`/`operation` aksiyon tipleri — ayrıntı `KURAL-MOTORU-V2-MIMARISI.md`. |

**Yerleşim kuralı:** `packages/platform/commands` GD-PMS'ye özgüdür (JobType, cihaz komutları);
`packages/core`'a taşınmaz. Executor'ın **HTTP bilgisi YOKTUR** — rotalar ince sarmalayıcıdır
(mevcut `command-routes.ts` deseni). Wire-up `web-service/src/config/container.ts` içinde
awilix ile; management-service executor'ı KULLANMAZ — web-service REST'ini iç token ile
çağırır (mevcut `x-internal-token` deseni, `field-container-commands.ts:66-81`).

## 5. Manevra Kaydı (`maneuvers.json`)

Tier config dizininde (`services/web-service/deployment/config*` gibi; rules.json deseni —
`management-service/deployment/config-field/rules.json`). Frontend kataloğu (`MANEUVERS`,
`FIELD_MANEUVERS`) bu dosyaya MİGRE EDİLİR; UI `GET /api/maneuvers` ile okur.

```jsonc
// maneuvers.json
{
  "maneuvers": [
    {
      "name": "bsc_prepare",            // konteyner HAZIRLIK manevrası (K12: güç param'ı YOK)
      "label": "BSC Hazırlık",
      "description": "Kontaktörleri kapat + start — güç komutu PCS'tedir",
      "mode": "parallel",
      "onFailure": "stop",            // stop | continue | rollback (§7)
      "steps": [
        { "deviceId": "BSC-1", "command": "close_contactors" },
        { "deviceId": "BSC-1", "command": "start" }
      ],
      "rollbackSteps": [
        { "deviceId": "BSC-1", "command": "stop" }
      ],
      "ui": {                          // OPSİYONEL — yalnızca sunum meta verisi
        "inputs": [],
        "timer": false,
        "hidden": true
      }
    },
    {
      "name": "pcs_charge",            // yerel PCS şarj (S06 NEGATİF — PCS-WATTOX)
      "label": "PCS Şarj",
      "description": "PCS'lere eşit güç dağıtımıyla şarj",
      "mode": "parallel",
      "onFailure": "stop",
      "steps": [
        { "deviceTypes": ["pcs"], "command": "charge", "params": { "powerKw": "{{divideTotal}}" } }
      ],
      "rollbackSteps": [
        { "deviceTypes": ["pcs"], "command": "stop" }
      ],
      "ui": {
        "inputs": [
          { "name": "powerKw", "type": "number", "min": 0, "max": 3568, "default": 50, "label": "Güç (kW)" }
        ],
        "timer": true,
        "transform": "divideTotal",    // OPSİYONEL adlandırılmış transform — bkz. not
        "hidden": false
      }
    }
  ]
}
```

- `steps` = mevcut `CommandStep` (`shared-types/src/commands/command.ts:27-32`): `command`
  (config isimli) VEYA `telemetries` (ham) + `params`. Hedef alanı REV.02'de seçiciye
  genişledi — §5.1.
- `ui.transform`: adlandırılmış transform listesi sunucuda uygulanır; şimdilik tek girdi
  `divideTotal`'dır (saha güç dağıtımı — §5.1). Adlandırılmamış özel transformlar
  frontend'de params hesaplaması olarak kalır (yürütücüye ham params gider).
- `timer: true` → adıma `timer` alanı eşlik eder (§10).
- Kayıt DAVRANIŞ taşımaz: `mode/onFailure/rollbackSteps` yürütücünün girdisidir.

### 5.1 Dinamik cihaz hedefleme (REV.02)

Saha kataloğu (`buildFieldManeuvers`) adımları runtime'da online PCS listesinden üretir —
statik `deviceId` bunu ifade edemez (REV.01 FL-02: "online+müsait PCS sayısına bölünür",
grup seçimi). `CommandStep` hedef alanı seçiciye genişler:

```ts
interface CommandStep {
  deviceId?: string;      // tek hedef (mevcut kullanım)
  deviceIds?: string[];   // açık liste (grup seçimi)
  deviceTypes?: string[]; // tip seçici (device config üst seviye `type` alanından)
  command?: string;
  telemetries?: Array<{ name: string; value: unknown; unit?: string }>;
  params?: Record<string, unknown>;
}
// Zod refine: deviceId | deviceIds | deviceTypes — TAM BİRİ zorunlu.
```

- **Çözümleme zamanı:** yürütme başlangıcında (kayıt yüklemede DEĞİL). Yürütücü
  web-service `devices` tablosundan çözer (`RealtimeSnapshotSource` deseni).
- **Müsaitlik filtresi:** `deviceTypes` çözümü yalnızca `status='online'` + müsait
  cihazları içerir (unavailable/fault/bakım hariç — REV.01 FL-02 kuralı). `deviceIds`
  çözümü aynı filtreden geçer; çözüm boşsa adım BAŞARISIZ sayılır (kademeli bozulma).
- **Grup kısıtı:** yürütme isteği opsiyonel `deviceIds?: string[]` taşır (UI grup
  seçimi) — verilirse kayıt seçicilerinin çözümü bu listeyle KESİŞTİRİLİR; verilmezse
  tam çözüm kullanılır. Frontend artık adım ÜRETMEZ (`stepsFor`/`resolveSteps` kalkar).
- **Transform sunucuda:** adım sayısı ancak çözümleme sonrası bilindiği için
  `divideTotal` (santral gücü → çözülen adım sayısına eşit bölme) yürütücüde uygulanır;
  adlandırılmış transform listesi şimdilik yalnızca `divideTotal`'dır. Diğer özel param
  hesapları frontend'de kalır.
- **Rollback ile etkileşim:** kompanzasyon adımları aynı seçicileri kullanır; yalnızca
  BAŞARIYLA çalışan adımların çözülen hedefleri kompanse edilir (§7.2).

## 6. Operasyon Kaydı (`operations.json`)

```jsonc
// operations.json
{
  "operations": [
    {
      "name": "islanding_recovery",
      "label": "Ada Modu Recovery",
      "description": "Saha PCS standby + konteyner BSC stop, sonra şarj",
      "mode": "sequential",
      "onFailure": "rollback",
      "steps": [
        { "maneuver": "pcs_standby" },                       // yerel (bu sistem)
        { "system": "container-3", "maneuver": "bsc_stop" }, // uzak: tünel
        { "system": "local", "commands": [                   // ham komut zinciri (isimsiz)
            { "deviceId": "PCS-1", "command": "charge", "params": { "powerKw": 100 } }
          ],
          "mode": "parallel" }
      ],
      "rollback": [
        { "maneuver": "pcs_stop" },
        { "system": "container-3", "maneuver": "bsc_start" }
      ]
    }
  ]
}
```

**Adım şeması** (`OperationStep`, discriminant union):

```ts
type OperationStep =
  | { maneuver: string; params?: Record<string, unknown> }          // yerel manevra
  | { commands: CommandStep[]; mode?: "parallel"|"sequential";
      onFailure?: "stop"|"continue"; params?: Record<string, unknown> } // yerel ham zincir
  | { system: string; maneuver: string; params?: Record<string, unknown> }; // uzak manevra
```

- `system: "local"` açık yazılabilir; yoksa varsayılan yereldir.
- `system` değeri TÜNEL peer kimliğidir (`containerId`) — çözümleme `IContainerProxy`/`FieldRegistry`
  kayıt defterinden yapılır; bilinmeyen sistem → adım başarısız (kademeli bozulma).
- `rollback` (üst seviye) `onFailure: "rollback"` seçildiğinde çalışan kompanzasyon adımlarıdır (§7).
- `params` şablon çözümlemesi: `{{param}}` yalnızca komutlar içinde (CommandJobBuilder mevcut
  davranışı); manevra/operasyon param'ları adımlara AYNEN aktarılır.

**Manevra mı operasyon mu?** Tek sistemde 1+ cihaz → manevra. Birden fazla sistemde işlem
veya sistemler arası koordinasyon → operasyon. Aynı motor çalıştırır; operasyon = manevranın
süperseti (manevra = tek sistemli operasyon). Fark, uzak adım desteği ve kalıcılık
önceliğidir; manevralar da `operation_runs`'a yazılır (tip sütunu `maneuver|operation`).

### 6.1 Field Charge/Discharge = Operasyon (karar — 2026-09-17)

Field FL-02 Şarj/Deşarj **operasyon** olarak kurgulanır (developer kararı) — iki ayrı
sistemde komut çalıştırır: konteyner BSC (uzak, tünel) + saha Wattox PCS (yerel).
`mode: "sequential"`, `onFailure: "rollback"`:

```jsonc
{ "name": "field_charge", "label": "Saha Şarj", "mode": "sequential", "onFailure": "rollback",
  "steps": [
    { "system": "container-1", "maneuver": "bsc_prepare" },    // uzak: kontaktör + start hazırlığı
    { "system": "container-2", "maneuver": "bsc_prepare" },
    { "maneuver": "pcs_charge", "params": { "powerKw": 200 } } // yerel — S06 NEGATİF (PCS-WATTOX)
  ],
  "rollback": [
    { "maneuver": "pcs_stop" },
    { "system": "container-1", "maneuver": "bsc_stop" },
    { "system": "container-2", "maneuver": "bsc_stop" }
  ] }
```

**Sözleşme notları:**
- **GÜÇ KOMUTU KONTEYNERE ASLA GİTMEZ (K12):** BSC'de charge/discharge komutu YOKTUR
  (Flex Rev AF'de 0x000B kaldırıldı — güç PCS tarafından kontrol edilir). Uzak adımlar
  yalnızca HAZIRLIK manevrasıdır (`bsc_prepare` = `close_contactors` + `start` —
  `KONTEYNER-MANEVRA-KATALOGU-REV03` §2.10); `powerKw` param'ı YALNIZCA yerel PCS
  adımına gider (S06 ← −powerKw).
- **Adım sırası kritik:** konteyner hazırlığı (kontaktörler) PCS setpoint'ten ÖNCE gelir —
  `sequential` mode bunu garanti eder; tersi PCS'i boşta güç basar.
- **Terminal anlam:** `completed` = komutlar gönderildi + doğrulandı. Şarj fiziksel olarak
  yeni komuta (FL-03 Idle) kadar sürer — "completed" ≠ "şarj bitti" (UI/kural semantiği).
- **Rollback tünel kopuğunda best-effort** (§7.2) — setpoint sıfırlama yerel (PCS) olduğu
  için kritik taraf her zaman kurtarılabilir; uzak kompanzasyon `rollback_step_failed
  (system_unreachable)` düşerse operatör manuel tamamlar.
- **Dağıtım:** santral gücü konteyner başına adım `params`'ı olarak AÇIK geçilir (UI/admin
  tanımı böler — UC-6 deseni). `divideTotal` çapraz-sistem operasyon adımlarında UYGULANMAZ
  (§5.1 yalnızca manevra içi seçici çözümlemesi için); ileride ihtiyaç doğarsa ayrı
  değerlendirilir.

## 7. Rollback Sözleşmesi

`onFailure` değerleri (manevra ve operasyonda ortak):

| Değer | Davranış |
|:---|:---|
| `stop` (varsayılan) | İlk başarısız adımda kalan adımlar ATLANIR; geri alma YOK. (mevcut davranış) |
| `continue` | Başarısız adımdan sonra devam; sonuç listesinde hata raporlanır. |
| `rollback` | Başarısızlıkta `rollbackSteps`/`rollback` kompanzasyonu çalışır (§7.2); sonuç `rolled_back`. |

### 7.1 Rollback adımlarının seçimi (öncelik sırası)

1. Operasyon: üst seviye `rollback` listesi.
2. Manevra: `rollbackSteps` (mevcut alan).
3. Yoksa ve `onFailure: "rollback"` istenmişse → kayıt YÜKLEME anında reddedilir
   (fail-fast; sessiz "rollback yok" YASAK).

### 7.2 Rollback yürütme kuralları

- Yalnızca **başarıyla çalışan** adımların kompanzasyonu yürütülür (başarısız/kısmi adımlar
  için ters işlem anlamsızdır; kısmi adımın cihaz içi geri alması zaten `writeAtomic`
  garantisindedir — `device.ts:414-446`).
- Sıralı operasyonda: ters sırada; paralelde: aynı `mode` ile.
- Kompanzasyon **best-effort**: bir kompanzasyon adımı başarısız olursa kayda geçer,
  diğer kompanzasyon adımları devam eder (kademeli bozulma — `action-executor.ts:45-46`
  sözleşmesinin aynısı).
- Audit: `operation_rolled_back` (warn) + adım başına `rollback_step_ok/failed`.
  Cihaz içi komut audit'i zaten fail-closed'dur (`device-service.ts:588-607`) — manevra
  rollback'i cihaz audit'ini AŞMAZ.
- Çapraz sistem rollback: uzak adımın kompanzasyonu aynı tünel kanalından gider; tünel
  kopuksa kompanzasyon `rollback_step_failed (system_unreachable)` olarak kaydedilir —
  **otomatik yeniden deneme YOKTUR** (operatör manuel tamamlar; bu kasıtlı bir limit).

### 7.3 Interlock sözleşmesi (REV.02)

Güvenlik engelleyicileri (REV.01 §4: I-1 toprak bıçağı, I-2 kalibrasyon süre aşımı,
I-3 B09/B10 limitleri, I-4 motorsuz kesici) bu hiyerarşide **adım reddi** olarak çalışır:

- Interlock değerlendirmesi komut doğrulama katmanındadır (web-service komut ön-kontrolü —
  mevcut command-routes deseni). Yürütücü interlock BİLMEZ; reddi "adım başarısız" olarak
  görür ve `onFailure` sözleşmesini uygular (stop/continue/rollback).
- UI engelleri (I-4 manuel talimat, I-1 kart pasifleştirme) sunucu reddinin kullanıcıya
  yansımasıdır — yürütme garantisi DEĞİLDİR; sunucu her durumda fail-closed reddeder.
- Interlock verisi eksikse (örn. MV kesici konumu — REV.01 G-1) ilgili interlock DEVRE
  DIŞIDIR; cihaz config'i gelince doğrulama katmanına eklenir (yeni doğrulama kuralı +
  config — yürütücü kodu değişmez).
- Audit: interlock reddi `command_interlock_rejected` (warn; adım kimliği + interlock
  kodu) olarak basılır.

## 8. Operasyon Durum Makinesi ve Kalıcılık

Durum makinesi: `running → completed | failed | rolled_back` (terminal). İptal YOKTUR
(v1 kapsamı — §14).

```
operation_runs
  id           uuid PK
  kind         'maneuver' | 'operation'
  name         text (kayıt adı)
  trigger      'manual' | 'rule:<ruleName>' | 'boss:<traceId>'
  status       'running' | 'completed' | 'failed' | 'rolled_back'
  steps        jsonb  (tanım + parametreler + adım sonuçları)
  started_at   timestamptz
  finished_at  timestamptz
  created_by   text (kullanıcı / system / rule)
  trace_id     text
```

- **Fail-closed başlangıç:** `running` satırı INSERT edilemezse yürütme REDDEDİLİR
  (kalıcılıksız çapraz sistem işlem yürütülmez — güvenlik sınırı).
- **Fail-closed bitiş:** terminal durum UPDATE edilemezse TamperLogger audit'e
  `operation_state_update_failed` (error) basılır; çalıştırıcı yine de sonucu döndürür
  (aksiyon zaten gerçekleşmiştir — session-gateway fail-closed'unun aksine işlem tersine
  çevrilemez).
- Audit olayları (TamperLogger, category audit): `operation_started`, `operation_completed`,
  `operation_failed`, `operation_rolled_back`, `rollback_step_ok`, `rollback_step_failed`.
- Okuma: `GET /api/operations/runs/:id` + son N çalıştırma listesi.

## 9. Sonuç Yayılımı

Karar: **orkestratör fan-out + tünel event frame'leri — pub/sub YOK** (gerekçe:
`WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md` §4.4).

- İsteyen (UI/kural/boss) doğrudan senkron/async sonucu alır (HTTP yanıtı veya
  `operation-result` kontrol mesajı).
- Diğer sistemlerin GÖZLEMLENEBİLİRLİĞİ: `operation_started/completed/failed/rolled_back`
  audit olayları mevcut `event` frame mekanizmasıyla (`UplinkEventRelay`) boss'a akar —
  sistem değişikliği gerekmez.
- Sistem içi canlı yayın ihtiyacı doğarsa mevcut `WS_BROADCAST` job tipi kullanılır;
  yeni mekanizma kurulmaz.

## 10. Timer Genelleştirmesi

Mevcut hack: `params._durationSeconds` + sabit `Request = "Stop (timer)"` job'ı
(`command-routes.ts:189-219`) — BSC'ye özel, audit'i eksik, genelleştirilemez.

Yeni: `CommandStep` opsiyonel `timer` alanı:

```ts
{ deviceId: "BSC-1", command: "charge", params: { powerKw: 50 },
  timer: { durationMs: 60000, stopCommand: "stop" } }  // stopCommand OPSİYONEL, varsayılan "stop"
```

- Yürütücü, ana komut BAŞARILI olduktan sonra `stopCommand`'ı (config'den çözümlenen,
  parametresiz) `durationMs` delay ile planlar (BullMQ `delay` — mevcut mekanizma).
- Planlama best-effort + audit (`timer_scheduled`/`timer_schedule_failed`) — mevcut
  `logTimerSchedule` deseni korunur ama BSC register adı KALKAR.
- Timer komutları manevra/operasyon bağlamında da çalışır (UI'daki "Zamanlı" kutusu
  `timer.durationMs` üretir).
- Frontend'de `_durationSeconds` üretimi kaldırılır; `timer` alanı manevra kaydında
  `"timer": true` + UI girişiyle doldurulur.

## 11. Admin Tanım Arayüzü (REV.02)

Saha admin'leri sahaya özgü manevra/operasyonları arayüzden tanımlar ve yönetir
(ör. 2 konteyner + PCS'leri arbitraj, 3 konteyner başka bir iş). Kayıtlar artık yalnızca
tier config dosyası DEĞİLDİR — dosyalar bootstrap/varsayılandır.

### 11.1 Hibrit kayıt deposu

- `ManeuverRegistry` çözümleme sırası: **DB kaydı > dosya kaydı**. Dosya
  (`maneuvers.json`/`operations.json`) A3 migrasyon çıktısını taşır; DB kayıtları admin
  tanımlarıdır.
- DB: `operation_defs` tablosu — `name` PK, `kind` ('maneuver'|'operation'), tanım
  `jsonb` (kayıt şemasıyla birebir), `enabled`, `updated_by`, `updated_at`, `created_at`.
  `OperationDefStore` adaptörü (web-service infrastructure).
- Dosyanın fail-fast yüklemesi aynen korunur (bozuk dosya → servis açılmaz); DB kayıtları
  persist anında aynı strict zod şemalarıyla doğrulanır (bozuk tanım → 400, kaydedilmez).

### 11.2 CRUD rotaları (tanım YÖNETİMİ — yürütmeden ayrı)

- `GET/POST/PUT/DELETE /api/maneuvers` + `/api/operations` — **yalnız `admin`** (Bearer).
  Yürütme rotaları (`:name/execute`) admin|teknik + iç token olarak kalır.
- Silme = soft: `enabled: false` (UC-5 bakım penceresiyle aynı bayrak; audit zinciri
  korunur). `PUT` ek kısıt getirmez — yürütme anında kayıt kopyalanır
  (`operation_runs.steps`), tanım değişikliği running işe uygulanmaz.
- Audit (TamperLogger, fail-closed persist): `operation_definition_created/updated/
  deleted`. Audit yazılamazsa tanım işlemi reddedilir.
- Tek instance: bir kaydın yeni çalıştırması, önceki `running` ise reddedilir
  (WS-TUNNEL §8 idempotency sözleşmesiyle aynı).

### 11.3 UI ve sınırlar

- Field app'te admin-only sayfa (`AuthStore.isAdmin` + nav-visibility deseni hazır):
  adım kurucusu (sistem seçimi ContainerProxy listesinden, manevra seçimi
  `GET /api/maneuvers`'ten, ham komut adımı cihaz+komut listesinden), mode/onFailure/
  rollback editörü, `enabled` anahtarı, çalıştırma geçmişi (`GET /api/operations/runs`).
- Kural motoru admin tanımlı kayıtları da referans edebilir (`maneuver`/`operation`
  aksiyonu isim doğrulamasını `z.string().min(1)` yapar; varlık kontrolü yürütücüde —
  KURAL-MOTORU-V2 §3.1). Kayıt kaldırılırsa kural ateşlemesi `auto_rule_action_failed`
  ile kademeli bozulmaya düşer.
- Faz eşlemesi: B5 (yerel adımlar: depo + CRUD + audit), C4 (uzak adımlı tanımların
  UI'da seçilebilirliği — C1 kanalıyla). Uzak adım desteği gelene kadar admin yalnızca
  yerel sistem tanımları oluşturabilir.
- **Tier yerelliği (karar — REV.02):** admin tanımları tier-LOCAL'dir — tanımlar başka
  tier'a ÇOĞALTILMAZ (boss/konteyner kendi kayıtlarını taşır). Boss'ta görünürlük
  tanım listesiyle DEĞİL, yürütme sonuçlarıyla sağlanır: `operation_*` audit olayları
  mevcut event frame akışıyla üst sisteme akar (§9). Boss UI'ında tanım listesi
  ihtiyacı doğarsa ayrı değerlendirilir (WS-TUNNEL §7).

## 12. Kullanım Senaryoları (Use-Case)

### UC-1 — Operatör, saha UI'dan konteyner BSC şarj manevrası (manuel, çapraz sistem)
Saha operatörü "Konteyner-3 Şarj" kartına güç değeri girip çalıştırır. Field web-service,
`operations.json`'daki `container3_charge` operasyonunu yürütür: adım 1
`{ system: "container-3", maneuver: "bsc_prepare" }` (kontaktör + start — GÜÇ paramı YOK,
K12), adım 2 yerel `pcs_charge` (params powerKw) →
mevcut tünel komut kanalı (`field-container-commands.ts`) üzerinden konteynerin kendi
manevra yürütücüsüne gider → sonuç field'a döner → `operation_completed` audit'i event
frame ile boss'a akar. Rollback: adım başarısızsa `bsc_stop` + `pcs_stop` kompanzasyonu.

### UC-2 — Ada modu recovery (kural tetikli, karışık sistem)
FL-07/FL-10 senaryosu: field `management-service` kuralı ateşlenir
(`islanding_recovery` operasyon aksiyonu — KURAL-MOTORU-V2 spec). Operasyon sırayla:
(1) yerel `pcs_standby` manevrası, (2) `container-3` üzerinde `bsc_stop`. Bir adım
başarısızsa `onFailure: "rollback"` → `pcs_stop` + `bsc_start` kompanzasyonu,
`operation_rolled_back` audit'i. Sonuç boss UI'ında operasyon listesinde görünür.

### UC-3 — Operatör çapraz sistem acil durdurma (manuel, operasyon)
Boss'taki operatör tek tuşla "Saha Acil Durdurma" operasyonunu tetikler. Boss web-service
`operation-execute` kontrol mesajını field peer'ına gönderir (WS-TUNNEL spec §5.3);
field yürütücüsü operasyonu çalıştırır (yerel PCS stop + bağlı konteynerlerde BSC stop —
paralel adımlar); `operation-result` boss'a döner; ara adım durumları
`operation_runs` üzerinden sorgulanabilir.

### UC-4 — Zamanlı şarj (manuel, timer)
Operatör "BSC Şarj" manevrasını 30 dakika zamanlı başlatır. Yürütücü hazırlık adımlarını
(`bsc_prepare` — uzak) ve şarj komutunu (yerel PCS S06 ← −powerKw) çalıştırır,
`timer.durationMs=1800000` ile yerel `set_power_zero` komutunu planlar (K12: BSC'de güç
komutu YOK — timer daima PCS setpoint'ini sıfırlar). 30 dk sonra setpoint-sıfırlama
job'ı çalışır; audit zinciri: `command_executed`(şarj) → `timer_scheduled` →
`command_executed`(setpoint 0) → `operation_completed`.

### UC-5 — Bakım penceresi (manuel, kural engellemesi yok — v1 dışı olarak not düşülür)
Bakım sırasında ilgili manevra/operasyonların `enabled: false` config değeriyle devre dışı
bırakılması (registry seviyesi) — yürütücü devre dışı kaydı 409 ile reddeder.

### UC-6 — Admin saha operasyonu tanımlar (REV.02)
Admin, field UI'da yeni sayfadan "Arbitraj" operasyonunu kurar: adım 1 → container-1
`bsc_prepare` (hazırlık — K12: güç paramı KONTEYNERE GİTMEZ), adım 2 → container-2
`bsc_prepare`, adım 3 → yerel `pcs_charge` (params 200 kW), mode
sequential, onFailure stop. Kayıt doğrulanıp `operation_defs`'e yazılır
(`operation_definition_created` audit). Operatör karttan çalıştırır; uzak adımlar
tünelden konteyner yürütücülerine gider; sonuç `operation_runs`'ta. (Faz C öncesinde
yalnızca yerel sistem adımlarıyla sınırlıdır.)

## 13. Kabul Kriterleri ve Faz Görev Listesi

Geliştirme onaydan sonra fazlar halinde yürütülür; her faz 6 aşamalı iş akışı
(SPEC→JSDoc→TEST→IMPL→DOGRULAMA→TEST-KAPSAMI) ile kapanır.

### Faz A — Kayıtlar ve şemalar
- A1 `maneuvers.json`/`operations.json` strict zod şemaları (`shared-types`), fail-fast yükleme.
- A2 `ManeuverRegistry` + test (geçersiz kayıt → yükleme hatası; bilinmeyen isim → `Result.err`).
- A3 Mevcut 18 manevranın (`maneuvers.ts` + field kataloğu) `maneuvers.json`'a migrasyonu.
- Kabul: registry bilinmeyen manevrada `not_found` döner; kayıt dosyası bozuksa servis açılmaz.

### Faz B — Yürütücü ve kalıcılık
- B1 `OperationExecutor` (yerel adımlar, parallel/sequential, onFailure stop/continue/rollback).
- B2 `operation_runs` tablosu + `IOperationRunStore` PG adaptörü; fail-closed başlangıç.
- B3 REST rotaları (`/api/maneuvers`, `/api/operations`, `/api/operations/runs`), RBAC + iç token.
- B4 Timer genelleştirmesi (`timer` alanı; `_durationSeconds` hack kaldırılır).
- B5 Admin tanım yönetimi: `operation_defs` deposu + CRUD rotaları (yalnız admin) +
  audit; hibrit registry çözümleme (DB > dosya). (§11)
- Kabul: UC-1 (yalnız yerel kısmı), UC-4 uçtan uca geçer; audit zinciri tam.
  B5: admin tanımlı YEREL manevra/operasyon kaydedilir, listelenir, çalıştırılır;
  teknik/guest 403; bozuk tanım kaydedilmez; tanım audit'i TamperLogger'da.

### Faz C — Çapraz sistem
- C1 `IRemoteCommandChannel` + mevcut tünel komut kanalı adaptörü; `system` adım desteği.
- C2 boss→field `operation-execute/operation-result` kontrol mesajları (WS-TUNNEL spec §5).
- C3 Sonuç yayılımı: operasyon audit olaylarının event frame'e bağlanması.
- C4 Admin tanımlı UZAK adımlı operasyonlar: UI'da sistem seçimi + kayıt (§11.3).
- Kabul: UC-2, UC-3 uçtan uca (gerçek WS integration spec'i + gözle demo); C4:
  UC-6 arbitraj senaryosu uçtan uca.

### Faz D — Kural motoru ve frontend
- D1 `maneuver`/`operation` kural aksiyonları (KURAL-MOTORU-V2 spec).
- D2 Frontend: katalog `GET /api/maneuvers`'den; ManeuverPanel registry tabanlı;
  operasyon paneli/listesi.
- Kabul: UC-2 kural tetikli uçtan uca; UI artık kendi kataloğunu tanımlamaz.

### Kapılar
- Yeni kod ≥%70 satır; `OperationExecutor` + `ManeuverRegistry` + rollback yolları ≥%90 branch.
- Testsiz PR merge edilmez; her faz DOGRULAMA + TEST-KAPSAMI dökümanıyla kapanır.

## 14. Kapsam Dışı (YAGNI)

- Operasyon İPTALİ (running bir operasyonu yarıda kesme) — ihtiyaç doğarsa ayrı spec.
- Operasyon zamanlama (cron benzeri tekrar) — kural motoru cooldown'u bugün yeterli.
- Adımlar arası koşullu akış (if/else) — `when` mantığı kural motorunda; operasyon adımları
  düzdür. İhtiyaç doğarsa "koşullu adım" ayrı değerlendirilir.
- Operasyon onayı (4-göz) — şimdilik RBAC; ihtiyaç olursa ayrı spec.
- Pub/sub sonuç dağıtımı — §9 (gerekçe: WS-TUNNEL spec §4.4).
- CANbus/MQTT cihaz implementasyonu — bu spec'in kapsamı dışında; `IDevice` kontratı hazırdır.

---

*review_date: 2026-09-17 — REV.02: dinamik cihaz hedefleme (§5.1), interlock sözleşmesi (§7.3), admin tanım arayüzü (§11); gözden geçirme bekliyor.*
