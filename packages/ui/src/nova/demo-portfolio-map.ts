/**
 * Portföy haritası saf görünüm matematiği (SPEC UC-11, K16). gdems
 * `demo/home-view.js` pan/zoom mantığının IO'suz portu: viewBox üretimi,
 * aspect kırpma, zoom ve projelere sığdırma. Deterministik — test edilir.
 */

import { GEO, project } from "./geo-europe";

/** Görünüm penceresi (SVG viewBox). */
export interface MapViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Başlangıç görünümü — Türkiye ve güneydoğu/orta Avrupa. */
export const MAP_HOME = { lon0: 7, lon1: 46, lat0: 34, lat1: 51 } as const;

/** Azami yakınlaştırma çarpanı. */
export const MAP_ZMAX = 14;

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

/** Projeksiyon köşelerinden başlangıç viewBox'ı türetir. */
export function homeViewBox(): MapViewBox {
  const [hx0, hy1] = project(MAP_HOME.lon0, MAP_HOME.lat0);
  const [hx1, hy0] = project(MAP_HOME.lon1, MAP_HOME.lat1);
  return { x: hx0, y: hy0, w: hx1 - hx0, h: hy1 - hy0 };
}

/**
 * ViewBox'ı eleman aspect'ine uydurur ve harita sınırına kırpar
 * (gdems `apply()` portu). `aspect = genişlik / yükseklik`.
 */
export function clampViewBox(vb: MapViewBox, aspect: number): MapViewBox {
  const out = { ...vb };
  out.h = out.w / aspect;
  if (out.w > GEO.W) {
    out.w = GEO.W;
    out.h = out.w / aspect;
  }
  if (out.h > GEO.H) {
    out.h = GEO.H;
    out.w = out.h * aspect;
  }
  out.x = clamp(out.x, 0, GEO.W - out.w);
  out.y = clamp(out.y, 0, GEO.H - out.h);
  return out;
}

/**
 * `at` noktasını merkez alarak `factor` çarpanıyla zoom uygular.
 * `factor > 1` yakınlaştırır; `at` yoksa viewBox merkezi kullanılır.
 */
export function zoomViewBox(
  vb: MapViewBox,
  factor: number,
  at?: { x: number; y: number },
  zmax = MAP_ZMAX,
): MapViewBox {
  const home = homeViewBox();
  const p = at ?? { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 };
  const nw = Math.min(GEO.W, Math.max(home.w / zmax, vb.w / factor));
  const kk = nw / vb.w;
  return {
    x: p.x - (p.x - vb.x) * kk,
    y: p.y - (p.y - vb.y) * kk,
    w: nw,
    h: vb.h * kk,
  };
}

/** Verilen noktaları (projeksiyon koordinatları) kapsayan viewBox üretir. */
export function fitViewBox(
  points: readonly (readonly [number, number])[],
  home: MapViewBox,
  factor = 2.2,
  minFactor = 6,
): MapViewBox {
  if (points.length === 0) return { ...home };
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(home.w / minFactor, (maxX - minX) * factor);
  const h = Math.max(home.h / minFactor, (maxY - minY) * factor);
  return {
    x: (minX + maxX) / 2 - w / 2,
    y: (minY + maxY) / 2 - h / 2,
    w,
    h,
  };
}
