---
status: active
space: architecture
tags: [dogrulama, komut, manevra, operasyon, kayit, registry, faz-a]
review_date: 2026-09-22
---

# Komut-Manevra-Operasyon — Doğrulama Dokümanı (Aşama 5/6, İP-3 — Faz A)

Bağlı tasarım: [KOMUT-MANEVRA-OPERASYON-MIMARISI.md](./KOMUT-MANEVRA-OPERASYON-MIMARISI.md)
Kapsam: **Faz A (A1-A3)** + **Faz B (B1-B5)** + **Faz C** + **Faz D** (2026-09-22): yürütücü, kalıcılık, REST rotaları, timer genelleştirmesi, admin tanım yönetimi, tünel kanalı, kural aksiyonları, frontend migrasyonu.

## 1. Genel Durum

| Görev | Durum | Kanıt |
|:------|:------|:------|
| A1 — maneuvers.json/operations.json strict zod şemaları + fail-fast yükleyiciler | ✅ | `maneuver-record.test.ts` 23/23 |
| A1 — CommandStep REV.02 §5.1 seçicileri (deviceId/deviceIds/deviceTypes — tam biri) + timer (§10) | ✅ | `maneuver-record.test.ts` "commandStepSchema" 8 test |
| A2 — `ManeuverRegistry` (davranışsız; `Result` çözümleme; mükerrer isim fail-fast) | ✅ | `maneuver-registry.test.ts` 7/7 |
| A3 — Konteyner kataloğu migrasyonu (11 kayıt — İP-1/İP-2 temizliği birebir) | ✅ | `maneuver-migration.test.ts` 12/12 |
| A3 — Field kataloğu migrasyonu (11 manevra + 3 operasyon — REV.01 §7) | ✅ | `maneuver-migration.test.ts` |
| Test seti (etkilenen 5 proje) | ✅ | shared-types, platform-commands, container-web, field, ui yeşil (--skip-nx-cache) |
| B1 — `OperationExecutor` (yerel adımlar; mode/onFailure; rollback; seçici çözümleme; divideTotal; timer) | ✅ | `operation-executor.test.ts` 17/17 |
| B2 — `OperationRunStore` (operation_runs PG; fail-closed begin) | ✅ | `operation-run-store.test.ts` 6/6 |
| B3 — REST rotaları + adaptörler (CommandChannel, DeviceRegistryTargets) + server wiring + compose mount'ları | ✅ | `maneuver-routes.test.ts` 15/15 + `command-channel.test.ts` 9/9 |
| B4 — Timer genelleştirmesi (hack kaldırıldı; `timer` alanı; frontend üretimi) | ✅ | `command-routes.test.ts` 14/14 (yeni timer kontratı) |
| B5 — `OperationDefStore` + hibrit registry (DB > dosya) + CRUD + fail-closed audit | ✅ | `operation-def-store.test.ts` 6/6 + registry hibrit 12/12 |
| Test seti (etkilenen 9 proje) | ✅ | simulators, shared-types, device-service, management-service, platform-commands, container-web, field, ui, web-service yeşil (--skip-nx-cache) |

## 2. Değişiklik Matrisi

| Değişiklik | Dosya(lar) | Geçme |
|:-----------|:-----------|:------|
| CommandStep REV.02 seçicileri + `CommandTimer` | `packages/shared-types/src/commands/command.ts` | ✅ |
| Manevra/operasyon kayıt sözleşmeleri + STRICT zod şemaları + fail-fast yükleyiciler | `packages/shared-types/src/commands/maneuver.ts` (REWRITE) | ✅ 23/23 |
| Frontend `ManeuverConfig` ayrı dosyaya taşındı (D2'de kalkacak) | `packages/shared-types/src/commands/maneuver-config.ts` (YENİ) | ✅ build |
| Barrel güncelleme | `packages/shared-types/src/commands/index.ts` | ✅ |
| `ManeuverRegistry` (davranışsız kayıt) | `packages/platform/commands/src/maneuver-registry.ts` (YENİ) | ✅ 7/7 |
| Barrel güncelleme | `packages/platform/commands/src/index.ts` | ✅ |
| Konteyner `maneuvers.json` (11 kayıt: 8 katalog + fl_idle + bsc_stop + bsc_prepare) | `services/web-service/deployment/config-docker/maneuvers.json` (YENİ) | ✅ |
| Field `maneuvers.json` (11 kayıt: fl01/03/04/05/06/07/10 + pcs_charge/discharge/stop) | `services/web-service/deployment/config-field/maneuvers.json` (YENİ) | ✅ |
| Field `operations.json` (field_charge/field_discharge/field_maintenance) | `services/web-service/deployment/config-field/operations.json` (YENİ) | ✅ |

## 2b. Faz D2 — Frontend Migrasyonu (2026-09-22)

| Değişiklik | Dosya(lar) | Geçme |
|:-----------|:-----------|:------|
| container-web `maneuverApi` (list + execute + timer) | `features/control/services/maneuverApi.ts` (YENİ) | ✅ 4/4 |
| ManeuverPanel — sunucu kataloğu (React Query) + kart testi | `features/control/components/ManeuverPanel.tsx` + test (YENİ) | ✅ 2/2 |
| ManeuverCard — ManeuverRecord + seçici güvenli adım görünümü + stepSummary | `packages/ui/src/components/ManeuverCard/*` | ✅ build |
| Sidebar/SidebarV2 acil durdurma → maneuverApi.execute("fl03_emergency_stop") | `layouts/{Sidebar,SidebarV2}.tsx` | ✅ build |
| KALDIRILAN: MANEUVERS kataloğu, MANEUVER_CONTROLS, controlApi, ControlPanel, Scheduler + testleri (S-6 kapandı) | `features/control/*` | ✅ 66/66 |
| Executor `options.timer` (UI Zamanlı kutusu — kayıt timer'ını ezmez) | `platform/commands/src/operation-executor.ts` | ✅ 22/22 |
| Route + istemcilerde `timer: {durationSeconds}` (§10) | `maneuver-routes.ts`, istemciler | ✅ 17/17 |
| Field `fieldManeuverApi` (list/execute + CRUD + runs) | `features/field-control/services/fieldManeuverApi.ts` (YENİ) | ✅ 7/7 |
| FieldManeuverPanel — sunucu kataloğu + grup seçici (deviceIds kısıtı) + operasyon kartları | `features/field-control/components/FieldManeuverPanel.tsx` + test | ✅ 5/5 |
| KALDIRILAN: buildFieldManeuvers/buildFieldManeuverControls/resolveSteps/fieldControlApi + testleri | `features/field-control/*` | ✅ 150/150 |
| OperationRecord.ui + operations.json ui meta (FL-02 kart girdileri) | `shared-types/commands/maneuver.ts` + config | ✅ 23/23 + 12/12 |
| C4 — AdminOperationsPage (kurucu + CRUD + geçmiş) + rota + nav (admin-only) | `pages/AdminOperationsPage.tsx` (YENİ) + test | ✅ 4/4 |

## 3. Kabul Kriteri Kanıtları (Faz A)

| Kriter (§13) | Sonuç |
|:-------------|:------|
| Registry bilinmeyen manevrada `not_found` döner | ✅ `maneuver-registry.test.ts` "bilinmeyen isim → err({kind: not_found})" — throw YOK |
| Kayıt dosyası bozuksa servis AÇILMAZ (fail-fast) | ✅ `maneuver-record.test.ts` yükleyici testleri (bozuk JSON + şema ihlali → THROW); `maneuver-migration.test.ts` gerçek dosyalar yükleniyor |
| Geçersiz kayıt → yükleme hatası | ✅ §7.1 rollback fail-fast + strict bilinmeyen anahtar + seçici kuralları |
| Kapılar: yeni kod ≥%70 satır; ManeuverRegistry ≥%90 branch | ✅ registry tüm dallar testli (ok/err, tür ayrımı, boş set, mükerrer); şema refine'ları testli |

## 4. Sapmalar (kayıt)

| Kod | Sapma | Neden |
|:----|:------|:------|
| S-1 | Fail-fast yükleyiciler `ValidationError` yerine düz `Error` fırlatır | `shared-types` LEAF pakettir (AGENTS: "shared-types, result — leaf, no deps"); result'a bağımlılık YASAK. Mevcut `validateOrThrow` deseni de düz Error kullanır |
| S-2 | `CommandStep` seçici kuralı "TAM BİRİ" olarak uygulandı (deviceId XOR deviceIds XOR deviceTypes) | §5.1 Zod refine notu birebir; komut içeriği "en az biri" (command/telemetries) — mevcut execute-multi davranışıyla uyumlu |
| S-3 | Kayıt adı teklik kuralı: tür başına mükerrer isim → kurulumda THROW | §11.1 name PK sözleşmesinin dosya katmanı yansıması (DB'de kind+name PK; dosyada fail-fast erken yakalama) |
| S-4 | Field kataloğunda `fl05_emergency_stop` stop + set_power_zero İKİSİNİ taşır | FIELD-REV01 §3.5 HEDEF notu ("adım 2 (HEDEF): S06 ← 0") + ürün dokümanı §5.5 birebir; mevcut frontend yalnız stop üretiyordu |
| S-5 | `field_maintenance` sistem adı "container-1" sabit | §3.10 "container-N" çalışma zamanı seçimi Faz C'de netleşecek (grup seçimi yürütme isteğinde); migrasyon örneği olarak container-1 yazıldı |
| S-6 | Registry'de DB kaynağı (`IOperationDefStore`) YOK — yalnızca dosya kayıtları | §11.1 hibrit çözümleme (DB > dosya) Faz B5'te; Faz A YAGNI (A2 kabulü dosya kaydını kapsar). **B5 ile KAPANDI (2026-09-22):** registry artık `source` alır — resolve/list DB > dosya |
| S-7 | Uzak adım (`system`) B1'de `remote_channel_not_available` ile fail | IRemoteCommandChannel Faz C'dedir (tünel kanalı); kademeli bozulma sözleşmesi gereği adım başarısız sayılır — Faz C adaptörü aynı arayüzü dolduracak |
| S-8 | Müsaitlik filtresi bugün yalnızca `status='online'` (DeviceRegistry önbelleği) | §5.1 "unavailable/fault/bakım hariç" — devices tablosunda ayrım sütunu yok; RealtimeSnapshotSource sözleşmesinin birebir aynısı (adaptör genişler, yürütücü değişmez) |
| S-9 | Disabled DB kaydı dosya kaydını da GÖLGELER (list'te görünmez, resolve disabled döner) | §11.2 UC-5 semantiği: admin disable'ı dosyaya düşmemeli (devre dışı bırakma = devre dışı) |
| S-10 | CRUD audit'i "fail-closed": audit ÖNCE persist SONRA; audit yazılamazsa tanım işlemi RED | §11.2 birebir ("Audit yazılamazsa tanım işlemi reddedilir"); logger yoksa 500 |

## 5. Gözle Kontrol — Migrasyon Birebirliği (A3)

| Kaynak | Hedef kayıt | Doğrulama |
|:-------|:------------|:----------|
| `maneuvers.ts` (container-web, İP-1/İP-2 temizliği sonrası) | `config-docker/maneuvers.json` | ✅ adım birebir: fl01 (open+start+on), fl03 (emergency+open), fl05 force ×8, fl09 stop, fl10 (open_contactors+open), şalter kapat, kontaktör kapat, fl_idle |
| Katalog §2.10 HEDEF | `bsc_prepare` (close_contactors + start, güç param YOK) + `bsc_stop` | ✅ K12 testi: `step.params.powerKw` yok |
| FIELD-REV01 §3 (buildFieldManeuvers) | `config-field/maneuvers.json` | ✅ kart seti + gizli set (fl06/07/10 hidden) + `pcs_*` iç kayıtlar; FL-02 kartı yok (operasyona taşındı) |
| KOMUT §6.1 örneği | `config-field/operations.json` field_charge | ✅ adımlar + rollback sırası birebir (pcs_stop, bsc_stop ×2) |

## 6. Komut Çalıştırmaları

```
bun x nx run-many -t test -p shared-types platform-commands container-web field ui --skip-nx-cache → hepsi yeşil
bun x vitest run src/maneuver-registry.test.ts (platform/commands) → 7/7
bun x vitest run src/commands/maneuver-record.test.ts (shared-types) → 23/23
```

`review_date: 2026-09-22` (Faz A + Faz B)
