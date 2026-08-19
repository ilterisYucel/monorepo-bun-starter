# Sprite Stil Kiti (AI Üretim Referansı)

**Amaç:** PixiJS canvas çizimlerini fal.ai (img2img) ile izometrik hafif 3B sprite'lara dönüştürürken tutarlılık sağlamak.
**Kapsam:** `packages/ui/src/graphics/elements/*` — RackCell, Cable, CableBus, CircuitBreaker, DCOutput, RoomCard, HvacUnit, PanelCard, FirePanel, EnergyAnalyzerGraphic.
**Referans görseller:** `packages/ui/assets/sprites/refs/<element>/<state>.png` (tools/capture-sprite-refs.mjs ile üretilir).

---

## 1. Global stil direktifleri (TÜM üretimlerde geçerli)

| Alan | Kural |
|:-----|:------|
| Perspektif | **Düz 2D, önden görünüm.** Perspektif/izometrik derinlik YASAK — flat front-facing HMI panel estetiği. |
| Zemin | Koyu endüstriyel UI: `#0f0f1a` arka planla uyumlu, kart yüzeyi `#1a1a2e`. |
| Işık | Tek ışık yönü: sol-üstten. Yumuşak bevel kenarlar, dikey yumuşak gradyanlar. |
| Aksan renkleri | Token paletiyle birebir: success `#10b981`, warning `#f59e0b`, error `#ef4444`, idle `#6b7280`, info `#3b82f6`. |
| Durum renkleri | **Üretilmez.** Baz sprite'lar nötr (beyaz/gri gövde, koyu çerçeve) üretilir; durum renkleri kod tarafında tint/overlay ile verilir. |
| Stil dili | Yumuşak plastik-metal karışımı, koyu cam display pencereleri, ince koyu kontur (1-2px). Foto-gerçekçilik DEĞİL; temiz game-UI estetiği. |
| Arka plan | **Tamamen şeffaf** (transparent PNG). Hiçbir zemin/gölge dışa taşmaz. |
| Çözünürlük | Element hizalama kutusunun 2x'i (DPR 2). |
| Yazı | Sprite içine **metin üretilmez**. Tüm etiketler kod tarafında `pixiText` ile ölçülen yuvalara konur. |

## 2. Renk eşleme (referans için)

| Token | Hex | Kullanım |
|:------|:----|:---------|
| success / successGlow | `#10b981` / `#34d399` | Online, charge, kapalı kesici |
| warning / warningGlow | `#f59e0b` / `#fbbf24` | Discharge, açık kesici |
| error / errorStroke | `#ef4444` / `#f87171` | Offline, fault, fire |
| idle | `#6b7280` | Pasif durum |
| info / infoLight | `#3b82f6` / `#60a5fa` | HVAC soğutma |
| bgCard / bgApp | `#1a1a2e` / `#0f0f1a` | Gövde yüzeyleri |

## 3. Element başına üretim spesifikasyonu

### RackCell (battery rack — batarya devre sembolü)
- **Referans:** `refs/rackcell/base.png` (nötr chassis: üst/alt terminal, 6 plaka çifti uzun/kısa dönüşümlü, alt etiket bandı)
- **Üretim:** 1 nötr baz sprite (sembol gövdesi, plaka çiftleri görünür, etiket bandı BOŞ koyu).
- **Kod katmanları (kalır):** durum glow, etiket satırları (R01 / durum / şarj / SOC% / V / A — omurganın iki yanında yüzer, sağlı sollu). SOC dolgusu yok; seviye yalnızca etikette.

### Cable / CableBus (kablolar, bus bar)
- **Üretim:** 1 kablo segment dokusu (kısa düz parça, yatay) + 1 bağlantı ucu (terminal pabucu). Doku yatayda tekrarlanabilir (tile) olmalı.
- **Kod katmanları:** Flow partikül animasyonu sprite üstünde kalır.
- **Kural:** Kıvrımlı yol çizimi yapılmaz; path üzerinde segment + döndürme ile döşenir.

### CircuitBreaker (kesici)
- **Referans:** `refs/circuitbreaker/online-closed.png`, `online-open.png`
- **Üretim:** 1 nötr baz (kesici gövdesi, kol yuvası görünür). Kol (handle) durumu kod tarafında 2 pozisyonda çizilebilir/rotasyonla gösterilebilir.
- **Kod katmanları:** Pulse animasyonu, durum renk glow.

### DCOutput (DC çıkış)
- **Referans:** `refs/dcoutput/active.png`
- **Üretim:** 1 nötr baz (yuvarlak/endüstriyel DC çıkış kafası).
- **Kod katmanları:** Aktif glow, etiketler.

### RoomCard (oda kartı)
- **Referans:** `refs/roomcard/room-o-1.png`
- **Üretim:** 1 nötr baz (oda kutusu, hafif izometrik iç perspektif, sıcaklık bar yuvası).
- **Kod katmanları:** Sıcaklık barı (soğuk mavi→sıcak kırmızı), etiketler (O1, °C, set, RH).

### HvacUnit (HVAC ünitesi)
- **Referans:** `refs/hvacunit/online-cooling.png`
- **Üretim:** 1 nötr baz (kompakt HVAC kutusu, fan ızgarası).
- **Kod katmanları:** Durum renk gövde tint, etiketler.

### PanelCard (yangın paneli)
- **Referans:** `refs/panelcard/normal.png`
- **Üretim:** 1 nötr baz (panel gövdesi, LED sıra yuvası — LED'ler kod tarafında).
- **Kod katmanları:** Sıcaklık/nem etiketleri, LED dizileri.

### FirePanel (yangın alarm paneli)
- **Referans:** `refs/firepanel/normal.png`, `fire-alarm.png`
- **Üretim:** 1 nötr baz (endüstriyel yangın paneli gövdesi, anahtar/LED yuvaları boş).
- **Kod katmanları:** 9 durum lambası (FirePanelData alanları), anahtar çizimleri, etiketler.

### EnergyAnalyzerGraphic (enerji analizörü)
- **Referans:** `refs/energyanalyzergraphic/normal.png`
- **Üretim:** 1 nötr baz (analizör gövdesi, LCD yuvası koyu/boş).
- **Kod katmanları:** LCD değerler (V, A, kW, kWh), etiketler.

## 4. Prompt şablonu (img2img)

> Repaint this flat technical drawing into a polished flat 2D game-UI sprite. Keep the exact shape, size, position, silhouette and bounding box of the drawn object — do not resize, do not move, do not add extra objects. Style: clean industrial battery energy storage system HMI panel, strictly flat 2D front-facing view, NO perspective, NO isometric depth, NO 3D. Soft bevel edges, subtle vertical gradients, dark glass display windows, thin dark outline, single light source from top-left, dark UI color scheme compatible with a #0f0f1a background. Monochrome neutral color body (gray/white panels, dark frame) — NO status colors (no green/orange/red). No text, no labels, no icons inside the sprite. Isolated on fully transparent background. Crisp vector-like edges, high detail.

**Negatif prompt:** `photorealistic, isometric, 3D, perspective, depth, text, watermark, logo, background, floor, shadow outside object, perspective distortion, warped layout, green light, red light, orange light, blue light, colored glow, status LEDs`

## 5. Kalite kontrol kriterleri

1. Sprite, referans PNG ile aynı bounding box oranına sahip olmalı (üst üste bindirmede taşma yok).
2. Şeffaf arka plan kontrolü: köşe pikselleri alpha=0.
3. Nötr baz kontrolü: sprite içinde success/warning/error hex'leri bulunmamalı (durum renkleri kodda).
4. Metin içermemeli (AI üretimi metinler okunaksız olur).
5. Tile edilebilirlik (Cable): segmentin sol ve sağ uçları kesintisiz birleşmeli.

## 6. Dosya düzeni

```
packages/ui/assets/sprites/
  refs/<element>/<state>.png      # Faz 0 referansları (capture script ile)
  refs/<element>/base.png         # Nötr baz referansı (AI üretim girdisi)
packages/ui/src/assets/sprites/<element>/base.png   # Uygulamanın yüklediği sprite
tools/sprites-spec.mjs            # canvas/frame/margin spesifikasyonları
```

## 7. Üretim pipeline notları

- **Model:** `fal-ai/nano-banana/edit` (giriş görselini düzenler) → `fal-ai/birefnet/v2` (arka plan temizliği).
- **Normalizasyon:** Model çözünürlük/aspect değiştirebilir; generate script içerik bbox'ını kırpıp `sprites-spec.mjs` frame'ine yeniden boyutlandırır — frame metaları modelden bağımsız kalır.
- **img2img referansı:** Durumlu (yeşil/turuncu içeren) story DEĞİL, nötr `Base` story yakalaması kullanılır — aksi halde model durum renklerini kopyalar.
