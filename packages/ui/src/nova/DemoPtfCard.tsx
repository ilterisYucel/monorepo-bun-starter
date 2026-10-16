import React from "react";
import type { MarketHour } from "./demo-market";

/**
 * EPİAŞ gün öncesi (PTF) mini kartı (SPEC UC-11, FR-11.6). gdems
 * `home-view.js` `hp-chart` portu: günün saatlik PTF barları, şimdiki ve
 * sonraki saat vurgusu + gün özeti (avg/min/max/cap). Veri `buildMarketDay`
 * çıktısıdır; seri boşsa "No market data" (uydurma yok).
 */

export interface DemoPtfCardProps {
  hours: MarketHour[];
  /** Şimdiki saat (0–23); verilmezse yerel saat. */
  nowHour?: number;
  maxPrice?: number;
  /** Kapanış notu (ör. TEİAŞ/EPİAŞ kaynak açıklaması). */
  note?: string;
}

const tl = (v: number): string => Math.round(v).toLocaleString("en-US");

export const DemoPtfCard: React.FC<DemoPtfCardProps> = ({
  hours,
  nowHour,
  maxPrice = 4500,
  note,
}) => {
  const priced = hours.filter((h) => h.ptf > 0);
  const hasData = priced.length > 0;
  const h = nowHour ?? new Date().getHours();
  const cur = hours[h] ?? { h, ptf: 0, gip: 0, smf: 0, dir: "DENGEDE" as const };
  const nxt = hours[(h + 1) % 24] ?? cur;
  const avg = hasData ? priced.reduce((a, x) => a + x.ptf, 0) / priced.length : 0;
  const mx = hasData ? Math.max(...priced.map((x) => x.ptf)) : 0;
  const mn = hasData ? Math.min(...priced.map((x) => x.ptf)) : 0;
  const W = 240;
  const H = 64;
  const bw = W / 24;

  return (
    <section
      className="card hptf"
      data-testid="demo-ptf-card"
      aria-label="Day-ahead price"
    >
      {!hasData ? (
        <p className="empty">No market data — EPİAŞ PTF series empty.</p>
      ) : (
        <>
          <div className="hp-h">
            <span>
              <small>
                PTF · GÖP · {String(h).padStart(2, "0")}:00–
                {String(h + 1).padStart(2, "0")}:00
              </small>
              <b className="num">{tl(cur.ptf)}</b>
              <em>TL/MWh</em>
            </span>
            <span className="hp-s">
              <small>Next hour</small>
              <b className="num">{tl(nxt.ptf)}</b>
              <em>
                {nxt.ptf > cur.ptf ? "▲" : nxt.ptf < cur.ptf ? "▼" : "="}{" "}
                {tl(Math.abs(nxt.ptf - cur.ptf))}
              </em>
            </span>
          </div>
          <svg
            className="hp-chart"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="PTF today"
          >
            {hours.map((x) => {
              const bh = Math.max(2, (x.ptf / maxPrice) * (H - 4));
              return (
                <rect
                  key={x.h}
                  className={`hp-bar ${x.h === h ? "now" : x.h < h ? "past" : ""}`}
                  x={(x.h * bw + 1).toFixed(1)}
                  y={(H - bh).toFixed(1)}
                  width={(bw - 2).toFixed(1)}
                  height={bh.toFixed(1)}
                >
                  <title>
                    {String(x.h).padStart(2, "0")}:00 · {tl(x.ptf)} TL/MWh
                  </title>
                </rect>
              );
            })}
            <line className="hp-cap" x1="0" x2={W} y1="4" y2="4" />
          </svg>
          <div className="hp-f">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>
          <p className="dsub">
            Today avg {tl(avg)} · min {tl(mn)} · max {tl(mx)} TL/MWh · cap{" "}
            {tl(maxPrice)}
            {note ? ` · ${note}` : ""}
          </p>
        </>
      )}
    </section>
  );
};
