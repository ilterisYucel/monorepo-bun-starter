# Documentation

GD-PMS doküman deposu. Yapı Wiki.js doküman yönetim sisteminin space düzenine birebir eşlenir (bkz. `deployment/wiki/README.md`).

## Klasör Yapısı

| Klasör | Wiki Space | İçerik |
|:-------|:-----------|:-------|
| `standards/` | Standartlar & Uyumluluk | NIS2, ISO 27001, ASVS L2, TEİAŞ uyumluluk |
| `architecture/` | Mimari | Sistem/tünel/plugin/manevra/editor/transport mimarileri |
| `product/` | Ürün & Tanıtım | Tanıtım raporu, UX brief |
| `analysis/` | Analizler | Veri analizleri, cihaz incelemeleri, envanterler |
| `decisions/` | Kararlar | Gerekçeli kararlar ve değerlendirmeler (ADR) |
| `process/` | Süreç & Nasıl Yapılır | Sprite pipeline, stabilite düzeltmeleri, pratik kılavuzlar |
| `roadmap/` | Yol Haritası | Gelecek planları (ui-v2 vb.) |
| `assets/` | — | Marka görselleri (logo) ve DOCX üretim varlıkları (mimari şema) — aktif |
| `archived/` | Arşiv | Deprecated dokümanlar, AI oturum dökümleri, türetilmiş PDF/DOCX'ler |
| `mappings/` | — | Register → UI eşleştirme (makine-okunur) |

## Frontmatter Standardı

Aktif dokümanlar dosya başında frontmatter taşır; `tools/import-wiki.ts` bunu okuyup Wiki.js'e aktarır:

```yaml
---
status: active          # active | superseded | deprecated | draft
space: standards        # klasör adıyla aynı
tags: [nis2, guvenlik]  # wiki tag'leri
review_date: 2026-08-24 # son tasnif tarihi
---
```

- `status: active` olmayan dokümanlar import'a girmez.
- `archived/` içeriği wiki'ye aktarılmaz; PDF/DOCX türevleri ihtiyaç halinde wiki sayfalarına attachment olarak yüklenir.

## Import

```bash
bun run wiki:up
WIKI_URL=http://localhost:8090 WIKI_API_KEY=<key> bun run wiki:import
```

## mappings/

Register → UI yönlendirme dokümanları. Modbus register adreslerinden web arayüzündeki bileşenlere tam eşleştirme.

| File | Description |
|------|-------------|
| `register-ui-mapping.json` | Machine-readable mapping (612 rows) |
| `register-ui-mapping.csv` | Excel-compatible, UTF-8 |

**Regenerate:**

```bash
python3 scripts/generate_register_mapping.py
python3 scripts/convert_to_xlsx.py          # .xlsx (needs `pip install openpyxl`)
```
