# Wiki.js — GD-PMS Doküman Yönetim Sistemi

Confluence benzeri, self-hosted doküman/wiki altyapısı. İlk faz kapsamı: EMS/PMS projesi; ileride şirket geneline açılır.

## Kurulum

```bash
bun run wiki:up        # wiki (8090) + postgres (5435) başlatır
# İlk açılış: http://localhost:8090
#   - Admin hesabı oluştur (e-posta + parola)
#   - Admin > API Access > yeni API key üret (import için)
```

## Doküman importu

`docs/` altındaki aktif MD'ler frontmatter (status/space/tags) ile işaretlidir:

```bash
WIKI_URL=http://localhost:8090 WIKI_API_KEY=<api-key> bun run wiki:import
```

- `status: active` olanlar içe aktarılır; `archived/` ve deprecated dokümanlar atlanır.
- Space yapısı: `standards`, `architecture`, `product`, `analysis`, `decisions`, `process`, `roadmap`.
- PDF/DOCX türevleri `docs/archived/` altındadır — wiki sayfalarına manuel attachment olarak yüklenir (Wiki.js 2.5 API'sinde asset upload yok).

## Diğer komutlar

```bash
bun run wiki:down      # stack durdur
bun run wiki:backup    # pg_dump + data volume tar (deployment/wiki/backups/)
```

## Notlar

- `config.yml.example`: dil (tr), upload limitleri — mount edilirse compose env DB ayarlarını ezer.
- Yedek rutini: cron ile `wiki:backup` günde bir kez önerilir; eski yedekler otomatik temizlenir (son 14).
- Ürün bundle'larına (field/boss/container compose) dahil DEĞİLDİR — bağımsız stack. Deployment verimlileştirme yol haritası kapsamında değerlendirilecek.
- Şirket geneline açılışta LDAP/OIDC entegrasyonu ve Readers rolü aktive edilir (bkz. docs/standards/owasp-asvs-level2.md).
