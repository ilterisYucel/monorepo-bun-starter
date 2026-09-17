# Kural Motoru v2 — Manevra ve Operasyon Aksiyonları (SPEC)

> Mevcut kural motorunun üzerine EKLENTİDİR — değerlendirme semantiği değişmez.
> Kaynak dökümanlar: `KONTEYNER-MANEVRA-KATALOGU-REV03-MIMARISI.md` (kural tasarımı),
> `MANAGEMENT-SERVICE-MIMARISI.md` (motor mimarisi), `KOMUT-MANEVRA-OPERASYON-MIMARISI.md`
> (varlık hiyerarşisi), `WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md` (çapraz sistem taşıma).
>
> **Durum: GÖZDEN GEÇİRME BEKLİYOR** — onay alınmadan geliştirme başlamaz.

## İçindekiler

1. Amaç — Neden v2?
2. Mevcut Motor (Özet)
3. Değişiklikler
4. Şema Değişiklikleri
5. Kullanım Senaryoları (Use-Case)
6. Kabul Kriterleri ve Görev Listesi
7. Kapsam Dışı (YAGNI)

---

## 1. Amaç — Neden v2?

Yeni spesifikasyonun kural motoru talebi: *"x cihazının y registeri şundan büyükse şu
komutu çalıştır"* gibi ifadeler değerlendirilebilmeli ve komut/manevra/operasyonlar
**manuel VEYA otomatik** tetiklenebilmeli.

- **Değerlendirme tarafı ZATEN TAMAMDIR** — `RuleEvaluator` kenar-tetikli, debounce'lu,
  cooldown'lu ve gt/gte/lt/lte/eq/neq operatörlüdür (§2). Bu spec'te DEĞİŞMEZ.
- **Eksik olan tek şey aksiyon yüzeyidir**: kurallar bugün yalnızca TEK komut
  (`command`, `container-command`), log ve notify üretebilir; **manevra ve operasyon
  referans edemez**. Manevralar sunucuda varlık olmadığı için bu bugün mümkün değildi —
  `KOMUT-MANEVRA-OPERASYON-MIMARISI.md` Faz A/B ile manevra/operasyon kayıtları kurulunca,
  kural motoru onları referans edebilir.

## 2. Mevcut Motor (Özet)

| Parça | Dosya | Durum |
|:---|:---|:---|
| Kural şeması (`AutomationRule`, `when.all/any`, `RuleCondition`, `RuleAction`) | `packages/shared-types/src/automation-rule.ts` | ✅ Değerlendirme tarafı tam |
| Değerlendirici (kenar-tetikli + debounce + cooldown dedup) | `services/management-service/src/rule-evaluator.ts` | ✅ Değişmez |
| Aksiyon yürütücü (sıralı, kademeli bozulma) | `services/management-service/src/action-executor.ts` | ⚠️ Genişler (§3) |
| Konteyner komut kanalı (tünel proxy) | `services/management-service/src/container-command-channel.ts` | ✅ Değişmez |
| Config: `rules.json` (strict, fail-fast) | `management-service/deployment/config{,-field}/rules.json` | ⚠️ Yeni aksiyon tipleri eklenir |

Mevcut koşul gücü (örnek, çalışan kural `r06_recovery` — `config-field/rules.json`):
`when.all: [PCS-1 "Emergency Stop Button Status" eq 0 (debounce 2s), PCS-1
"PCS Fault Status" eq 0] → fault_reset, standby, log, notify`. "Register > eşik →
komut" deseni birebir çalışıyor.

## 3. Değişiklikler

### 3.1 Yeni aksiyon tipleri: `maneuver` ve `operation`

```ts
type RuleAction =
  | { action: "command"; ... }                    // mevcut
  | { action: "container-command"; ... }          // mevcut
  | { action: "log"; ... }                        // mevcut
  | { action: "notify" }                          // mevcut
  | { action: "maneuver"; name: string; params?: Record<string, unknown> }      // YENİ
  | { action: "operation"; name: string; params?: Record<string, unknown> };    // YENİ
```

- `name` = `maneuvers.json`/`operations.json` kayıt adı — **management-service
  kaydı YÜKLEMEZ ve içeriği bilmez**; yürütmeyi web-service'e devreder (aşağıda).
  Bu yüzden `name` doğrulaması `z.string().min(1)` — varlık doğrulaması yürütücüde.
- `params`: komut şablonlarına akar (`KOMUT-MANEVRA-OPERASYON` §6).

### 3.2 Yürütme delegasyonu: web-service REST + iç token

Manevra/operasyon yürütücüsü (`OperationExecutor`) web-service'te YAŞAR
(kalıcılık, RBAC, tünel kanalları orada). Management-service onu KOPYALAMAZ —
mevcut `container-command` deseninde olduğu gibi iç token ile web-service'i çağırır:

```
ActionExecutor (management-service)
  ├─ command            → CommandJobBuilder + IMessageQueue            [mevcut]
  ├─ container-command  → IContainerCommandChannel (tünel proxy)       [mevcut]
  ├─ maneuver  → POST /api/maneuvers/:name/execute   (x-internal-token) [YENİ]
  └─ operation → POST /api/operations/:name/execute  (x-internal-token) [YENİ]
```

- İç token: mevcut `FIELD_INTERNAL_API_TOKEN` sözleşmesi (`field-container-commands.ts:66-81`,
  `authorize()`); fail-closed — token yapılandırılmamışsa manevra/operasyon aksiyonu
  `auto_rule_action_failed (channel_not_configured)` düşer, akış durmaz (kademeli bozulma).
- Timeout: manevra/operasyon uzun sürebilir (çapraz sistem) → HTTP timeout
  **senkron bekleme üst sınırı 15 sn**; daha uzun yürütmelerde web-service 202 +
  `operation_runs` durum sorgulaması döner (ActionExecutor sonucu "başlatıldı" sayar,
  terminal durum `operation_*` audit olaylarından izlenir). Bu, kural döngüsünü
  bloke etmemek için zorunludur (management-service değerlendirme döngüsü
  `management-service.ts:77-84`).
- Trace: `traceId = auto:<ruleName>:<runId>` — komut/tünel audit zincirine bağlanır
  (mevcut `traceId = auto:${rule.name}` deseni, `action-executor.ts:108`).

### 3.3 Rollback sözleşmesi — kural rollback BİLMEZ

Spesifikasyonun "birimde hata olması halinde rollback yapılması seçilebilir" maddesi
kural motoru KATMANINDA değil, operasyon/manevra katmanında çözülür:

- Kural aksiyonundaki `maneuver`/`operation`, kendi `onFailure`/`rollback` config'ini
  taşır; rollback yürütücünün işidir (`KOMUT-MANEVRA-OPERASYON` §7).
- Kuralın **kendi** rollback kavramı yoktur (aksiyonlar sırayla, kademeli bozulma —
  mevcut sözleşme korunur). Aksiyon setinin geri alınması istenirse tek `operation`
  aksiyonu referans edilir ve kompanzasyon operasyon kaydında tanımlanır.
- Kural aksiyonu başarısızsa (`auto_rule_action_failed`) otomatik yeniden deneme
  YOKTUR — mevcut cooldown semantiği zaten yeniden tetiklemeyi yönetir.

### 3.4 Kural → operasyon koşul geri bildirimi (gerekli DEĞİL — teyit)

Operasyon sonucu kural değerlendirmesine GİRMEZ (ör. "operasyon başarısızsa şu
kuralı ateşle" YOKTUR). Operasyon sonuçları `operation_*` audit olayları ve
`operation_runs` tablosundan görünür; gerekirse sonraki kural koşulu cihaz
telemetrisine bakar (örn. "BSC hâlâ şarjda" → başka aksiyon). Bu, kural motorunu
durum makinesi olmaktan korur — kenar-tetikli model bozulmaz.

## 4. Şema Değişiklikleri

`packages/shared-types/src/automation-rule.ts`:

```ts
export const ruleActionSchema = z.discriminatedUnion("action", [
  // ...mevcut 4 giriş aynen...
  z.object({
    action: z.literal("maneuver"),
    name: z.string().min(1),
    params: z.record(z.unknown()).optional(),
  }).strict(),
  z.object({
    action: z.literal("operation"),
    name: z.string().min(1),
    params: z.record(z.unknown()).optional(),
  }).strict(),
]);
```

- Yeni girdiler STRCIT kalır (kural dosyası el yazımı — fail-fast ilkesi,
  `automation-rule.ts:197-207`).
- Geriye uyumlu: mevcut `rules.json` dosyaları değişmez (ek girdiler opsiyonel).
- `RuleAction` doc yorumu güncellenir: manevra/operasyon delegasyon sözleşmesi (§3.2).

## 5. Kullanım Senaryoları (Use-Case)

### UC-1 — R-06 Recovery operasyonu (mevcut kuralın genişlemesi)
`config-field/rules.json`'daki `r06_recovery` kuralı `then`'i şu olur:
`[{ action: "operation", name: "islanding_recovery" }]`. Kural ateşlenince management-
service web-service'i iç token ile çağırır; operasyon sırayla `pcs_standby` (yerel) +
`bsc_stop` (container-3, tünel). Bir adım başarısızsa operasyon kendi rollback'ini
çalıştırır (`operation_rolled_back` audit'i). Kural cooldown'u (60 sn) operasyon
sonucundan BAĞIMSIZ çalışır — tekrar tetikleme yalnızca koşul kenarıyla.

### UC-2 — Konteyner SOC dengeleme (kural tetikli OPERASYON, çapraz sistem)
Kural: `when.all: [BSC-1 "SOC" gt 95, BSC-2 "SOC" lt 40] → { action: "operation",
name: "soc_balance", params: { powerKw: 200 } }`. Kural ateşlenince management-service
web-service'i iç token ile çağırır; `soc_balance` OPERASYON kaydı çalışır: konteyner
adımları yalnız HAZIRLIKTIR (`bsc_prepare` — K12: BSC'de charge komutu YOK, güç PCS'te),
güç param'ı yerel `pcs_charge` adımına gider. Kural dosyasında tek satır; dengeleme
mantığı config'de (`KOMUT-MANEVRA-OPERASYON` §6.1 deseni).

### UC-3 — FL-08 DC kısa devre koruması (manuel teyit — değişmez)
Mevcut kapsamda otomatik uygulanabilir tek koruma manevrası; kuralla tetiklenen
`maneuver` aksiyonu + `notify`. Mevcut `command` aksiyonlarıyla birebir aynı akış —
yalnızca aksiyon tipi değişir.

### UC-4 — Bakım penceresi kural seti (config'de operasyon devre dışı)
`operations.json`'da `enabled: false` yapılan operasyonu referans eden kural
ateşlendiğinde web-service 409 döner → ActionExecutor `auto_rule_action_failed
(operation_disabled)` basar; akış devam eder (kademeli bozulma). Operatör tek
config değişikliğiyle bakımı güvence altına alır — kural motorunda değişiklik yok.

## 6. Kabul Kriterleri ve Görev Listesi

Faz D (KOMUT-MANEVRA-OPERASYON spec §13) içinde uygulanır; 6 aşamalı iş akışı geçerlidir.

- D1 `automation-rule.ts` şema genişletmesi + `RuleEvaluator`'a dokunulmadan
  mevcut değerlendirme testlerinin yeşil kalması.
- D2 `ActionExecutor` manevra/operasyon aksiyonları: iç token kanalı, 15 sn timeout,
  202 + durum sorgulama, trace kimliği; kanal yoksa fail (kademeli bozulma).
- D3 `rules.json` örnekleri: `r06_recovery` → operation; SOC dengeleme örneği.
- Kabul: UC-1 uçtan uca (gerçek WS + tünel); UC-4 409 yolu; değerlendirme
  semantiği testleri (kenar/debounce/cooldown) DEĞİŞMEDEN geçer.
- Kapı: ActionExecutor yeni yollar ≥%90 branch.

## 7. Kapsam Dışı (YAGNI)

- Kural sonuç geri bildirimi (operasyon sonucuna bağlı kural zinciri) — §3.4.
- Kural aksiyon retry kuyruğu — cooldown yeterli.
- Kural editörü/dinamik kural yükleme — `rules.json` restart ile yüklenir
  (mevcut davranış korunur).
- Kural tabanlı operasyon İPTALİ — operasyon iptali zaten kapsam dışı
  (`KOMUT-MANEVRA-OPERASYON` §14).

---

*review_date: 2026-09-17 — ilk sürüm, gözden geçirme bekliyor.*
