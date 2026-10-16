import React, { useCallback, useEffect, useRef, useState } from "react";
import { GEO, project } from "./geo-europe";
import {
  MAP_HOME,
  homeViewBox,
  clampViewBox,
  zoomViewBox,
  fitViewBox,
  type MapViewBox,
} from "./demo-portfolio-map";

/**
 * Portföy haritası (SPEC UC-11, FR-11.2/FR-11.3/FR-11.4). gdems
 * `demo/home-view.js` görsel portu: Natural Earth ülke path'leri, şehir
 * etiketleri, proje marker'ları (pulse + bolt), hover tip kartı ve
 * wheel/drag/pinch/dblclick/klavye zoom. Saf görünüm matematiği
 * `demo-portfolio-map`'tedir; bu bileşen yalnız sunum + etkileşim taşır.
 *
 * Marker durumu çağırandan gelir (canlı saha): `dis`/`chg`/`idle`/`alarm`;
 * `live:false` projeler `demo` işaretlidir ve tıklama konsol AÇMAZ.
 */

export type DemoPortfolioSiteStatus = "dis" | "chg" | "idle" | "alarm";

export interface DemoPortfolioTipRow {
  label: string;
  value: string;
  cls?: string;
}

export interface DemoPortfolioSite {
  /** Benzersiz indeks (marker `data-site`). */
  i: number;
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** `true` ise canlı saha; tıklama konsol açar. */
  live: boolean;
  status: DemoPortfolioSiteStatus;
  tip: {
    subtitle: string;
    rows: DemoPortfolioTipRow[];
    footer: string;
  };
}

export interface DemoPortfolioMapProps {
  sites: DemoPortfolioSite[];
  /** Canlı proje seçildiğinde çağrılır (marker/kart tıklaması). */
  onOpen?: (i: number) => void;
  height?: number;
}

/** Ana + yakın şehirler (zoom'da minor etiketler görünür). */
const CITIES: [string, number, number, boolean?][] = [
  ["İstanbul", 41.01, 28.98],
  ["İzmir", 38.42, 27.14],
  ["Antalya", 36.9, 30.7],
  ["Konya", 37.87, 32.48],
  ["Kayseri", 38.72, 35.48],
  ["Trabzon", 41.0, 39.72],
  ["Athens", 37.98, 23.73],
  ["Sofia", 42.7, 23.32],
  ["Bucharest", 44.43, 26.1],
  ["Budapest", 47.5, 19.04],
  ["Vienna", 48.21, 16.37],
  ["Berlin", 52.52, 13.4],
  ["Rome", 41.9, 12.5],
  ["Belgrade", 44.79, 20.45],
  ["Kyiv", 50.45, 30.52],
  ["Tbilisi", 41.72, 44.79],
  ["Warsaw", 52.23, 21.01],
  ["Paris", 48.86, 2.35],
  ["London", 51.51, -0.13],
  ["Ankara", 39.93, 32.86, true],
  ["Eskişehir", 39.78, 30.52, true],
  ["Bursa", 40.19, 29.06, true],
  ["Adana", 37.0, 35.32, true],
  ["Gaziantep", 37.07, 37.38, true],
  ["Samsun", 41.29, 36.33, true],
  ["Diyarbakır", 37.91, 40.24, true],
  ["Erzurum", 39.9, 41.27, true],
  ["Van", 38.5, 43.38, true],
  ["Denizli", 37.78, 29.09, true],
];

const STATUS_CLASS: Record<DemoPortfolioSiteStatus, string> = {
  dis: "dis",
  chg: "chg",
  idle: "",
  alarm: "alarm",
};

export const DemoPortfolioMap: React.FC<DemoPortfolioMapProps> = ({
  sites,
  onOpen,
  height = 560,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [vb, setVb] = useState<MapViewBox>(() => homeViewBox());
  const [tip, setTip] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState<{ left: number; top: number }>({
    left: 12,
    top: 12,
  });

  const apply = useCallback((next: MapViewBox) => {
    const el = svgRef.current;
    const rect = el?.getBoundingClientRect();
    const aspect =
      rect && rect.width && rect.height
        ? rect.width / rect.height
        : homeViewBox().w / homeViewBox().h;
    setVb(clampViewBox(next, aspect));
  }, []);

  const zoom = useCallback(
    (factor: number, at?: { x: number; y: number }) => {
      setVb((cur) => {
        const el = svgRef.current;
        const rect = el?.getBoundingClientRect();
        const aspect =
          rect && rect.width && rect.height
            ? rect.width / rect.height
            : homeViewBox().w / homeViewBox().h;
        return clampViewBox(zoomViewBox(cur, factor, at), aspect);
      });
      setTip(null);
    },
    [],
  );

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onResize = (): void => apply({ ...vb });
    apply({ ...vb });
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(onResize);
      ro.observe(el);
      return () => ro.disconnect();
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tip === null) return;
    const el = svgRef.current;
    const wrap = wrapRef.current;
    const marker = el?.querySelector<SVGGElement>(`[data-site="${tip}"]`);
    if (!marker || !wrap) return;
    const r = marker.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    const mx = r.left - wr.left + r.width / 2;
    const my = r.top - wr.top + r.height / 2;
    setTipPos({
      left: mx + 360 < wr.width ? mx + 18 : Math.max(8, mx - 348),
      top: Math.max(8, my - 40),
    });
  }, [tip]);

  const toSvg = (
    cx: number,
    cy: number,
  ): { x: number; y: number } => {
    const el = svgRef.current;
    const m = el?.getScreenCTM?.();
    if (!el || !m || typeof DOMPoint === "undefined") {
      return { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 };
    }
    const pt = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>): void => {
    e.preventDefault();
    zoom(Math.pow(1.0018, -e.deltaY), toSvg(e.clientX, e.clientY));
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>): void => {
    const el = svgRef.current;
    if (!el) return;
    const start = { x: e.clientX, y: e.clientY, vb: { ...vb } };
    let moved = false;
    const onMove = (ev: PointerEvent): void => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      const rect = el.getBoundingClientRect();
      const scale = rect.width ? start.vb.w / rect.width : 1;
      setVb(
        clampViewBox(
          {
            ...start.vb,
            x: start.vb.x - dx * scale,
            y: start.vb.y - dy * scale,
          },
          rect.width && rect.height ? rect.width / rect.height : start.vb.w / start.vb.h,
        ),
      );
    };
    const onUp = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const markerClass = (s: DemoPortfolioSite): string =>
    `map-site ${STATUS_CLASS[s.status]} ${s.live ? "" : "demo"}`.trim();

  const showTip = (i: number): void => setTip(i);
  const hideTip = (): void => setTip(null);
  const open = (s: DemoPortfolioSite): void => {
    if (s.live) onOpen?.(s.i);
  };

  const sitePoints = sites.map((s) => project(s.lon, s.lat));
  const home = homeViewBox();
  const zoomed = vb.w / home.w < 0.55;
  const zoomLabel = `${(home.w / vb.w).toFixed(1)}×`;
  const active = tip !== null ? sites.find((s) => s.i === tip) : undefined;

  const grat: string[] = [];
  for (let lo = -10; lo <= 50; lo += 5) {
    const [x] = project(lo, 45);
    grat.push(`M${x.toFixed(1)},0V${GEO.H}`);
  }
  for (let la = 30; la <= 60; la += 5) {
    const [, y] = project(20, la);
    grat.push(`M0,${y.toFixed(1)}H${GEO.W}`);
  }

  return (
    <div className="mapwrap" ref={wrapRef}>
      <svg
        ref={svgRef}
        className={`homemap${zoomed ? " zin" : ""}`}
        viewBox={`${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}`}
        style={{ height }}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Portfolio map of Türkiye and Europe with project sites"
        tabIndex={0}
        data-testid="demo-portfolio-map"
        onWheel={onWheel}
        onDoubleClick={(e) => {
          if ((e.target as Element).closest?.(".map-site")) return;
          zoom(2, toSvg(e.clientX, e.clientY));
        }}
        onPointerDown={onPointerDown}
        onKeyDown={(e) => {
          if (e.key === "+" || e.key === "=") zoom(1.4);
          else if (e.key === "-") zoom(1 / 1.4);
          else if (e.key === "ArrowLeft") apply({ ...vb, x: vb.x - vb.w * 0.1 });
          else if (e.key === "ArrowRight") apply({ ...vb, x: vb.x + vb.w * 0.1 });
          else if (e.key === "ArrowUp") apply({ ...vb, y: vb.y - vb.h * 0.1 });
          else if (e.key === "ArrowDown") apply({ ...vb, y: vb.y + vb.h * 0.1 });
          else return;
          e.preventDefault();
        }}
      >
        <rect className="map-sea" x="0" y="0" width={GEO.W} height={GEO.H} />
        <path className="map-grat" d={grat.join("")} />
        {GEO.countries.map((c) => (
          <path
            key={c.id ?? c.n}
            className={`map-land${c.id === "792" ? " tr" : ""}`}
            d={c.d}
          >
            <title>{c.n}</title>
          </path>
        ))}
        {CITIES.map(([n, la, lo, minor]) => {
          const [x, y] = project(lo, la);
          return (
            <g
              key={n}
              className={`map-cg${minor ? " minor" : ""}`}
              transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
            >
              <circle className="map-city" r="2.2" />
              <text className="map-ct" x="4.5" y="-3">
                {n}
              </text>
            </g>
          );
        })}
        {sites.map((s) => {
          const [x, y] = project(s.lon, s.lat);
          return (
            <g
              key={s.id}
              className={markerClass(s)}
              data-site={s.i}
              tabIndex={0}
              role="button"
              aria-label={`${s.name}${s.live ? " — open project" : " — demo, not live"}`}
              transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
              onPointerOver={() => showTip(s.i)}
              onPointerOut={hideTip}
              onFocus={() => showTip(s.i)}
              onBlur={hideTip}
              onClick={() => open(s)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  open(s);
                }
              }}
            >
              <circle className="map-pulse" r="12" />
              <circle className="map-dot" r="8" />
              <path className="map-bolt" d="M0.9 -5L-3 0.9H0L-0.9 5L3 -0.9H0Z" />
              <text className="map-lbl" x="12" y="-8">
                {s.name}
                {s.live ? "" : " · demo"}
              </text>
            </g>
          );
        })}
      </svg>

      {active ? (
        <div className="maptip" data-testid="demo-portfolio-tip" style={tipPos}>
          <b>{active.name}</b>
          <small>
            {active.tip.subtitle} · {active.id}
          </small>
          <dl>
            {active.tip.rows.map((r) => (
              <React.Fragment key={r.label}>
                <dt>{r.label}</dt>
                <dd className={r.cls ?? ""}>{r.value}</dd>
              </React.Fragment>
            ))}
          </dl>
          <em>{active.tip.footer}</em>
        </div>
      ) : null}

      <div className="mapctl" role="group" aria-label="Map zoom">
        <button type="button" onClick={() => zoom(1.6)} title="Zoom in" aria-label="Zoom in">
          +
        </button>
        <span>{zoomLabel}</span>
        <button type="button" onClick={() => zoom(1 / 1.6)} title="Zoom out" aria-label="Zoom out">
          −
        </button>
        <button
          type="button"
          onClick={() => apply(fitViewBox(sitePoints, home))}
          title="Zoom to the projects"
          aria-label="Zoom to the projects"
        >
          ◎
        </button>
        <button
          type="button"
          onClick={() => apply({ ...home })}
          title="Reset view"
          aria-label="Reset view"
        >
          ⌂
        </button>
      </div>
      <p className="maphint">Scroll or pinch to zoom · drag to pan · double-click to zoom in</p>
      <p className="map-src">Country outlines: Natural Earth 1:50m (public domain)</p>
    </div>
  );
};
