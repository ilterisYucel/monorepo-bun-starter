import React, { useEffect, useMemo, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { SparklineProps, SparklinePoint } from "./Sparkline.types";

/**
 * Sparkline — eksensiz, tek serili alan grafiği (uPlot).
 *
 * Kontrat:
 * - `data` (SparklinePoint[]: { time: ISO string, value: number }) zamana
 *   göre içeride sıralanır — girdi mutate EDİLMEZ (kopya üzerinde sıralama).
 * - Geçersiz tarihli noktalar seriden atlanır (NaN timestamp uPlot'ı bozar);
 *   sayısal olmayan value'lar null sayılır (uPlot spanGaps davranışı).
 * - `color` (hex) seri rengidir; alan dolgusu dikey linearGradient:
 *   üstte %35 opaklık → altta %2 opaklık (eski recharts AreaChart eşdeğeri).
 * - Eksen/tick/legend/cursor YOKTUR — saf mini grafik.
 * - data değişince chart yeniden KURULMAZ; mevcut instance `setData` ile
 *   güncellenir. Unmount'ta `destroy` çağrılır (canvas sızıntısı yok).
 * - Yan etki: yalnızca kendi container div'ine yazar.
 *
 * @remarks
 * Yükseklik prop'u hem container div'ine hem uPlot opts'a verilir;
 * genişlik ResizeObserver ile canlı takip edilir (kart ızgarası
 * yeniden akarken grafik bozulmaz).
 */
export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color,
  height = 46,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);

  const uplotData = useMemo((): uPlot.AlignedData | null => {
    if (data.length === 0) return null;
    const sorted: SparklinePoint[] = [...data].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );
    const valid = sorted.filter(
      (p) => !Number.isNaN(new Date(p.time).getTime()),
    );
    if (valid.length === 0) return null;
    return [
      valid.map((p) => new Date(p.time).getTime() / 1000),
      valid.map((p) => (typeof p.value === "number" ? p.value : null)),
    ] as uPlot.AlignedData;
  }, [data]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!uplotData) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    const gradientFill = (u: uPlot): CanvasGradient => {
      const bbox = u.bbox;
      const grad = u.ctx.createLinearGradient(
        0,
        bbox.top,
        0,
        bbox.top + bbox.height,
      );
      grad.addColorStop(0, hexWithAlpha(color, 0.35));
      grad.addColorStop(1, hexWithAlpha(color, 0.02));
      return grad;
    };

    const opts: uPlot.Options = {
      width: el.getBoundingClientRect().width || 300,
      height,
      ms: 1e-3,
      series: [
        {},
        {
          stroke: color,
          width: 1.5,
          fill: gradientFill,
          spanGaps: true,
        },
      ],
      legend: { show: false },
      cursor: { show: false },
      axes: [],
      scales: {
        x: { time: true },
        y: { auto: true },
      },
    };

    if (chartRef.current) {
      chartRef.current.setData(uplotData);
    } else {
      chartRef.current = new uPlot(opts, uplotData, el);
    }
  }, [uplotData, color, height]);

  // Genişlik takibi — kart ızgarası yeniden akarken chart boyutu güncellenir.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const observer = new ResizeObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (chartRef.current && el) {
          const rect = el.getBoundingClientRect();
          chartRef.current.setSize({ width: rect.width, height: rect.height });
        }
      });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Unmount temizliği.
  useEffect(() => {
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: `${height}px`,
        position: "relative",
      }}
    />
  );
};

/**
 * `#rrggbb` → `rgba(r, g, b, alpha)` dönüşümü.
 * Geçersiz/üç haneli hex girişte aynı string döner (uPlot fillStyle kabul
 * edebildiği sürece çizer; hatalı giriş fırlatmaz).
 */
const hexWithAlpha = (hex: string, alpha: number): string => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const hexPart = match?.[1];
  if (!hexPart) return hex;
  const n = parseInt(hexPart, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
