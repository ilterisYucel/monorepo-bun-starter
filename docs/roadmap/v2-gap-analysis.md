---
status: active
space: roadmap
tags: [yol-haritasi, gap-analizi, v2]
review_date: 2026-08-24
---

# v2.0 Gap Analizi — Low-Code/No-Code SCADA/EMS Platformu

> **Not (2026-08-24):** Bu doküman eski README'nin v2.0 bölümünden (A–K gap tabloları) taşınmış ve durumları güncellenmiştir. **Güncel yol haritaları:** [ui-v2-plan.md](./ui-v2-plan.md), [EDITOR-MIMARISI.md](../architecture/EDITOR-MIMARISI.md), [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](../architecture/KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md) (Faz 0–6), [field-superadmin-architecture.md](../architecture/field-superadmin-architecture.md).

Hedef: Grafana benzeri, surukle-birak ile SCADA ekranlari ve tek hat semalari olusturulabilen, 2B/3B grafik destegi olan dusuk kodlu bir platform.

## Mevcut Durum (2026-08-24 itibarıyla)

| Alan | Durum | Detay |
|:-----|:------|:------|
| **Konfigurasyon Sistemi** | ✅ | Device config JSON'lari (BSC, PCS-EMU, HVAC, CB, DC-Output, EP203) — register, bitfield, command tanimlari, Zod validasyonu, `transport.kind` modeli |
| **Protokol Destegi** | 🟡 | Modbus TCP/RTU (production) + simülatör transport'u; CANbus/MQTT stub |
| **Cihaz Simulatorleri** | ✅ | BSC, HVAC, XRack, CB, DC-Output, PCS — register-accurate, `SimulatorRegistry` |
| **Veri Pipeline** | ✅ | device-service → BullMQ → data-service (TimescaleDB) + WebSocket broadcast + `TelemetryTagger` (canonical tags) |
| **2B Grafikler (PixiJS)** | ✅ | BSC/TMS sistemleri + element komponentleri (RackCell, CircuitBreaker, DCOutput, HvacUnit, RoomCard, PanelCard, Cable...) + **sprite pipeline** (AI üretimi) |
| **UI Komponentleri** | ✅ | TelemetryGauge, TelemetryChart, TelemetryInput, LogTerminal, ManeuverCard, MultiLineChart... |
| **Gercek Zamanli Transport** | ✅ | Strategy — WebSocketTransport, HttpPollingTransport, MockTransport (`ITelemetryTransport`) |
| **Manevra Sistemi** | ✅ | 18 tanimli manevra — parallel/sequential, rollback, read-back validasyonu |
| **Auth & RBAC** | ✅ | JWT (jose) + Argon2id, 4 rol (admin/teknik/boss/guest) + `fieldIds` |
| **Editor** | 🟡 | ReactFlow canvas, device-library, proje CRUD — faz 2-4 tamamlandi (bkz. EDITOR-MIMARISI); screen/widget builder henüz yok |
| **Tasarim Sistemi** | ✅ | 104 renk token'i, 35 SCADA ikonu |
| **Desktop** | ✅ | Electron v39 + crash handler'lar |
| **CI/CD** | 🟡 | 4 workflow var (`e2e`, `perf`, `sonar`, `storybook`); **PR-level unit-test workflow eksik** |
| **Test** | 🟡 | Vitest workspace + yüzlerce test; kapsam borçlari `TESTING.md` §2 envanterinde |
| **Doküman sistemi** | ✅ | Wiki.js (self-hosted) + `docs/` tasnifi |

## Gap Tablolari

### A. Dusuk Kodlu Ekran Olusturma

| # | Eksik | Onem | Aciklama | Durum (2026-08) |
|:--|:------|:-----|:---------|:-----------------|
| A1 | Screen/Dashboard Composition Engine | 🔴 Kritik | `ScreenConfig`/`DashboardLayout` tipi yok; sayfalar hardcoded JSX | Açık — bkz. ui-v2-plan.md |
| A2 | Widget Sistemi | 🔴 Kritik | `WidgetDefinition` + registry + deklaratif renderer yok | Açık |
| A3 | Runtime Screen Renderer | 🔴 Kritik | `ScreenConfig`'i canli veriyle render edecek motor yok | Açık |
| A4 | Editor ↔ Runtime Koprusu | 🔴 Kritik | Kanvas yerlesimi → canli PixiJS/veri akisi yok | Açık |
| A5 | Widget DnD Editor | 🔴 Kritik | Editor cihaz yerlestirme yapiyor, widget DnD yok | Açık |
| A6 | Coklu Ekran Destegi | 🟠 Yuksek | Tek dashboard sayfasi | Açık |

### B. 3B Grafik Destegi

| # | Eksik | Onem | Durum (2026-08) |
|:--|:------|:-----|:-----------------|
| B1 | 3B Render Pipeline (Three.js/Babylon) | 🔴 Kritik | Açık — 2B PixiJS aktif |
| B2 | 3B Cihaz Modelleri | 🟠 Yuksek | Açık |
| B3 | 3B Scene Graph (kamera/isiklandirma) | 🟠 Yuksek | Açık |

### C. Konfigurasyon Odakli Grafik Motoru

| # | Eksik | Onem | Durum (2026-08) |
|:--|:------|:-----|:-----------------|
| C1 | Config-Driven Device Renderer | 🔴 Kritik | Açık — BSC/TMS hardcoded; `DeviceDefinition` bazli otomatik render yok |
| C2 | Auto-Layout Motoru | 🟠 Yuksek | Açık |
| C3 | Eksik Cihaz Grafikleri (PCS, trafo, grid, jenerator) | 🟠 Yuksek | Açık — PCS/EMU cihazi eklendi, grafik kismen |
| C4 | Dinamik Topoloji (edge → kablo) | 🟡 Orta | Açık — `ConnectionPoint` tanimli, kablo ciziminde kullanilmiyor |

### D. Editor Gelistirmeleri

| # | Eksik | Onem | Durum (2026-08) |
|:--|:------|:-----|:-----------------|
| D1 | Register Map Editor | 🔴 Kritik | Açık |
| D2 | Config Export → Device-Service (deploy) | 🔴 Kritik | Açık |
| D3 | Manevra Builder (gorsel) | 🟠 Yuksek | Açık — 18 manevra hâlâ TS sabiti |
| D4 | Project Load by URL | 🟡 Orta | Açık |
| D5 | Copy/Paste, Multi-Select, Grouping | 🟡 Orta | Açık |
| D6 | Undo Surekliligi | 🟡 Orta | Açık |
| D7 | Import (JSON yukle) | 🟡 Orta | Açık — export var |
| D8 | Node Resizing / Custom Theming | 🟢 Dusuk | Açık |

### E. Alarm ve Olay Sistemi

| # | Eksik | Onem | Durum (2026-08) |
|:--|:------|:-----|:-----------------|
| E1 | Alarm Evaluation Engine | 🔴 Kritik | Açık — `AlarmRuleDefinition` tanimli, motor yok |
| E2 | Alarm Dashboard UI | 🟠 Yuksek | Açık |
| E3 | Alarm Escalation / Notification | 🟡 Orta | Açık |
| E4 | Alarm History | 🟡 Orta | Açık |

### F. Low-Code Expression / Otomasyon

| # | Eksik | Onem | Durum (2026-08) |
|:--|:------|:-----|:-----------------|
| F1 | Expression Engine | 🟠 Yuksek | Açık |
| F2 | Trigger-Action Kurallari | 🟠 Yuksek | Açık |
| F3 | Custom Scripting | 🟡 Orta | Açık — plugin SDK mevcut (integration tarafinda) |

### G. Protokol ve Cihaz Iletisimi

| # | Eksik | Onem | Durum (2026-08) |
|:--|:------|:-----|:-----------------|
| G1 | CANbus Adapter | 🟠 Yuksek | Açık — stub |
| G2 | MQTT Adapter | 🟠 Yuksek | Açık — stub |
| G3 | OPC-UA, IEC 61850, DNP3, BACnet | 🟡 Orta | Açık |

### H. Raporlama ve Veri Analizi

| # | Eksik | Onem | Durum (2026-08) |
|:--|:------|:-----|:-----------------|
| H1 | Report Builder | 🟠 Yuksek | Açık — `reports` feature placeholder |
| H2 | Enerji Hesaplamalari (kWh, maliyet, verim) | 🟠 Yuksek | Açık |
| H3 | PDF/CSV/Excel Export | 🟡 Orta | Açık |
| H4 | Data Export (ham veri) | 🟡 Orta | Açık |

### I. Coklu Musteri / Site Yonetimi

| # | Eksik | Onem | Durum (2026-08) |
|:--|:------|:-----|:-----------------|
| I1 | Site/Location Hierarchy | 🟠 Yuksek | Kısmen — field/boss uygulamalari + `fieldIds` var; site hiyerarsisi modeli yok |
| I2 | Per-Site Dashboard | 🟠 Yuksek | Kısmen — field app; boss genel bakis |
| I3 | Cross-Site Aggregation | 🟡 Orta | Açık |

### J. Altyapi ve Operasyonel Eksikler

| # | Eksik | Onem | Durum (2026-08) |
|:--|:------|:-----|:-----------------|
| J1 | Test Coverage | 🔴 Kritik | 🟡 **Ilerledi** — yüzlerce test var; kapsam borçlari TESTING.md §2'de |
| J2 | CI/CD Pipeline | 🟠 Yuksek | 🟡 **Ilerledi** — e2e/perf/sonar/storybook workflow'lari var; unit-test workflow eksik |
| J3 | API Rate Limiting | 🟠 Yuksek | Açık — nis-2.md'de planli |
| J4 | Security Hardening | 🟠 Yuksek | 🟡 **Kısmen** — ASVS L2 hedefi + NIS2/ISO adimlari; **JWT localStorage hâlâ açık** (XSS riski) |
| J5 | Real-time Collaboration (editor) | 🟡 Orta | Açık |
| J6 | Versioning / Audit Trail | 🟡 Orta | 🟡 Kısmen — tamper-evident audit log (NIS2 Adım 5-7), `session_audit`; konfigurasyon degisiklik gecmisi yok |
| J7 | User Management UI | 🟡 Orta | Açık — backend CRUD var, UI yok |
| J8 | Mobile / PWA | 🟢 Dusuk | Açık — field app mobil oncelikli tasarim |

### K. Bos / Stub Paketler

| # | Paket | Durum (2026-08) |
|:--|:------|:-----------------|
| K1 | `packages/shared-utils` | Hâlâ boş — ConfigLoader plani (TESTING.md: test hedefi exit 1, Faz 0 öncesi düzeltilecek) |
| K2 | `apps/backend` | **Kaldırıldı** — artık repo'da yok |
| K3 | `packages/ui/src/graphics/devices` | 🟡 Artık dolu degil — `deprecated/` + yeni `system/`, `elements/` yapisi var |
| K4 | `packages/ui/src/graphics/hooks` | `usePixiTickerEffect` mevcut — ticker throttle'lar burada |

## Onerilen v2.0 Paket Mimarisi (tarihsel öneri — EDITOR-MIMARISI'ne kismen işlendi)

```
NEW PACKAGES (onerilen, 2025):
├── dashboard-engine/          # ScreenConfig tipleri, widget registry, runtime renderer
├── alarm-engine/              # Kural degerlendirme, bildirim, acknowledge
├── expression-engine/         # Formul parser, hesaplanmis metrikler, trigger-action
├── layout-engine/             # Auto-layout (force-directed, hierarchical)
```

> **Güncelleme (2026-08):** Editör paket mimarisi önerisi revize edildi — yeni platform paketleri (`config-engine`, `runtime-engine`, `app-builder`) iptal; editör mantigi `apps/editor` içinde, validasyon `shared-types` şemalarıyla. Detay: [EDITOR-MIMARISI.md](../architecture/EDITOR-MIMARISI.md) + `docs/archived/editor-phase-*.md` (SUPERSEDED).

## Oncelik Siralamasi (tarihsel — güncel sıra için ui-v2-plan.md)

| Oncelik | Faz | Kapsam |
|:--------|:----|:-------|
| **P0** | Faz 1 | A1-A6, C1, D1-D2 |
| **P1** | Faz 2 | B1-B3, E1-E2, G1-G2 |
| **P2** | Faz 3 | D3, F1-F2, H1-H2, I1-I2 |
| **P3** | Faz 4 | J1-J8, C2-C4 |
