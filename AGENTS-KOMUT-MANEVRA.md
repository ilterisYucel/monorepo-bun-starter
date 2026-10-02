---
status: active
space: agents
tags: [agents, referans, komut, manevra, operasyon]
review_date: 2026-12-01
---

# AGENTS Detay Referansı — Komut / Manevra / Operasyon

> Bu doküman `AGENTS.md`'den ayrılan **referans** içeriktir; her oturumda yüklenmez.
> Komut config'ine, manevra veya operasyona dokunacaksan **önce bu dokümanı oku**.
>
> **Authoritative:** [KOMUT-MANEVRA-OPERASYON-MIMARISI.md](docs/architecture/KOMUT-MANEVRA-OPERASYON-MIMARISI.md)
> (İP-3/İP-4 + Faz A/B/C/D onaylı — komut/manevra/operasyon otoritesi).
> Çelişkide o doküman üstündür. İlişkili: `KURAL-MOTORU-V2-MIMARISI.md` (otomatik tetikleme),
> `FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md`, `KONTEYNER-MANEVRA-KATALOGU-REV03-MIMARISI.md`.

## Üç katmanlı model

```
OPERASYON   (çok sistem)   operations.json → OperationExecutor → operation_runs + audit
   │ adım = { manevra | komut zinciri } + hedef sistem
MANEVRA     (tek sistem)   maneuvers.json → ManeuverRegistry → aynı executor
   │ adım = CommandStep
KOMUT       (tek cihaz)    config commands + CommandJobBuilder → COMMAND_DEVICE → IDevice.write
```

Tek sistemde 1+ cihaz → manevra; birden fazla sistemde işlem → operasyon. Aynı motor
çalıştırır; operasyon = manevranın süperseti. Her ikisi de `operation_runs`'a yazılır
(`kind`: `maneuver|operation`).

## Command config system (device JSONs)

Her cihaz config JSON'u `"commands"` bölümü tanımlayabilir. Komutlar telemetri girdilerine
`name` ile referans verir (register adresi + MODBUS tablo tipi çözümü).

### Pattern

```json
{
  "commands": {
    "<commandName>": {
      "label": "Human-readable label",
      "telemetries": [
        { "name": "<telemetry name>", "value": <register value> }
      ],
      "params": {
        "<paramName>": {
          "type": "number",
          "min": 0,
          "max": 3568,
          "default": 50,
          "required": true,
          "label": "Güç (kW)"
        }
      },
      "atomic": true,
      "timeoutMs": 3000,
      "validate": {
        "reads": [{ "name": "<status telemetry>", "expect": <expected value> }]
      }
    }
  }
}
```

- `telemetries[].name` — config'in `"telemetry"` dizisindeki bir girdiyle eşleşmeli
- `telemetries[].value` — doğrudan değer veya `"{{paramName}}"` şablonu (kullanıcı param'ından çözülür)
- `params` — kullanıcı girdileri (yürütmeden önce UI'da gösterilir)
- `validate.reads` — yazımdan sonra telemetri okunur, `value === expect` karşılaştırılır
- `atomic` — true ise ve cihaz `writeAtomic()` destekliyorsa read-backup + rollback

### Per-device examples

| Device    | Register Type             | Validation                                                  | Commands                                |
| --------- | ------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| BSC       | `HOLDING_REGISTER` writes | `INPUT_REGISTER` read-back (e.g. `Request Acknowledge`)     | `charge`, `discharge`, `stop`           |
| HVAC      | `HOLDING_REGISTER` writes | `INPUT_REGISTER` read-back (e.g. `Equipment Status`)        | `on`, `off`, `force_cool`, `force_heat` |
| CB        | `COIL` writes             | `DISCRETE_INPUT` read-back (e.g. `Is Closed`, `Is Tripped`) | `open`, `close`, `reset`                |
| DC Output | `COIL` writes             | `DISCRETE_INPUT` read-back (e.g. `Is On`)                   | `on`, `off`                             |

**Flow:** Web → `POST /api/commands/execute` → `COMMAND_DEVICE` BullMQ job → `ModbusDevice.write()` → validates read-back.

## Manevra / Operasyon kaydı (sunucu tarafı — YENİ model)

Manevra ve operasyon artık **sunucuda birinci sınıf varlıktır**; tier config'te
`maneuvers.json` / `operations.json` ile tanımlanır (rules.json deseni — bozuk dosya
açılışta fail-fast). Eski statik frontend kataloğu kaldırılmıştır; UI kataloğu
`GET /api/maneuvers`'ten okur.

### Bileşenler ve dosya haritası

| Bileşen | Yer | Görev |
|:--------|:----|:------|
| Şemalar (`CommandStep`, `ManeuverConfig`, `OperationStep`) | `packages/shared-types/src/commands/` | Strict zod; fail-fast yükleme |
| `ManeuverRegistry` | `packages/platform/commands/src/maneuver-registry.ts` | Dosya + DB kayıtlarını birleştirir (DB > dosya), isimle çözer (`Result<T,E>`) |
| `OperationExecutor` | `packages/platform/commands/src/operation-executor.ts` | Paralel/sıralı yürütür, rollback, sonuç toplar; HTTP bilgisi YOK |
| `CommandJobBuilder` | `packages/platform/commands/src/command-job-builder.ts` | Komutu BullMQ job'una çevirir (mevcut) |
| Yürütme rotaları | `services/web-service/src/presentation/routes/maneuver-routes.ts` | `GET /api/maneuvers`, `POST /api/maneuvers/:name/execute`, operasyon uçları, `GET /api/operations/runs/:id` |
| Boss→field kanal | `services/web-service/src/presentation/routes/operation-boss-routes.ts` + `TunnelManeuverChannel` | `operation-execute`/`operation-result` tünel mesajları |
| Frontend API | `apps/container-web/src/features/control/services/maneuverApi.ts` | Registry tabanlı katalog/execute istemcisi |
| Frontend panel | `apps/container-web/src/features/control/components/ManeuverPanel.tsx` | Kartları sunucu kataloğundan render eder |

Yerleşim kuralı: `packages/platform/commands` GD-PMS'ye özgüdür; `packages/core`'a taşınmaz.

### CommandStep — dinamik hedefleme + timer (REV.02 / B4)

```ts
interface CommandStep {
  deviceId?: string;      // tek hedef
  deviceIds?: string[];   // açık liste (grup seçimi)
  deviceTypes?: string[]; // tip seçici (config üst seviye `type`)
  command?: string;       // config isimli komut
  telemetries?: Array<{ name: string; value: unknown; unit?: string }>; // VEYA ham
  params?: Record<string, unknown>;
  timer?: { durationMs: number; stopCommand?: string }; // B4 genelleştirmesi
}
// Zod refine: deviceId | deviceIds | deviceTypes — TAM BİRİ zorunlu.
```

- **Çözümleme zamanı:** yürütme başlangıcında; `devices` tablosundan (`status='online'` + müsait) çözülür — kayıt yüklemede DEĞİL. Çözüm boşsa adım başarısız (kademeli bozulma).
- **Transform sunucuda:** `divideTotal` (santral gücü → çözülen adım sayısına eşit bölme) adım sayısı çözümlemeden sonra bilindiği için executor'da uygulanır.
- **Timer:** ana komut başarılıysa `stopCommand` (varsayılan `stop`), `durationMs` gecikmeyle planlanır (BullMQ `delay`). Eski `_durationSeconds` hack'i kaldırılmıştır.

### onFailure ve rollback sözleşmesi

| `onFailure` | Davranış |
|:------------|:---------|
| `stop` (varsayılan) | İlk başarısız adımda kalan adımlar atlanır; geri alma yok |
| `continue` | Başarısız adımdan sonra devam; hata sonuç listesinde raporlanır |
| `rollback` | `rollbackSteps` (manevra) / `rollback` (operasyon) kompanzasyonu; sonuç `rolled_back` |

- Rollback yalnızca **başarıyla çalışan** adımları kompanse eder; sıralıda ters sıra, paralelde aynı `mode`; **best-effort** (bir kompanzasyon hatası diğerlerini durdurmaz).
- `onFailure: "rollback"` istendiği halde kompanzasyon tanımı yoksa kayıt **yüklemede reddedilir** (fail-fast).
- Çapraz sistem rollback tünel kopuksa `rollback_step_failed (system_unreachable)` ile kaydedilir; **otomatik yeniden deneme YOKTUR** (operatör tamamlar).

### Durum ve kalıcılık

- Durum makinesi: `running → completed | failed | rolled_back` (terminal; iptal yok — v1).
- `operation_runs` tablosu: `kind`, `name`, `trigger`, `status`, `steps` (jsonb), `started_at`/`finished_at`, `created_by`, `trace_id`.
- **Fail-closed başlangıç:** `running` satırı INSERT edilemezse yürütme reddedilir.
- Audit (TamperLogger, `audit`): `operation_started/completed/failed/rolled_back`, `rollback_step_ok/failed`.
- Admin tanımları: `operation_defs` tablosu (hibrit registry DB > dosya); CRUD uçları yalnız `admin`; audit fail-closed. Yürütme uçları `admin|teknik` + iç token.

### Field Charge/Discharge operasyon kararı (K12)

Field şarj/deşarj **operasyon**dur (konteyner BSC uzak + saha PCS yerel), `sequential`,
`onFailure: "rollback"`. **GÜÇ KOMUTU KONTEYNERE ASLA GİTMEZ:** BSC'de charge/discharge
komutu YOKTUR; uzak adım yalnızca hazırlıktır (`bsc_prepare` = kontaktör + start), `powerKw`
yalnızca yerel PCS adımına gider. Adım sırası kritiktir (hazırlık setpoint'ten önce).

### Otomatik tetikleme

`management-service` kural motoru `maneuver`/`operation` aksiyonu tanımlayabilir
(`KURAL-MOTORU-V2-MIMARISI.md` §3). Kural executor'ı kullanmaz — web-service REST'ini
iç token ile çağırır. Kayıt kaldırılırsa tetikleme `auto_rule_action_failed` ile
kademeli bozulmaya düşer.
