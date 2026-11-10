---
status: active
space: architecture
tags: [mimari, ws-tunnel, agent, zero-trust, spec]
review_date: 2026-11-10
---

# WS Tunnel — Agent — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `WS-TUNNEL-CEKIRDEK-MIMARISI.md`, `WS-TUNNEL-HUB-MIMARISI.md`, `AUTH-MIMARISI.md` (agent kimliği).

## 1. Amaç ve Bağlam

Peer agent (ayrı proje): config parse/merge, bootstrap claim, HMAC imzalı token, ilk açılış setup UI, systemd kurulumu, tek binary CLI (`run/setup/wizard/uninstall/config show`) ve runtime wiring (connector + client + session server).

| Katman | Kapsam |
|:-------|:-------|
| dahil | Config, claim, HMAC, setup, systemd/install/uninstall, CLI, runtime wiring |
| hariç | Wire/connector (ÇEKIRDEK), hub tarafı (HUB) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Zorunlu: `HUB_URL`/`SERVICE_ID`/`LOCAL_TARGET` + kimlik (`PEER_TOKEN` ∨ `BOOTSTRAP_TOKEN` ∨ `PEER_SECRET`); `PEER_ID` yoksa hostname | Config fail-fast |
| K2 | `TLS_INSECURE` YALNIZ https hedefte etkin | Yanlış bypass yok |
| K3 | `mergeConfigEnv`: env dosyayı ezer AMA secret dosyada varsa korunur (kalıcı `PEER_SECRET`, tek kullanımlık token'ı ezer) | Kimlik kalıcılığı |
| K4 | Claim **fail-closed**: ağ hatası / 4xx / `peerId` uyuşmazlığı → tunnel BAŞLAMAZ | Kimliksiz tünel yok |
| K5 | Setup: bootstrap TEK kullanımlık — `/test` bir kez claim eder, `/save` aynı token'ı yeniden claim ETMEZ; eşzamanlı kaydetme 409; `HUB_SECRET` yoksa üretilir | Kurulum güvenli |
| K6 | JWT `type:"container-session"` etiketi; `JoseSignerForTests` agent'ta YASAK | Token karışması yok |
| K7 | Systemd unit: `Restart=always`, `After/Wants=network-online.target`; config **0600**, unit 0644, binary 0755 | Dayanıklı servis |
| K8 | Uninstall: `systemctl` hatası YUTULUR, dosya temizliği her durumda yapılır | Temiz kaldırma |
| K9 | Tek binary CLI: `run|setup|wizard|uninstall|config show`; bilinmeyen komut hata | Tek giriş |
| K10 | Runtime: `TunnelConnector` + `TunnelClient` + `ClientSessionServer`; backoff 200→2000 ms; `NODE_TLS_REJECT_UNAUTHORIZED=0` yalnız `tlsInsecure && https`; `stop()` sırası sessionServer → connector → tunnelClient | Doğru yaşam döngüsü |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `run.ts`/`cli.ts` testsiz — agent'ın tek gerçek entegrasyon noktası | `zero-trust-application-tunnel/ws-tunnel-agent/src/run.ts` |

## 4. Mimari

```text
CLI (args) ──► run | setup | wizard | uninstall | config show
                 │
run: parseAgentConfig ──► claim (fail-closed) ──► TunnelConnector ──► TunnelClient
                                                      └──► ClientSessionServer (HMAC token)

setup: SetupAgent (/test bir kez claim, /save kalıcı config) ──► systemd unit
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `zero-trust-application-tunnel/ws-tunnel-agent/src/config.ts#parseAgentConfig` | Config |
| `zero-trust-application-tunnel/ws-tunnel-agent/src/claim-client.ts#BootstrapClaimClient` | Claim |
| `zero-trust-application-tunnel/ws-tunnel-agent/src/hmac-signer.ts#signAgentToken` | İmza |
| `zero-trust-application-tunnel/ws-tunnel-agent/src/setup-server.ts#SetupAgent` | Setup |
| `zero-trust-application-tunnel/ws-tunnel-agent/src/systemd-unit.ts#renderSystemdUnit` | Unit |
| `zero-trust-application-tunnel/ws-tunnel-agent/src/install.ts#uninstallAgent` | Kurulum |
| `zero-trust-application-tunnel/ws-tunnel-agent/src/run.ts#startAgent` | Wiring |

## 5. Purity Kuralları (ZORUNLU)

1. Secret dosyası 0600; log'da secret yok (K3/K7).
2. Claim fail-closed (K4).
3. Tek binary CLI (K9).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Config + Kimlik

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: zorunlu alanlar, env/dosya merge, secret koruma, mask
- hariç: claim (UC-2)

**Akış:**
1. Config parse edilir; zorunlu alanlar doğrulanır.
2. Env dosyayı ezer; dosyadaki secret korunur.
3. `maskConfig` log için maskeler.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Dosyadaki `PEER_SECRET` env token'ı ezer | AK-1.1 |
| FR-1.2 | `TLS_INSECURE` yalnız https'te etkin | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** dosyada PEER_SECRET, env'de BOOTSTRAP_TOKEN **WHEN** merge **THEN** PEER_SECRET kazanır
2. **AK-1.2 — GIVEN** http hedef + TLS_INSECURE **WHEN** config **THEN** etkin değil

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Merge | unit (`config.test.ts`) | ⬜ |
| AK-1.2 | TLS | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Eksik zorunlu alan | Fail-fast |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel-agent/src/config.ts` | Config |

### 6.2 UC-2 — Bootstrap Claim + Setup

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: claim fail-closed, tek kullanımlık setup, 409, HUB_SECRET üretimi
- hariç: systemd (UC-3)

**Akış:**
1. `/test` bootstrap'ı bir kez claim eder.
2. `/save` aynı token'ı yeniden claim etmez; config yazar.
3. Eşzamanlı kaydetme 409.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Claim hatası tunnel başlatmaz | AK-2.1 |
| FR-2.2 | Setup bootstrap'ı ikinci kez claim etmez | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** hub erişilemez **WHEN** claim **THEN** tunnel başlamaz
2. **AK-2.2 — GIVEN** /test yapıldı **WHEN** /save **THEN** yeniden claim yok

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Fail-closed | unit (`claim-client.test.ts`) | ⬜ |
| AK-2.2 | Tek kullanım | unit (`setup-server.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| peerId uyuşmazlığı | Red |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel-agent/src/{claim-client,setup-server}.ts` | Claim/setup |

### 6.3 UC-3 — Kurulum / Uninstall

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: systemd unit, dosya izinleri, uninstall sırası
- hariç: runtime (UC-4)

**Akış:**
1. Unit dosyası üretilir; config 0600 yazılır.
2. Uninstall'da systemctl hatası yutulur, dosyalar silinir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Config 0600, unit 0644, binary 0755 | AK-3.1 |
| FR-3.2 | Uninstall her durumda dosyaları temizler | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** kurulum **WHEN** izinler kontrol edilir **THEN** 0600/0644/0755
2. **AK-3.2 — GIVEN** systemctl hatası **WHEN** uninstall **THEN** dosyalar silinir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | İzinler | unit (`install.test.ts`) | ⬜ |
| AK-3.2 | Temizlik | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Unit zaten var | Üzerine yazılır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel-agent/src/{systemd-unit,install}.ts` | Kurulum |

### 6.4 UC-4 — Runtime Wiring

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: startAgent kompozisyonu, backoff, stop sırası, TLS bypass koşulu
- hariç: connector çekirdeği (ÇEKIRDEK)

**Akış:**
1. `startAgent` connector + client + session server kurar.
2. `stop()` ters sırada kapatır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | `stop()` sırası sessionServer → connector → tunnelClient | AK-4.1 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** çalışan agent **WHEN** stop **THEN** kaynaklar sırayla kapanır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Kapanış | kod inceleme + smoke (test borcu B1) | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 smoke/kanıtını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| tlsInsecure + http | NODE_TLS_REJECT_UNAUTHORIZED set edilmez |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel-agent/src/run.ts` | Wiring |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Claim hatası | Tunnel başlamaz |
| Setup tekrar claim | 409 |
| systemctl hatası | Yutulur, temizlik sürer |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Config/claim/setup testli (31 test) | komut |
| SC-2 | İzinler kanıtlı | komut |
| SC-3 | Runtime smoke | İleri İş |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 7 test dosyası / 31 test |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-4 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `WS-TUNNEL-AGENT-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | `run.ts`/`cli.ts` smoke testi (B1) | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Runtime smoke testi (A1).
2. Windows servis desteği (talep doğarsa).

## 12. T Görev Özeti

| T-1 | UC-1 (config/kimlik) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (claim/setup) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (kurulum) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (runtime) smoke/kanıtının eşleştirilmesi |
