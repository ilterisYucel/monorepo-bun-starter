---
status: active
space: agents
tags: [agents, referans, ui, icon, color, sprite]
review_date: 2026-12-01
---

# AGENTS Detay Referansı — UI (Icon / Color / Sprite)

> Bu doküman `AGENTS.md`'den taşınan **referans** içeriktir; her oturumda yüklenmez.
> `packages/ui` ikon, renk token'ı veya sprite sistemine dokunacaksan oku.

## Icon system (`packages/ui/src/icons/`)

All icons live in `packages/ui/src/icons/`. Consumer packages import from `@gd-monorepo/ui` — never import `react-icons/tb` directly.

### File structure

| File            | Purpose                                                                                |
| --------------- | -------------------------------------------------------------------------------------- |
| `types.ts`      | `ScadaIconName` union type — canonical list of 35 allowed icon names                   |
| `nav-icons.tsx` | `SCADA_ICONS: Record<ScadaIconName, IconType>` — maps names to Tabler Icons components |
| `index.ts`      | Barrel — `export { SCADA_ICONS }` + `export type { ScadaIconName }`                    |

Root barrel (`packages/ui/src/index.ts`) re-exports via `export * from "./icons"`.

### Usage

```tsx
import { SCADA_ICONS } from "@gd-monorepo/ui";
const Icon = SCADA_ICONS.dashboard;
<Icon size={18} />;
```

### Adding a new icon

1. Add the name string literal to the `ScadaIconName` union in `types.ts`
2. Import the corresponding `Tb*` component in `nav-icons.tsx` and add the mapping entry to `SCADA_ICONS`
3. That's it — barrel exports expose it automatically

---

## Color token system (`packages/ui/src/colors/`)

All colors are centralized in `packages/ui/src/colors/`. **NEVER hardcode hex values** (`#1a1a2e`, `0x10b981`) in any file. Use the token system.

### File structure

| File        | Purpose                                                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.ts` | 104 color tokens defined as hex strings (`tokens` object). Exports `COLORS` (string), `COLOR` (pre-computed 0x numbers), `hexToNumber()`, `ColorToken` type |
| `index.ts`  | Barrel — `export { COLORS, COLOR, hexToNumber }` + `export type { ColorToken }`                                                                             |

Root barrel re-exports via `export * from "./colors"`.

### Dual-format exports

| Export          | Type                      | Example                                  | Use case                                 |
| --------------- | ------------------------- | ---------------------------------------- | ---------------------------------------- |
| `COLORS`        | Record of hex strings     | `COLORS.success` → `"#10b981"`           | Emotion styled, inline CSS, string props |
| `COLOR`         | Record of 0x numbers      | `COLOR.success` → `0x10b981`             | PixiJS fills, strokes, text styles       |
| `hexToNumber()` | `(hex: string) => number` | `hexToNumber(COLORS.error)` → `0xef4444` | Dynamic PixiJS color from hex string     |

### Usage patterns

```tsx
import { COLORS, COLOR, hexToNumber } from "@gd-monorepo/ui";

// Emotion / CSS-in-JS
const Card = styled.div`
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  color: ${COLORS.textPrimary};
`;

// PixiJS graphics (number format)
g.fill({ color: COLOR.success });
g.stroke({ width: 2, color: COLOR.borderStroke });

// Dynamic PixiJS conversion
const c = hexToNumber(someHexString);
g.fill({ color: c });

// Inline styles (plain string value, no template literal needed)
const style = { color: COLORS.textMuted };
```

### Token groups (104 tokens)

| Group           | Count | Examples                                                                                                                                                                                          |
| --------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**      | 14    | `success`, `successGlow`, `successHover`, `warning`, `warningGlow`, `warningHover`, `error`, `errorHover`, `errorStroke`, `info`, `infoDark`, `infoLight`, `infoHover`, `idle`                    |
| **Surface**     | 14    | `bgApp`, `bgCard`, `bgPopup`, `bgHeader`, `bgInput`, `bgPanel`, `bgRoom`, `bgSkeleton`, `bgHover`, `bgTag`, `bgVerbose`, `bgSystemBar`, `bgCodeDark`, `bgCodeLight`                               |
| **Border**      | 5     | `borderDefault`, `borderStroke`, `borderLight`, `borderHover`, `borderDivider`                                                                                                                    |
| **Text**        | 10    | `textPrimary`, `textWhite`, `textMuted`, `textDisabled`, `textLight`, `textVoltage`, `textPurple`, `textTagGray`, `textNearWhite`, `textNearBlack`                                                |
| **Gradient**    | 9     | `gradBodyTop`, `gradBodyBot`, `gradMid`, `gradMid2`, `gradLow`, `gradScreen`, `gradPanelTop`, `gradDeviceIdStart`, `gradDeviceIdEnd`                                                              |
| **Temperature** | 3     | `tempCold`, `tempChilly`, `tempHot`                                                                                                                                                               |
| **Special**     | 7     | `cable`, `terminal`, `shadow`, `dcActiveCenter`, `dcActiveEdge`, `dcIdleCenter`, `dcIdleEdge`                                                                                                     |
| **Alpha**       | 12    | `infoAlpha8`, `infoAlpha12`, `infoAlpha25`, `successAlpha12`, `successAlpha25`, `errorAlpha12`, `errorAlpha19`, `errorAlpha25`, `errorAlpha50`, `warningAlpha12`, `warningAlpha25`, `idleAlpha12` |
| **Chart**       | 16    | `chart1`..`chart16`                                                                                                                                                                               |
| **Accent**      | 2     | `accentLight`, `accentDark`                                                                                                                                                                       |

### Adding a color token

1. Add the entry to the `tokens` object in `tokens.ts` (hex string format only — e.g. `myColor: "#ff9900"`)
2. `COLOR` (0x numbers) and `ColorToken` union type are **auto-derived** from `tokens` keys — no manual sync needed
3. Use semantic names: group prefix (`bg*`, `text*`, `border*`, `grad*`) for surfaces; adjectives for status (`success`, `warning`, `error`, `info`, `idle`); `*Hover`/`*Glow` for variants; `*AlphaXX` for opacity variants

### Migration rule

When touching any file with hardcoded hex colors:

1. Replace `#hex` with `COLORS.*` (CSS/Emotion) or `0xhex` with `COLOR.*` (PixiJS)
2. If no matching token exists, add it to `tokens.ts` **first**, then use the token
3. Never leave a one-off hex value behind

---

## Sprite pipeline (AI sprite üretimi — pixi çizimleri → sprite)

> **Authoritative:** üretim akışı [docs/process/SPRITE-URETIMI.md](docs/process/SPRITE-URETIMI.md), stil kuralları ve prompt şablonu [docs/process/SPRITE-STYLE-KIT.md](docs/process/SPRITE-STYLE-KIT.md).

Pixi `pixiGraphics` çizimlerini AI üretimi (fal.ai img2img) sprite'larla değiştirme altyapısı.

### Komutlar

```bash
bun run sprite:refs                          # Storybook'tan referans PNG yakalar
bun run sprite:refs -- --reset-sprites       # src/assets sprite'larını placeholder'a döndürür
bun run sprite:gen rackcell                  # fal.ai ile sprite üretir (FAL_KEY gerekli)
bun run sprite:gen --all [--skip-removal]
bun run sprite:measure                       # rackcell pencere/tüp ölçümü -> rackcell-meta.ts
bun tools/check-sprite.mjs                   # piksel bazlı kalite kapısı (boyut/şeffaflık/nötr renk)
```

`capture` refs/<element>/base.png'i her zaman tazeler; `src/assets/sprites/<element>/base.png`'i yalnızca dosya yoksa yazar — AI çıktılarını ezmez.

### Dosya düzeni

| Yol                                                 | İçerik                                                                                                                    |
| :-------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| `packages/ui/assets/sprites/refs/<element>/`        | Faz 0 referans görselleri (capture script üretir, commit'lenir)                                                           |
| `packages/ui/src/assets/sprites/<element>/base.png` | **Uygulamanın yüklediği sprite.** Placeholder = mevcut çizimin nötr baz render'ı; `sprite:gen` üzerine AI çıktısını yazar |
| `packages/ui/src/graphics/textures.ts`              | `SPRITE_ASSETS`: element → url + texture frame + scale                                                                    |
| `packages/ui/src/core/SpriteTextureProvider/`       | `Assets.load` ile yükler, `useSpriteTexture(key)` ile texture sağlar                                                      |
| `tools/sprites-spec.mjs`                            | Element başına canvas/frame/margin spesifikasyonu (capture+generate+check ortak)                                          |

### Kurallar

- **Hibrit katman:** Sprite yalnızca nötr gövdeyi değiştirir. Durum renkleri, glow/pulse animasyonları ve `pixiText` etiketleri kod tarafında çizilmeye devam eder.
- **Fallback:** Texture yüklenemezse element eski `drawX` çizimine döner — hiçbir koşulda boş ekran olmaz.
- **Nötr baz:** AI çıktısında durum rengi (success/warning/error) ve metin BULUNAMAZ; renkler kodda tint/overlay ile verilir. img2img referansı olarak durumlu story DEĞİL, nötr `Base` story yakalaması kullanılır.
- **Üretim modeli:** `fal-ai/nano-banana/edit` (giriş referansını temel alır) + `fal-ai/birefnet/v2` arka plan temizliği. Model çözünürlük değiştirirse generate script içerik bbox'ını kırpıp `sprites-spec.mjs` frame'ine normalize eder.
- Element'e sprite eklemek için: chassis fonksiyonu (drawers) → Base story (transparent `backgroundAlpha={0}` + `backgrounds: { default: "transparent" }`) → `sprites-spec.mjs` girdisi → `SPRITE_ASSETS` meta (frame/scale) → elementte `useSpriteTexture` + fallback ternary.
- Frame'ler yakalama DPR'ına göredir (şu an 2x). Kablo (`Cable`) özel durum: tek segment texture'ı her path segmenti için döndürülüp uzatılır (pabuç marjı 12px).

### Tümleşik pencere/dolgu metrikleri (RackCell paterni)

- **Amaç:** Dinamik içerik (text/dolgu/lamba) sprite içindeki AI çizimi yuvalara yazılır.
- **Akış:** Base story'ye nötr yuva çizimleri eklenir → `sprite:gen` → ölçüm → `*-meta.ts` (`*_META`, gövdeye ORAN değerleri, `measured` bayrağı).
- **Ölçüm araçları:** `tools/measure-rackmeta.mjs` (rackcell: pencere sütunu + tüp; recessed bileşen tespiti + satır yürüyüşü + pitch ekstrapolasyonu) ve `tools/measure-meta.mjs` (genel: panelcard barSlot, roomcard tempSlot, energyanalyzer lcd, firepanel lamp/key kümeleri, circuitbreaker display; yerel kontrast maskesi + persentil bbox, cluster başına `polarity: "dark"|"light"` — AI yuvayı koyu veya parlak çizebilir; `absDark`/`relLight` eşikleri; bölge gövde içine kırpılır).
- **Stil:** Aktif stil **düz 2D front-facing HMI**'dır (prompt'ta perspective/izometrik yasak). Eski izometrik çıktılar `packages/ui/assets/sprites/archive/` altında saklanır (aktif değil).
- **Tüketim:** Element sprite modunda `*_META`'yı gerçek width/height ile ölçekler; text/dolgu/lamba ölçülen yuvalara yazılır. `measured=false` ise tasarım geometrisi kullanılır.
- **Varyantlar (duruma göre sprite):** `sprites-spec.mjs`'te `variants: ["close","open"]` → capture `--base-<v>` story'lerini yakalar, üretim `base-<v>.png` yazar (generate'da `specKey`/`out` alanları), `textures.ts`'te ayrı anahtarlar, element duruma göre `useSpriteTexture` ile seçer (ör. CircuitBreaker lever konumu sprite'a gömülü — `drawBreakerLever` sprite modunda çizilmez). Ölçüm `cluster.files` ile varyant başına meta anahtarı üretir (`displayClosed`/`displayOpen`).
- **BSCUnitRow** (`graphics/system/shared/BSCUnitRow.tsx`): rack satırı (rack'ler + Cable tabanlı bus/feeder/konverjans + CircuitBreaker + DCOutput) tek ortak bileşen — BSC.tsx ve BESSDiagram.tsx ikisi de kullanır; kablo/kesici kodu tek yerde. Yeni kablo çizimi YASAKTIR: ham `pixiGraphics` stroke yerine `Cable` bileşeni kullanılır.
- **Kural:** AI her üretimde yerleşimi ±10-30px kaydırabilir; meta tespiti bu kaymayı emer. Ölçüm sonrası storybook'ta görsel onay şarttır.
