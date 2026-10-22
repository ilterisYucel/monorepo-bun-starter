---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, ws-tunnel, agent, cli, wizard, bootstrap, docker]
review_date: 2026-11-20
---

# WS-TUNNEL Agent — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [WS-TUNNEL-AGENT-MIMARISI.md](./WS-TUNNEL-AGENT-MIMARISI.md) (onaylı — AK/FR/SC kaynağı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/ws-tunnel-agent/src/config.ts#parseAgentConfig` | Env/env-file parse + doğrulama + maskeleme | K2, FR-1.1..1.4 |
| 2 | `packages/ws-tunnel-agent/src/hmac-signer.ts#signAgentToken` | Production HS256 imzalayıcı + rastgele secret | K4, SC-5 |
| 3 | `packages/ws-tunnel-agent/src/claim-client.ts#BootstrapClaimClient` | `POST /peers/bootstrap/claim` istemcisi (fail-closed) | K3, FR-2.1..2.4 |
| 4 | `packages/ws-tunnel-agent/src/install.ts#writeAgentConfigFile` | Config 0600 yazımı, unit yazımı, binary kopyalama, uninstall | FR-2.2, FR-4.4 |
| 5 | `packages/ws-tunnel-agent/src/systemd-unit.ts#renderSystemdUnit` | systemd unit üretimi | FR-4.1 |
| 6 | `packages/ws-tunnel-agent/src/setup-server.ts#SetupAgent` | First-boot test/kaydet akışı + claim caching | K5, FR-3.1..3.4 |
| 7 | `packages/ws-tunnel-agent/src/setup-page.ts#renderSetupPage` | Tek sayfa setup UI | K5 |
| 8 | `packages/ws-tunnel-agent/src/run.ts#startAgent` | Tunnel wiring + HMAC oturum imzalayıcı | K1, K4 |
| 9 | `packages/ws-tunnel-agent/src/cli.ts#main` | `run/setup/wizard/uninstall/config show` | K1, K6 |
| 10 | `packages/ws-tunnel-agent/Dockerfile` | Standalone binary + config volume + setup portu | K6, FR-4.2 |
| 11 | `packages/ws-tunnel-agent/compose.example.yml` | Compose örneği (env/env_file + restart + volume) | K6, FR-4.3 |
| 12 | `tools/peer-agent.mjs` | İnce wrapper (yeni agent modülünü kullanır) | B1, B2 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Agent birimi | `npx vitest run` (`packages/ws-tunnel-agent`) | 29/29 yeşil |
| Tüm workspace | `bun run test` | 2576/2576 (312 dosya) yeşil |
| Tip kontrolü | `npx tsc --noEmit -p packages/ws-tunnel-agent` | 0 hata |
| Uçtan uca (RevPi tarzı) | `bun tools/revpi-agent-check.mjs` | 7/7 PASS |
| CLI smoke | `agent --help`, `agent config show` | Beklenen çıktı |
| Setup UI smoke | `agent setup --setup-port 18101` + `/test`, `/save` | 200 + config 0600 yazıldı, tünel başladı |
| Docker | `docker build -f packages/ws-tunnel-agent/Dockerfile` | İmaj derlendi |
| Compose | `docker compose -f .../compose.example.yml config` | Geçerli |
| Container smoke | `docker run ... ws-tunnel-agent:local` | Hub'a bağlandı (`[peer-agent] ...`) |
| Doküman lint | `bun run spec:check docs/architecture/WS-TUNNEL-AGENT-MIMARISI.md` | 0 hata |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Zorunlu alan reddi | `config.test.ts#parseAgentConfig` | 🟢 |
| AK-1.2 | Hostname varsayılanı + kimlik zorunluluğu | `config.test.ts#parseAgentConfig` | 🟢 |
| AK-1.3 | URL/protokol doğrulaması | `config.test.ts#parseAgentConfig` | 🟢 |
| AK-1.4 | TLS bayrağı + secret maskeleme | `config.test.ts#parseAgentConfig` | 🟢 |
| AK-2.1 | Claim istek sözleşmesi | `claim-client.test.ts#BootstrapClaimClient` | 🟢 |
| AK-2.2 | Secret kalıcılığı + token temizliği | `install.test.ts#config-store`, `setup-server.test.ts` | 🟢 |
| AK-2.3 | Fail-closed hata | `claim-client.test.ts#BootstrapClaimClient` | 🟢 |
| AK-2.4 | PeerId eşleşme kontrolü | `claim-client.test.ts#BootstrapClaimClient` | 🟢 |
| AK-3.1 | First-boot kapısı | `setup-server.test.ts#shouldStartSetup` | 🟢 |
| AK-3.2 | Test akışı (+ claim caching) | `setup-server.test.ts#SetupAgent` | 🟢 |
| AK-3.3 | Kaydet akışı | `setup-server.test.ts#SetupAgent` | 🟢 |
| AK-3.4 | Girdi doğrulama | `setup-server.test.ts#SetupAgent` | 🟢 |
| AK-4.1 | Unit şablonu | `systemd-unit.test.ts#renderSystemdUnit` | 🟢 |
| AK-4.2 | Docker imajı | Dockerfile + container smoke | 🟢 |
| AK-4.3 | Compose geçerliliği | `docker compose config` | 🟢 |
| AK-4.4 | Uninstall | `install.test.ts#uninstallAgent` | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | `jose-hmac-signer.ts` → `hmac-signer.ts` | Fonksiyon tabanlı (sign/verify/generateSecret) — sınıf sarmalayıcı gereksizdi (YAGNI). Davranış SPEC ile aynı |
| 2 | `args.ts` eklendi (SPEC'te yok) | Argüman ayrıştırma saf ve testli olsun diye ayrı dosya (T-5 kapsamı) |
| 3 | `--setup` sırasında hub erişilemezse kaydetmeye izin | SPEC §6.3 edge case'i aynen uygulandı |
| 4 | Wizard binary'yi `process.execPath`'ten kopyalar | Bun ile çalışırken `--binary <derlenmiş-agent>` zorunlu (anlaşılır hata) |

### A.5 Gözle Kontrol Maddeleri

- [x] `JoseSignerForTests` agent modülünde import edilmiyor (yalnız `revpi-agent-check` test yardımcısı kullanır)
- [x] Secret alanları `config show` çıktısında maskeli
- [x] Config dosyası 0600, unit 0644
- [x] Bootstrap token başarılı claim sonrası config'ten siliniyor, `peerSecret` kalıcı
- [x] Setup UI yalnız config yokken açılıyor (`shouldStartSetup`)
- [x] `run` config dosyası > env merge kuralı: secret'lar dosyada kalır
- [x] Purity: `config.ts`, `systemd-unit.ts`, `setup-page.ts` fs/network/process okumuyor

### A.6 Genel Durum Özeti

Agent, tek binary + alt komutlarla ürünleşti: env/env-file config, production HMAC imzalayıcı, bootstrap claim (tek kullanımlık → kalıcı secret), ilk açılış setup UI, systemd wizard ve Docker dağıtımı. Tüm birim testleri, workspace testleri, tip kontrolü, uçtan uca check, CLI/setup/docker smoke ve doküman lint geçti. **review_date:** 2026-11-20

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Config yok | `run` + dosya yok + env geçersiz | Setup UI açılır | `setup-server.test.ts#shouldStartSetup` |
| Config var | `run` + dosya var | Tunnel başlar (setup yok) | `shouldStartSetup` + CLI smoke |
| Bootstrap token | `PEER_TOKEN` yok, `BOOTSTRAP_TOKEN` var | Claim → `PEER_SECRET` kalıcı | `claim-client.test.ts`, `setup-server.test.ts` |
| Claim reddi | 4xx/ağ hatası | Fail-closed, tunnel yok | `claim-client.test.ts` |
| Personel kimlik yok | Ne token ne secret | Config hatası (`IDENTITY`) | `config.test.ts` |
| Yerel hedef https + TLS_INSECURE | `TLS_INSECURE=1` | `NODE_TLS_REJECT_UNAUTHORIZED=0` | `config.test.ts` (bayrak) + manuel |
| Tünel kopması | Hub erişilemez | Connector backoff (mevcut davranış) | `revpi-agent-check` |
| SIGTERM/SIGINT | Kapanış sinyali | Graceful stop | `run.ts` + manuel |
| Setup kaydetme | Geçerli form | 0600 config + tunnel | Setup smoke |
| Aynı anda iki kaydet | Eşzamanlı istek | İkincisi 409 | `setup-server.ts` (kod) — test yok (G2) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Wizard interaktif akışı otomatik test edilmiyor | Düşük | manuel smoke; wizard adımları ayrıştırılırsa test edilebilir |
| G2 | Setup `/save` eşzamanlılık (409) testi yok | Düşük | `SetupAgent.save` promise yarışı testi |
| G3 | Bootstrap claim caching'in süreç yeniden başlatmada davranışı (token tüketilmiş) | Orta | Kullanıcı yeni token üretmeli — hata mesajı yönlendirici; UI'da gösterilecek iyileştirme |
| G4 | Docker imajı ARM64 (`TARGETARCH=arm64`) yerelde doğrulanmadı | Orta | `docker buildx --platform linux/arm64` ile CI'da doğrula |
| G5 | Çoklu servis (tek agent → N target) | Düşük (A1) | Ayrı SPEC |

**review_date:** 2026-11-20
