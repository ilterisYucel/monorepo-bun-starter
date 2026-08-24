---
status: active
space: process
tags: [surec, sprite, ai, pipeline]
review_date: 2026-08-24
---

# Sprite Üretimi Nasıl Yapılır

Bu doküman, PixiJS çizimlerini fal.ai ile üretilen sprite'larla değiştirme pipeline'ının **pratik kullanım kılavuzudur**. Stil kuralları ve prompt şablonu için: [SPRITE-STYLE-KIT.md](./SPRITE-STYLE-KIT.md) (authoritative). Mimari kurallar için AGENTS.md → "Sprite pipeline" bölümü.

---

## 1. Önkoşullar

| Gereksinim | Açıklama |
|:-----------|:---------|
| `FAL_KEY` | fal.ai API anahtarı (https://fal.ai/dashboard/keys). Komutlara `FAL_KEY=... bun ...` şeklinde verilir. |
| Bun | Repo paket yöneticisi. |
| Storybook | Referans yakalama ve görsel onay için (`bun nx run ui:storybook`, port 6006). |

## 2. Komut özeti

| Komut | Ne yapar | Ne zaman |
|:------|:---------|:---------|
| `bun run sprite:refs` | Storybook'u (statik build) kullanarak referans PNG'lerini yakalar: `assets/sprites/refs/<element>/<story>.png` + `base.png` (veya varyantlar). `src/assets` sprite'larını **ezmez** (sadece dosya yoksa yazar) | Yeni element ekledikten sonra; referans yenilemek istediğinde |
| `bun run sprite:refs -- --reset-sprites` | `src/assets/sprites/*/base.png`'i placeholder (mevcut çizimin nötr render'ı) olarak sıfırlar | AI çıktılarından vazgeçip çizim görünümüne dönmek için |
| `bun run sprite:gen <element>` | fal.ai ile üretir: referans → nano-banana/edit (img2img) → BiRefNet arka plan temizliği → bbox normalizasyonu → `src/assets/sprites/<element>/base.png` | Sprite üretmek/yeniden üretmek |
| `bun run sprite:gen <element> --theme legacy` | Aynı üretim, eski (legacy) prompt setiyle — üretim zincirini eski stile döndürür | Eski görünüme üretim bazında dönüş |
| `bun run sprite:theme backup` | Aktif sprite'ları + ölçülen meta dosyalarını `assets/sprites/archive/legacy/`'e yedekler | Yeni temaya geçmeden önce (bir kez) |
| `bun run sprite:theme restore` | archive/legacy'deki sprite'ları ve meta'ları aktif konuma geri kopyalar | Eski görünüme dosya bazında tam dönüş |
| `bun run sprite:theme status` | Aktif ve yedek sprite setlerini listeler | Durum kontrolü |
| `bun run sprite:gen --all` | Tüm elementleri sırayla üretir | Toplu üretim |
| `bun tools/check-sprite.mjs [element]` | Kalite kapısı: boyut, şeffaf köşeler, nötr renk kuralı, içerik bbox | Her üretimden sonra |
| `bun run sprite:measure` | RackCell: plaka stack + etiket bandını AI çıktısından ölçer → `rackcell-meta.ts` | RackCell üretiminden sonra |
| `bun tools/measure-meta.mjs <element>` | Diğer elementlerin yuva/ekran konumlarını ölçer → `<element>-meta.ts` | panelcard, roomcard, firepanel üretiminden sonra |

---

## 3. Senaryo A — Mevcut sprite'ı yeniden üretmek (en sık iş)

Elementin Base story'si, spec'i ve kod entegrasyonu zaten var. Sadece görseli yenilemek istiyorsun:

```bash
# 1. (İsteğe bağlı) Referansları tazele — AI çıktılarını ezmez
bun run sprite:refs

# 2. Üret (örn. rackcell). Varyantlı element için: circuitbreaker-close / circuitbreaker-open
FAL_KEY=... bun run sprite:gen rackcell

# 3. Kalite kapısı
bun tools/check-sprite.mjs rackcell

# 4. Dinamik içerik meta'sını yeniden ölç (üretim yerleşimi kaydırabilir!)
bun run sprite:measure                      # rackcell
bun tools/measure-meta.mjs panelcard       # diğerleri

# 5. Görsel onay
bun nx run ui:storybook
```

**Sonucu beğenmediysen:**
- `tools/generate-sprite.mjs` içindeki `ELEMENTS.<element>.describe` alanını düzenle (stil isteği, vurgular) → tekrar `sprite:gen`.
- Çıktıyı tamamen çizim görünümüne döndürmek: `bun run sprite:refs -- --reset-sprites`.
- Eski beğendiğin çıktıyı kaybetmemek için üretimden önce `packages/ui/assets/sprites/archive/` altına kopyala.

**Not:** Üretim sonrası `*-meta.ts` ölçümünü atlama — AI her üretimde yuvaları ±10-30px kaydırabilir; ölçüm bu kaymayı emer. `measured: false` kalırsa tasarım geometrisi kullanılır (yanlış hizalama riski).

## 4. Senaryo B — Yeni element (veya mevcut elemente yeni yuva) eklemek

Örnek: "GridSymbol" veya "CB'ye ekran ekleme" akışı.

### Adım 1 — Nötr chassis çizimi (drawers)

Elementin `*.drawers.ts` dosyasına, durum renkleri İÇERMEYEN bir chassis fonksiyonu ekle (ör. `drawGridChassis`). Bu fonksiyon yalnızca Base story yakalamasında kullanılır; üretim çizim fonksiyonunun görünümü değişmez.

Dinamik içerik (dolgu, lamba, text) sprite'a gömülecekse: **boş yuva çizimleri** ekle (koyu cam dikdörtgen, boş daireler vb. — nötr `borderStroke`/`gradScreen`).

### Adım 2 — Base story

`<Element>.stories.tsx`'e ekle:

```tsx
export const Base = () => (
  <div style={{ width: W, height: H }}>          {/* sıkı canvas — gövde + marj */}
    <Application width={W} height={H} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics draw={(g) => { g.clear(); drawXChassis(g, ...); }} />
      {/* boş yuvalar burada çizilir */}
    </Application>
  </div>
);
Base.parameters = { backgrounds: { default: "transparent" } };  // ZORUNLU
```

Varyantlı element (duruma göre farklı sprite): her varyant için ayrı story — `BaseClose`, `BaseOpen` gibi (lever/durum çizimi nötr gri olarak referansa eklenir).

### Adım 3 — Spec girdisi

`tools/sprites-spec.mjs` → `SPRITE_SPECS`:

```js
myelement: {
  canvas: { width: 2 * W, height: 2 * H },   // 2x DPR
  frame: { x: 0, y: 0, width: 2 * W, height: 2 * H },  // genelde tam canvas
  margin: 8,                                  // normalizasyon kırpma marjı
  variants: ["close", "open"],                // (opsiyonel) varyantlar
},
```

### Adım 4 — Referans yakalama

```bash
bun nx run ui:build-storybook   # gerekirse (capture statik build kullanır)
bun run sprite:refs
```
`assets/sprites/refs/<element>/base.png` (ve `base-<v>.png`) oluşur; `src/assets` placeholder'ları yalnızca eksikse yazılır.

### Adım 5 — Üretim girdisi

`tools/generate-sprite.mjs` → `ELEMENTS`:

```js
myelement: {
  ref: "base",                    // refs/<element>/base.png
  describe: "...",                // element açıklaması + "Repaint ONLY the surfaces — do NOT redesign/move..."
  removeBg: true,                 // BiRefNet arka plan temizliği
},
// varyantlı örnek:
"circuitbreaker-close": {
  ref: "base-close", specKey: "circuitbreaker", out: "circuitbreaker/base-close.png", ...
},
```

### Adım 6 — Üret + kalite kapısı

```bash
FAL_KEY=... bun run sprite:gen myelement
bun tools/check-sprite.mjs myelement
```

### Adım 7 — Ölçüm (yalnızca dinamik içerik varsa)

`tools/measure-meta.mjs` → `ELEMENTS`:

```js
myelement: {
  metaOut: "packages/ui/src/graphics/elements/X/x-meta.ts",
  exportName: "X_META", interfaceName: "XMeta",
  margin: m, bodyW: W, bodyH: H,          // Base story gövdesi (logical)
  clusters: [
    { key: "display", design: { x, y, w, h },  // gövdeye oran (tasarım)
      minPx: 60, polarity: "dark", absDark: 45 },       // koyu yuva
    // parlak yuva için: polarity: "light", relLight: 12
    // varyant başına ayrı dosya için: files: [{ file: "base-close.png", key: "displayClosed" }, ...]
  ],
},
```

Çalıştır: `bun tools/measure-meta.mjs myelement` → `x-meta.ts` (`measured` bayrağı + oran değerleri).

### Adım 8 — Kod entegrasyonu

1. **Placeholder oluştur** (build'in çözebilmesi için — ilk kez ekliyorsan): 1x1 transparan PNG'yi `src/assets/sprites/<element>/base.png`'e koy (ya da `sprite:refs` zaten yazmıştır).
2. `packages/ui/src/graphics/textures.ts` → `SPRITE_ASSETS` girdisi (static import + frame; varyantlar ayrı anahtar).
3. Element bileşeni:
   ```tsx
   const tex = useSpriteTexture("myelement");
   ...
   {tex ? <pixiSprite texture={tex} ... /> : <pixiGraphics draw={drawBody} />}
   ```
   Ölçülen yuva: `MYELEMENT_META.measured ? MYELEMENT_META.display : tasarım` → gerçek width/height ile ölçekle → text/dolgu/lamba oraya yaz.
4. Elementin kullanıldığı sistemlerde `<SpriteTextureProvider assets={SPRITE_ASSETS}>` sarımı olduğundan emin ol (BSC, TMS, BESSDiagram, DashboardSCADA sarılı).

### Adım 9 — Doğrulama

```bash
bun nx run ui:typecheck
bun nx run ui:test
bun nx run ui:build-storybook
bun nx run ui:storybook      # görsel onay (ZORUNLU — ölçüm hizalı mı, stil tutarlı mı)
```

---

## 5. Üretim kuralları (özet)

- **Stil:** Düz 2D front-facing HMI. Perspektif/izometrik yasak (tam kurallar: SPRITE-STYLE-KIT.md).
- **Nötr baz:** Sprite'ta durum rengi (yeşil/turuncu/kırmızı/mavi) ve metin OLAMAZ — `check-sprite` ihlalleri yakalar. Renkler kodda tint/overlay, metinler `pixiText` ile.
- **Layout-lock:** Prompt'ta "Repaint ONLY the surfaces — do NOT redesign, do NOT move any element" şart; yuvaların yerini korur.
- **img2img referansı:** Durumlu story değil, nötr `Base` story yakalaması.
- **Kablolar:** Ham `pixiGraphics` kablo çizimi YASAK — `Cable` bileşeni (sprite segment) kullanılır. Rack satırı `BSCUnitRow`'da tek yerdedir.

## 5b. Tema sistemi (electrical / legacy)

`tools/generate-sprite.mjs` promptları gömülü değildir; `tools/sprites-prompts/<tema>.mjs` dosyalarından gelir (`--theme <tema>` flag'i, varsayılan `electrical`).

| Tema dosyası | Stil |
|:-------------|:-----|
| `tools/sprites-prompts/electrical.mjs` | **Aktif:** tek hat şeması / elektrik devre elemanı sembol estetiği (EPLAN, AutoCAD Electrical, ETAP tarzı temiz teknik çizim) |
| `tools/sprites-prompts/legacy.mjs` | Eski oyun-UI stili — birebir korunur, DEĞİŞTİRMEYİN |

**Tema değiştirme:**

1. **Üretim bazında:** `FAL_KEY=... bun run sprite:gen <element> --theme legacy` — yalnızca prompt seti değişir.
2. **Dosya bazında (anında dönüş):** `bun run sprite:theme restore` — archive/legacy'deki sprite'ları + ölçülen `*-meta.ts` dosyalarını aktif konuma kopyalar. Meta dosyaları sprite'larla birlikte taşınır çünkü AI her üretimde yuvaları ±10-30px kaydırabilir; meta seti temaya özgüdür.
3. Yeni temaya geçmeden önce **bir kez** `bun run sprite:theme backup` çalıştırın — mevcut sprite seti (varyantlar dahil) ve meta'lar `packages/ui/assets/sprites/archive/legacy/` altına kopyalanır ve commit'lenir.

**Not:** Referans PNG'ler (`refs/`) ve `sprites-spec.mjs` tema-bağımsızdır — her iki tema aynı nötr chassis referanslarını kullanır, yalnızca yüzey/üslup değişir.

## 6. Dosya haritası

| Yol | İçerik |
|:----|:-------|
| `tools/capture-sprite-refs.mjs` | Referans yakalama (storybook statik + omitBackground) |
| `tools/generate-sprite.mjs` | fal.ai üretim (`--theme <tema>` flag'i, promptları tema dosyasından alır) |
| `tools/sprites-prompts/<tema>.mjs` | Tema prompt setleri: `electrical` (varsayılan) + `legacy` |
| `tools/swap-sprite-theme.mjs` | Tema takası: sprite + meta setlerini backup/restore eder |
| `tools/sprites-spec.mjs` | Canvas/frame/margin/varyant spesifikasyonları |
| `tools/check-sprite.mjs` | Kalite kapısı (boyut/şeffaflık/nötr renk) |
| `tools/measure-rackmeta.mjs` | RackCell pencere/tüp ölçümü |
| `tools/measure-meta.mjs` | Genel yuva/ekran ölçümü (polarity/absDark/relLight/varyant) |
| `packages/ui/assets/sprites/refs/` | Referans PNG'ler (capture üretir, commit'lenir) |
| `packages/ui/assets/sprites/archive/` | Eski sprite çıktıları + `legacy/` tema yedeği (sprite + meta) |
| `packages/ui/src/assets/sprites/<element>/` | Uygulamanın yüklediği sprite'lar (`base.png`, varyantlar) |
| `packages/ui/src/graphics/textures.ts` | `SPRITE_ASSETS` manifesti (url + frame + scale) |
| `packages/ui/src/core/SpriteTextureProvider/` | `Assets.load` + `useSpriteTexture` |
| `packages/ui/src/graphics/elements/*/*-meta.ts` | Ölçülen yuva oranları (`measured` bayrağı) |

## 7. Sorun giderme

| Belirti | Çözüm |
|:--------|:------|
| `check-sprite`: "durum renkleri mevcut" | img2img referansı durumlu story olmasın; `refs/<element>/base.png` nötr olduğundan emin ol; prompt'ta NO colors vurgusu |
| Ölçüm: "tespit edilemedi" | Yuva kutbu değişmiş olabilir: `polarity` değiştir (dark↔light), `absDark`/`relLight` eşiğini ayarla; minPx düşür |
| Storybook dev'de eski görünüm | Dev server'ı yeniden başlat (statik build test edilirken `sprite:refs` build kullanır) |
| Sprite yüklenmiyor (fallback çizim) | `SPRITE_ASSETS` anahtarı ile `useSpriteTexture` anahtarı eşleşiyor mu; provider sarımı var mı; dosya `src/assets` içinde mi |
| Üretim boyutu/aspect farklı | Normalizasyon otomatik çalışır (bbox → frame); sorun sürerse `margin`/frame değerlerini kontrol et |
| Eski sprite'ı geri istiyorum | `packages/ui/assets/sprites/archive/<element>.png` → `src/assets/sprites/<element>/base.png` olarak kopyala |
