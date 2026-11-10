---
status: active
space: agents
tags: [agents, referans, tamper-logger, log, nis2]
review_date: 2026-11-10
---

# AGENTS Detay Referansı — Tamper Logger (İmzalı Log)

> Bu doküman `AGENTS.md`'den taşınan **referans** içeriktir; her oturumda yüklenmez.
> `packages/tamper-logger` veya `tools/verify-log.mjs`'e dokunacaksan oku.
> **Kanonik SPEC:** `packages/tamper-logger/docs/TAMPER-LOGGER-MIMARISI.md`.

## Kapsam

Tamper-evident imzalı log kütüphanesi (ayrı proje). İmzasız genel logger `packages/logger`'dır — bu paket onun yerine geçmez.

## Değişmez kurallar

1. **Zincir:** `signature = HMAC-SHA256(key, prevHash\nseq\ncanonicalize(event))`; canonical JSON anahtar sırasından bağımsızdır.
2. **Kategori politikası:** `app` batch'lenir + drop (sayaç + degraded); `audit`/`security` **fail-closed** — batch önce flush, sonra anında yaz, hata çağırana yayılır.
3. **eventCode:** serbest string; proje sözlüğü `eventCodeValidator` ile enjekte edilir (`packages/platform/logging/src/event-codes.ts#LOG_EVENT_CODES`). Sözlükte olmayan kod log yazımını reddeder (fail-closed).
4. **Redaction:** `password`/`token`/`authorization`/`secret`/`api_key`/`apikey` (case-insensitive, kısmi) maskelenir. Sır asla loglanmaz.
5. **Sink'ler:** console, file, timescale (tek INSERT/unnest), syslog (RFC 5424), http-webhook (`X-Signature: sha256=`), smtp, http-sms, alert-notifier (5 dk cooldown; alert hatası audit'i ETKİLEMEZ).
6. **Bağımsızlık:** jenerik paket — proje kavramı içermez; tek dış bağımlılık `nodemailer`.
7. **Denetim:** `tools/verify-log.mjs` (`--key` > `--key-file` > `LOG_SIGNING_KEY`; çıkış 0/1/2). `GENESIS_HASH` yeni segment = servis restart (tamper DEĞİL).
8. **Şema:** `log_events` 12 kolon; hypertable dönüşümü migrasyonda.

## Test

`packages/tamper-logger` 14 test dosyası / 104 test (imza, zincir, fail-closed, sink'ler). Güvenlik-kritik: mutasyon eşiği ≥%90 hedefi.

## İlgili

- `docs/standards/nis-2.md`, `docs/standards/owasp-asvs-level2.md`
- `AGENTS.md` (kök) — genel log kuralı: `[ModuleName]` prefix, structured logger
