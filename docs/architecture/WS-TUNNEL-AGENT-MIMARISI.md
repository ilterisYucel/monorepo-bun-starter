---
status: active
space: architecture
tags: [mimari, ws-tunnel, agent, cli, wizard, bootstrap, systemd, docker]
review_date: 2026-11-20
---

# WS-TUNNEL Agent — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** [WS-TUNNEL-HUB-SERVIS-MIMARISI.md](./WS-TUNNEL-HUB-SERVIS-MIMARISI.md), [WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md](./WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md), [WS-TUNNEL-P4-DOGRULAMA-KAPANIS.md](./WS-TUNNEL-P4-DOGRULAMA-KAPANIS.md)

## 1. Amaç ve Bağlam

`tools/peer-agent.mjs` bugün yalnız env-var ile konfigüre edilen, test imzalayıcısı (`JoseSignerForTests`) kullanan ve dağıtım otomasyonu olmayan tek bir script'tir. Ürünleşme için agent'ı:

- **tek binary + alt komutlar** olarak paketlemek (`run/wizard/setup/uninstall/config show`),
- **config dosyası veya env** ile beslemek (compose ve systemd aynı çekirdeği kullansın),
- **hub'ın ürettiği kimlikle** (bootstrap claim → kalıcı `peerSecret`) ayağa kaldırmak,
- **production HMAC imzalayıcı** kullanmak (test helper'ı yerine),
- **ilk açılışta setup UI** ile (container modu) token girip çalıştırmak,
- **systemd wizard** ile cihazda servis olarak kurmak.

| Katman | Dahil | Hariç |
|:--|:--|:--|
| Agent çekirdeği (config, imzalayıcı, claim) | ✅ | — |
| Setup UI (first-boot) | ✅ | Kalıcı yönetim paneli |
| Sistemd kurulum (wizard) | ✅ | Windows/macOS servis yöneticileri |
| Docker dağıtımı (Dockerfile + compose örneği) | ✅ | Hub UI / credential paneli |
| Çoklu servis (tek agent → N target) | ❌ (A1) | — |

## 2. Kararlar (kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | **Tek binary + alt komutlar** | `agent run` (varsayılan), `agent wizard`, `agent setup`, `agent uninstall`, `agent config show`; ayrı wizard binary'si YOK |
| K2 | **Ortak config yüzeyi: env + env-file** | Aynı anahtarlar; `run` env'den okur, `--config <dosya>` env-file yükler. `PEER_ID` verilmezse hostname |
| K3 | **İki kimlik modu** | `PEER_TOKEN` (env modu, paylaşımlı) ∨ `BOOTSTRAP_TOKEN` (sqlite modu: `POST /peers/bootstrap/claim` → kalıcı `PEER_SECRET` config'e yazılır, tek kullanımlık; hata → fail-closed) |
| K4 | **Production HMAC imzalayıcı** | `jose` HS256; secret kurulumda rastgele üretilir (`HUB_SECRET`), `JoseSignerForTests` agent'ta KULLANILMAZ |
| K5 | **Setup UI yalnız config yokken** | İlk açılışta tek sayfa (form + test + kaydet); config oluşunca kapanır. Port varsayılan 8080, `--setup-port` ile ezilir; `--setup` bayrağı yeniden yapılandırma için |
| K6 | **İki dağıtım modu** | Docker (`Dockerfile` + `compose.example.yml`, config volume) ve systemd (wizard unit üretir: `/opt/<ad>/agent`, `/etc/<ad>/agent.env`, `<ad>.service`) |
| K7 | **Hub UI YOK** | Bootstrap token `POST /admin/peers` (curl/admin API) ile üretilir; hub'a panel eklenmez (YAGNI) |
| K8 | **Agent başına tek servis** | Tek `SERVICE_ID` + tek `LOCAL_TARGET`; çok cihaz = çok agent (çoklu servis A1'de) |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Agent yalnız env-var okur; config dosyası/CLI yok | `tools/peer-agent.mjs#requireEnv` |
| B2 | Agent production yerine test imzalayıcısı kullanır (sabit zayıf secret) | `tools/peer-agent.mjs` → `JoseSignerForTests` |
| B3 | TLS doğrulama kapatma hardcoded (https hedefte koşulsuz) | `tools/peer-agent.mjs` (`NODE_TLS_REJECT_UNAUTHORIZED`) |
| B4 | Bootstrap claim akışı hub'da hazır; agent tarafında istemci yok | `hub-servis/src/application/claim-bootstrap.ts`, `routes/bootstrap-routes.ts` |
| B5 | Dağıtım otomasyonu yok (scp + elle env) | `revpi-agent-check`/KAPANIŞ A.14 dağıtım dersi |

## 4. Mimari

### 4.1 Modül yerleşimi

```
packages/ws-tunnel-agent/
├── package.json                 # @gd-monorepo/ws-tunnel-agent
├── vitest.config.ts
├── tsconfig.json
├── Dockerfile
├── compose.example.yml
└── src/
    ├── config.ts                # parse/validate/serialize/mask (saf)
    ├── jose-hmac-signer.ts      # ITokenSigner (HS256)
    ├── claim-client.ts          # POST /peers/bootstrap/claim (fetch enjekte)
    ├── systemd-unit.ts          # unit dosyası üretimi (saf)
    ├── setup-page.ts            # tek sayfa HTML (statik)
    ├── setup-server.ts          # first-boot UI + test/kaydet handler'ları
    ├── run.ts                   # TunnelConnector/TunnelClient/ClientSessionServer wiring
    ├── cli.ts                   # arg parse + alt komut dağıtımı
    └── index.ts                 # barrel
```

### 4.2 Akışlar

**Container (setup UI):**
1. `agent setup --config /etc/agent/agent.env --setup-port 8080` (veya config yokken otomatik)
2. UI: hub URL + token (PEER_TOKEN ∨ BOOTSTRAP_TOKEN) + peer/service id + local target + TLS bayrağı
3. "Test et" → `POST /test`: config doğrula + hub `/health` + (bootstrap ise) claim dene
4. "Kaydet" → `POST /save`: config'i dosyaya yaz (0600), UI kapanır, tunnel başlar

**Cihaz (systemd wizard):**
1. `agent wizard` → sorular (hub URL, auth modu, token, peer id önerisi=hostname, local target, TLS bayrağı)
2. bootstrap ise: claim → `peerSecret` config'e yazılır; ekranda hub'da token üretme curl komutu gösterilir
3. `/etc/<ad>/agent.env` + `/etc/systemd/system/<ad>.service` yazılır → `daemon-reload` → `enable --now`

**Çalışma (run):**
1. Config yükle (dosya yoksa env)
2. `BOOTSTRAP_TOKEN` varsa ve `PEER_SECRET` yoksa: claim → secret'ı config'e yaz → devam
3. `TunnelConnector` + `TunnelClient` + `ClientSessionServer` (HMAC signer) → connect
4. SIGTERM/SIGINT → graceful shutdown

## 5. Purity Kuralları

1. `config.ts`, `systemd-unit.ts`, `setup-page.ts` **saf** — env/fs/network okumaz; girdi parametre, çıktı veri.
2. `claim-client.ts` `fetch`'i enjekte eder (testte fake).
3. Dosya yazma / süreç yönetimi (`systemctl`, `fs.writeFile`) yalnız `cli.ts`/`setup-server.ts` (kenar katman).
4. Hiçbir modül `process.exit` çağırmaz; CLI sonucu kod olarak `main()` döner.

## 6. Use Case'ler

### 6.1 UC-1 — Agent config (parse/validate/serialize)

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: env/env-file parse, varsayılanlar (PEER_ID=hostname), doğrulama (fail-fast), maskeli gösterim, env-file yazımı.
- hariç: secret üretimi (UC-2/UC-3), ağ bağlantısı.

**Akış:**
1. Kaynak seçilir: `--config` dosyası veya `process.env`.
2. Anahtarlar normalize edilir; zorunlu alanlar doğrulanır.
3. `AgentConfig` döner (saf veri).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Zorunlu anahtarlar (`HUB_URL`, `SERVICE_ID`, `LOCAL_TARGET`) eksikse anlaşılır hata ile reddedilmeli | AK-1.1 |
| FR-1.2 | `PEER_ID` yoksa hostname kullanılmalı; `PEER_TOKEN` ∨ `BOOTSTRAP_TOKEN` ∨ `PEER_SECRET` en az biri zorunlu | AK-1.2 |
| FR-1.3 | `HUB_URL` http/https olmalı; `LOCAL_TARGET` http/https olmalı; geçersizse reddedilmeli | AK-1.3 |
| FR-1.4 | `TLS_INSECURE=1` yalnız https `LOCAL_TARGET` için geçerli; secret'lar `config show`'da maskelenmeli | AK-1.4 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** `HUB_URL` yok **WHEN** config ayrıştırılır **THEN** `HUB_URL zorunlu` hatası döner.
2. **AK-1.2 — GIVEN** `PEER_ID` yok **WHEN** config ayrıştırılır **THEN** hostname kullanılır; token alanlarının hiçbiri yoksa reddedilir.
3. **AK-1.3 — GIVEN** `HUB_URL=ftp://x` **WHEN** config ayrıştırılır **THEN** protokol hatası döner.
4. **AK-1.4 — GIVEN** `PEER_TOKEN=abc` **WHEN** `config show` üretilir **THEN** token maskelenir.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Zorunlu alan reddi | unit | ✅ |
| AK-1.2 | Hostname varsayılanı + kimlik zorunluluğu | unit | ✅ |
| AK-1.3 | URL/protokol doğrulaması | unit | ✅ |
| AK-1.4 | TLS bayrağı + secret maskeleme | unit | ✅ |

**T Görev Listesi:**
- [ ] T-1: `config.ts` + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| env-file'da tırnaklı değer | Tırnaklar temizlenir |
| `TLS_INSECURE=1` + http hedef | Yoksayılır (uyarı) |
| Boş string değer | Zorunlu alan sayılır (eksik) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ws-tunnel-agent/src/config.ts` | YENİ |
| `packages/ws-tunnel-agent/src/config.test.ts` | YENİ |

### 6.2 UC-2 — Bootstrap claim + kalıcı secret

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: bootstrap token → `POST /peers/bootstrap/claim` → `peerSecret`; secret'ın config dosyasına kalıcı yazımı; bootstrap token'ın tekrar kullanılmaması.
- hariç: hub tarafı (hazır), secret rotasyonu.

**Akış:**
1. `BOOTSTRAP_TOKEN` var, `PEER_SECRET` yok → claim çağrısı.
2. Yanıt `{peerId, peerSecret}`; `peerId` config'tekiyle eşleşmeli.
3. `PEER_SECRET` config dosyasına yazılır (0600); `BOOTSTRAP_TOKEN` dosyadan temizlenir.
4. Sonraki başlatmalar `PEER_SECRET` ile.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Claim `POST {HUB_URL}/peers/bootstrap/claim` gövdesi `{peerId, bootstrapToken}` olmalı | AK-2.1 |
| FR-2.2 | Başarılı claim sonrası `peerSecret` config'e yazılmalı; bootstrap token temizlenmeli | AK-2.2 |
| FR-2.3 | Claim hatası (4xx/ağ) fail-closed olmalı; tunnel başlamamalı, anlaşılır hata verilmeli | AK-2.3 |
| FR-2.4 | Yanıttaki `peerId` istenen `peerId` ile eşleşmezse reddedilmeli | AK-2.4 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** geçerli bootstrap token **WHEN** claim çağrılır **THEN** istek `{peerId, bootstrapToken}` ile gider.
2. **AK-2.2 — GIVEN** başarılı claim yanıtı **WHEN** config yazılır **THEN** `PEER_SECRET` dosyada, `BOOTSTRAP_TOKEN` dosyada yok.
3. **AK-2.3 — GIVEN** hub 401/geçersiz token **WHEN** claim çağrılır **THEN** hata döner ve tunnel başlamaz.
4. **AK-2.4 — GIVEN** yanıtta farklı peerId **WHEN** claim işlenir **THEN** reddedilir.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Claim istek sözleşmesi | unit | ✅ |
| AK-2.2 | Secret kalıcılığı + token temizliği | unit | ✅ |
| AK-2.3 | Fail-closed hata | unit | ✅ |
| AK-2.4 | PeerId eşleşme kontrolü | unit | ✅ |

**T Görev Listesi:**
- [ ] T-2: `claim-client.ts` + testler
- [ ] T-3: secret kalıcılığı (config yazımı) + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Bootstrap token zaten kullanılmış | Hub 4xx → fail-closed hata |
| Config dosyası yazılamıyor | Hata; tunnel başlamaz |
| `PEER_SECRET` zaten var | Claim atlanır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ws-tunnel-agent/src/claim-client.ts` | YENİ |
| `packages/ws-tunnel-agent/src/claim-client.test.ts` | YENİ |

### 6.3 UC-3 — Setup UI (first-boot)

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: config yokken tek sayfa UI; form alanları; `POST /test` (doğrulama + hub erişimi + claim denemesi); `POST /save` (config yazımı); port ezme; config oluşunca UI kapanır.
- hariç: kalıcı yönetim paneli, çok kullanıcı, TLS'li UI.

**Akış:**
1. Config yoksa (veya `--setup`) `--setup-port` (varsayılan 8080) üzerinde UI açılır.
2. Kullanıcı formu doldurur → "Test et" → `/test` doğrular, hub `/health` çağırır, bootstrap ise claim dener.
3. "Kaydet" → `/save` config'i yazar → UI kapanır → `run` başlar.
4. Config varsa setup modu açılmaz (yeniden yapılandırma `--setup`).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Config yoksa setup UI `--setup-port`ta (varsayılan 8080) açılmalı; config varsa açılmamalı | AK-3.1 |
| FR-3.2 | `POST /test` config doğrulaması + hub `/health` + (bootstrap) claim sonucu dönmeli | AK-3.2 |
| FR-3.3 | `POST /save` geçerli config'i dosyaya yazmalı ve `PEER_SECRET` üretilmişse kalıcılaştırmalı | AK-3.3 |
| FR-3.4 | Geçersiz form/kaydetme isteği 400 + alan hatası dönmeli; UI 500'de sızmamalı | AK-3.4 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** config dosyası yok **WHEN** agent başlar **THEN** setup UI portu dinlenir; **GIVEN** config var **THEN** UI açılmaz.
2. **AK-3.2 — GIVEN** geçerli form **WHEN** `/test` çağrılır **THEN** hub erişimi ve claim sonucu raporlanır.
3. **AK-3.3 — GIVEN** geçerli form **WHEN** `/save` çağrılır **THEN** config dosyası yazılır, secret kalıcıdır.
4. **AK-3.4 — GIVEN** eksik alan **WHEN** `/save` çağrılır **THEN** 400 + alan hatası döner.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | First-boot kapısı | unit | ✅ |
| AK-3.2 | Test akışı | unit | ✅ |
| AK-3.3 | Kaydet akışı | unit | ✅ |
| AK-3.4 | Girdi doğrulama | unit | ✅ |

**T Görev Listesi:**
- [ ] T-4: `setup-page.ts` + `setup-server.ts` + testler
- [ ] T-5: `cli.ts` (run/setup/wizard) + `run.ts` wiring

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Setup sırasında hub erişilemez | `/test` hata döner; kaydetmeye izin verilir (offline kurulum) |
| Aynı anda iki kaydet isteği | İkincisi 409 |
| Port dolu | Açılış hatası (anlaşılır) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ws-tunnel-agent/src/setup-page.ts` | YENİ |
| `packages/ws-tunnel-agent/src/setup-server.ts` | YENİ |
| `packages/ws-tunnel-agent/src/cli.ts` | YENİ |
| `packages/ws-tunnel-agent/src/run.ts` | YENİ |

### 6.4 UC-4 — Dağıtım (systemd + Docker)

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: systemd unit üretimi (saf), wizard'ın dosyaları yazması, `Dockerfile` + `compose.example.yml`.
- hariç: paket yöneticisi dağıtımı (apt/rpm), otomatik güncelleme.

**Akış:**
1. Wizard: `/etc/<ad>/agent.env` + `/etc/systemd/system/<ad>.service` yazar → `daemon-reload` → `enable --now`.
2. Docker: imaj derlenir; config volume'e yazılır; container `agent run --config` ile başlar.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Unit dosyası `Restart=always`, `After/Wants=network-online.target`, `ExecStart=<binary> run --config <env>` içermeli | AK-4.1 |
| FR-4.2 | Dockerfile config volume'ü + setup portu expose etmeli; imaj standalone binary çalıştırmalı | AK-4.2 |
| FR-4.3 | `compose.example.yml` env/env_file + `restart: unless-stopped` + secret volume içermeli | AK-4.3 |
| FR-4.4 | `uninstall` servisi durdurup disable etmeli ve unit/config dosyalarını silmeli | AK-4.4 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** wizard girdileri **WHEN** unit üretilir **THEN** zorunlu satırlar doğru yazılır.
2. **AK-4.2 — GIVEN** Dockerfile **WHEN** imaj derlenir **THEN** standalone binary çalışır ve config volume'ü tanımlıdır.
3. **AK-4.3 — GIVEN** compose örneği **WHEN** `docker compose config` çalışır **THEN** geçerli env/volume/restart tanımları görünür.
4. **AK-4.4 — GIVEN** kurulu servis **WHEN** `uninstall` çağrılır **THEN** servis durur, dosyalar silinir.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Unit şablonu | unit | ✅ |
| AK-4.2 | Docker imajı | manuel | ✅ |
| AK-4.3 | Compose geçerliliği | manuel | ✅ |
| AK-4.4 | Uninstall | unit | ✅ |

**T Görev Listesi:**
- [ ] T-6: `systemd-unit.ts` + testler
- [ ] T-7: `Dockerfile` + `compose.example.yml`
- [ ] T-8: `uninstall` + wizard dosya yazımı

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| systemd yok (container içi) | Wizard anlaşılır hata verir |
| Unit zaten var | Üzerine yazılır (idempotent) |
| Config volume read-only | Kaydetme hatası |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ws-tunnel-agent/src/systemd-unit.ts` | YENİ |
| `packages/ws-tunnel-agent/Dockerfile` | YENİ |
| `packages/ws-tunnel-agent/compose.example.yml` | YENİ |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Config yok | Setup UI açılır; tunnel başlamaz |
| Config var, `PEER_SECRET` yok, `BOOTSTRAP_TOKEN` var | Claim → secret yazılır → tunnel |
| Config var, kimlik yok | Fail-fast hata (config doğrulama) |
| Claim 4xx (kullanılmış/geçersiz token) | Fail-closed: tunnel yok, anlaşılır hata |
| Hub erişilemez (çalışma anı) | TunnelConnector backoff ile yeniden dener |
| SIGTERM/SIGINT | Graceful shutdown (connector/session/tunnel durur) |
| Setup kaydetme hatası | UI'de hata; config yazılmaz |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Tek binary ile `run/wizard/setup/uninstall/config show` çalışır | CLI smoke |
| SC-2 | Bootstrap claim → kalıcı secret → ikinci başlatmada token'sız bağlanır | `claim-client` + `run` testleri |
| SC-3 | Config yokken setup UI açılır, config varken açılmaz | `setup-server` testleri |
| SC-4 | systemd unit ve compose örneği doğrulamadan geçer | unit testi + `docker compose config` |
| SC-5 | Agent'ta `JoseSignerForTests` importu yok | grep kapısı |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | T-1..T-8 sözleşmeleri (config/claim/unit/setup) |
| 3. TEST | `*.test.ts` — config, claim, setup, unit, uninstall (kırmızı) |
| 4. IMPL | Modül dosyaları + Dockerfile + compose örneği + CLI |
| 5. KAPANIŞ | `WS-TUNNEL-AGENT-KAPANIS.md` (Doğrulama + Test Kapsamı) |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Çoklu servis (tek agent → N target) | Ertelendi — K8; ayrı SPEC gerektirir |
| A2 | Windows/macOS servis yöneticileri | Ertelendi — v1 systemd/Docker |
| A3 | Hub credential UI | K7 ile kapsam dışı (curl/admin API) |
| A4 | Otomatik güncelleme (self-update) | Ertelendi |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Çoklu servis/target eşlemesi (TunnelClient routing genişletmesi).
2. Agent metrikleri (`/metrics`) ve uzaktan yapılandırma.
3. npm paketi olarak yayın (ws-tunnel ürün ayrımı ile).

## 12. T Görev Özeti

| T | Görev | UC |
|:--|:------|:---|
| T-1 | `config.ts` + testler | UC-1 |
| T-2 | `claim-client.ts` + testler | UC-2 |
| T-3 | Secret kalıcılığı (config yazımı) + testler | UC-2 |
| T-4 | `setup-page.ts` + `setup-server.ts` + testler | UC-3 |
| T-5 | `cli.ts` (run/setup/wizard/uninstall/config show) + `run.ts` wiring | UC-3 |
| T-6 | `systemd-unit.ts` + testler | UC-4 |
| T-7 | `Dockerfile` + `compose.example.yml` | UC-4 |
| T-8 | `uninstall` + wizard dosya yazımı | UC-4 |
