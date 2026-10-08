import React, { useMemo } from "react";
import {
  FREQ_RANGES,
  arbitragePlan,
  buildMarketDay,
  freqRangeOf,
  pfEnergyCheck,
  pfResponseMW,
  type MarketHour,
} from "./demo-market";

/**
 * Grid & Market görünümü (SPEC UC-6, FR-6.1..6.3). Referans konsol düzeni:
 * EPİAŞ fiyat grafiği (PTF bar + GİP çizgi + SMF + öneri + now + cap), 6'lı
 * kartlar, saatlik tablo; TEİAŞ PFK P–f / P–Q / LVRT + frekans & telemetri.
 */

export interface DemoMarketPoint {
  timestamp: string;
  value: number;
  unit: string;
}

export interface DemoMarketSeries {
  key?: string;
  label: string;
  points: DemoMarketPoint[];
}

export interface DemoTeiasRow {
  label: string;
  value: string;
}

export interface DemoMarketViewProps {
  series: DemoMarketSeries[];
  maxPrice?: number;
  reserveMW?: number;
  availableMWh?: number;
  availableChargeMWh?: number;
  frequencyHz?: number;
  powerMW?: number;
  reactiveMvar?: number;
  kv?: number;
  /** İK Ek-1 Tablo 1 telemetri satırları (canlı). */
  telemetryRows?: DemoTeiasRow[];
  /** İK Ek-1 Tablo 2 komut satırları. */
  commandRows?: DemoTeiasRow[];
}

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
const tl = (v: number): string => Math.round(v).toLocaleString("en-US");
const hhmm = (ms: number): string => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const DemoMarketView: React.FC<DemoMarketViewProps> = ({
  series,
  maxPrice = 4500,
  reserveMW = 10,
  availableMWh = 0,
  availableChargeMWh,
  frequencyHz = 50,
  powerMW = 0,
  reactiveMvar = 0,
  kv,
  telemetryRows,
  commandRows,
}) => {
  const hours = useMemo(
    () =>
      buildMarketDay(
        series.map((s) => ({ key: s.key ?? s.label, points: s.points })),
      ),
    [series],
  );
  const hasData = hours.some((h) => h.ptf > 0);
  const plan = useMemo(() => arbitragePlan(hours, 2), [hours]);
  const now = new Date();
  const hNow = now.getHours();
  const cur = hours[hNow];
  const priced = hours.filter((h) => h.ptf > 0);
  const avg = priced.reduce((a, x) => a + x.ptf, 0) / Math.max(1, priced.length);

  const pfE = pfEnergyCheck(availableMWh, reserveMW);
  const respMW = pfResponseMW(frequencyHz, reserveMW);

  return (
    <div className="market" data-testid="demo-market">
      <section className="card">
        <header>
          <h2>
            Market · EPİAŞ<small>GÖP PTF · GİP AOF · SMF · TL/MWh · hourly</small>
          </h2>
        </header>
        <div className="mkbody">
          {!hasData ? (
            <p className="empty">No market data — EPİAŞ series empty.</p>
          ) : (
            <>
              <div className="mgrid g6">
                <div>
                  <small>PTF · {String(hNow).padStart(2, "0")}:00</small>
                  <b className="num">{tl(cur.ptf)}</b>
                  <em>TL/MWh · GÖP</em>
                </div>
                <div>
                  <small>GİP AOF</small>
                  <b className="num">{tl(cur.gip)}</b>
                  <em>TL/MWh · weighted</em>
                </div>
                <div className={cur.dir === "YAT" ? "up" : cur.dir === "YAL" ? "dn" : ""}>
                  <small>SMF</small>
                  <b className="num">{tl(Math.abs(cur.smf))}</b>
                  <em>system {cur.dir}</em>
                </div>
                <div>
                  <small>Daily PTF avg</small>
                  <b className="num">{tl(avg)}</b>
                  <em>
                    min {tl(Math.min(...priced.map((h) => h.ptf)))} · max{" "}
                    {tl(Math.max(...priced.map((h) => h.ptf)))}
                  </em>
                </div>
                <div>
                  <small>Suggested charge</small>
                  <b className="num">{plan.cheap.map((h) => String(h).padStart(2, "0")).join(", ")}</b>
                  <em>cheapest hours</em>
                </div>
                <div>
                  <small>Suggested discharge</small>
                  <b className="num">{plan.dear.map((h) => String(h).padStart(2, "0")).join(", ")}</b>
                  <em>dearest hours</em>
                </div>
              </div>
              <div className="mk-legend">
                <span>
                  <i className="k-bar" />
                  PTF (GÖP)
                </span>
                <span>
                  <i className="k-gip" />
                  GİP AOF
                </span>
                <span>
                  <i className="k-smf yat" />
                  SMF · YAT
                </span>
                <span>
                  <i className="k-smf yal" />
                  SMF · YAL
                </span>
                <span>
                  <i className="k-bar chg" />
                  Suggested charge
                </span>
                <span>
                  <i className="k-bar dis" />
                  Suggested discharge
                </span>
              </div>
              <PriceChart hours={hours} plan={plan} hNow={hNow} maxPrice={maxPrice} />
              <div className="tblwrap">
                <table className="dt mk-tbl">
                  <thead>
                    <tr>
                      <th>Hour</th>
                      <th>PTF</th>
                      <th>GİP AOF</th>
                      <th>SMF</th>
                      <th>System</th>
                      <th>Suggested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map((x) => (
                      <tr key={x.h} className={x.h === hNow ? "focus" : x.h > hNow ? "future" : ""}>
                        <td className="txt">
                          {String(x.h).padStart(2, "0")}:00–{String(x.h + 1).padStart(2, "0")}:00
                        </td>
                        <td>{tl(x.ptf)}</td>
                        <td>{tl(x.gip)}</td>
                        <td>{tl(Math.abs(x.smf))}</td>
                        <td className={x.dir === "YAT" ? "sev-warn" : ""}>{x.dir}</td>
                        <td className="txt">
                          {plan.cheap.includes(x.h) ? (
                            <span className="tag c-info">CHARGE</span>
                          ) : plan.dear.includes(x.h) ? (
                            <span className="tag c-warn">DISCHARGE</span>
                          ) : (
                            ""
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="card">
        <header>
          <h2>
            TEİAŞ · grid code & ancillary services<small>telemetry, PFK, P–Q, frequency ranges</small>
          </h2>
        </header>
        <div className="mkbody">
          <div className="mk-grid">
            <div>
              <h4>Primary frequency control (PFK) · P–f</h4>
              <PfkChart fHz={frequencyHz} reserveMW={reserveMW} />
              <dl className="kv2">
                <dt>Reserve R</dt>
                <dd>{f(reserveMW)} MW</dd>
                <dt>Grid frequency</dt>
                <dd>
                  {f(frequencyHz, 3)} Hz · Δf {f((frequencyHz - 50) * 1000, 0)} mHz
                </dd>
                <dt>Expected response</dt>
                <dd>{f(respMW, 2)} MW</dd>
                <dt>Energy check (≥1.25 h)</dt>
                <dd className={pfE.ok ? "c-ok" : "c-alarm"}>{pfE.ok ? "OK" : "Not enough"}</dd>
              </dl>
            </div>
            <div>
              <h4>P–Q capability · standalone storage</h4>
              <PqChart pPu={powerMW} qPu={reactiveMvar} />
              <h4>LVRT</h4>
              <LvrtChart />
            </div>
            <div>
              <h4>Frequency operating ranges (BU Tablo 1)</h4>
              <table className="dt">
                <tbody>
                  {FREQ_RANGES.map((r) => (
                    <tr key={r.min} className={freqRangeOf(frequencyHz)?.min === r.min ? "focus" : ""}>
                      <td className="txt">
                        {r.min} ≤ f &lt; {r.max} Hz
                      </td>
                      <td>{r.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h4>Commands from TEİAŞ / network operator (İK Ek-1 Tablo 2)</h4>
              <table className="dt">
                <tbody>
                  {(commandRows ?? []).map((r) => (
                    <tr key={r.label}>
                      <td className="txt">{r.label}</td>
                      <td className="txt">{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <h4>Telemetry to TEİAŞ SCADA (İK Ek-1 Tablo 1) · live</h4>
          <div className="tblwrap">
            <table className="dt mk-tele">
              <tbody>
                {(telemetryRows ?? []).map((r) => (
                  <tr key={r.label}>
                    <td className="txt">{r.label}</td>
                    <td className="txt">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="dsub">
            Protocol, update period and timestamps are not given in the three documents (to be agreed —
            typically IEC 60870-5-104).
          </p>
        </div>
      </section>
    </div>
  );
};

const PriceChart: React.FC<{
  hours: MarketHour[];
  plan: { cheap: number[]; dear: number[] };
  hNow: number;
  maxPrice: number;
}> = ({ hours, plan, hNow, maxPrice }) => {
  const W = 900;
  const H = 250;
  const M = { l: 52, r: 12, t: 14, b: 26 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const ymax = Math.ceil((maxPrice * 1.1) / 500) * 500;
  const bx = (h: number) => M.l + (h * iw) / 24;
  const by = (v: number) => M.t + ih - (v / ymax) * ih;
  return (
    <svg className="mk-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Hourly prices">
      {Array.from({ length: Math.floor(ymax / 500) + 1 }, (_, i) => i * 500).map((v) => (
        <g key={v}>
          <line className="tc-grid" x1={M.l} x2={W - M.r} y1={by(v)} y2={by(v)} />
          <text x={M.l - 6} y={by(v) + 3} textAnchor="end">
            {tl(v)}
          </text>
        </g>
      ))}
      <line className="mk-cap" x1={M.l} x2={W - M.r} y1={by(maxPrice)} y2={by(maxPrice)} />
      <text className="mk-capt" x={W - M.r} y={by(maxPrice) - 4} textAnchor="end">
        Max price {tl(maxPrice)}
      </text>
      {hours.map((x) => {
        const cls = plan.cheap.includes(x.h) ? "chg" : plan.dear.includes(x.h) ? "dis" : "";
        return (
          <rect
            key={`b${x.h}`}
            className={`mk-bar ${cls} ${x.h === hNow ? "now" : ""}`}
            x={bx(x.h) + 3}
            y={by(x.ptf)}
            width={iw / 24 - 6}
            height={Math.max(0, M.t + ih - by(x.ptf))}
          />
        );
      })}
      <path
        className="mk-gip"
        d={hours
          .map((x, i) => `${i ? "L" : "M"}${(bx(x.h) + iw / 48).toFixed(1)} ${by(x.gip).toFixed(1)}`)
          .join("")}
      />
      {hours.map((x) => (
        <circle
          key={`s${x.h}`}
          className={`mk-smf ${x.dir}`}
          cx={bx(x.h) + iw / 48}
          cy={by(x.smf)}
          r={3.4}
        />
      ))}
      <line className="mk-now" x1={bx(hNow + 0.5)} x2={bx(hNow + 0.5)} y1={M.t} y2={M.t + ih} />
    </svg>
  );
};

const PfkChart: React.FC<{ fHz: number; reserveMW: number }> = ({ fHz, reserveMW }) => {
  const W = 420;
  const H = 230;
  const M = { l: 44, r: 12, t: 12, b: 28 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const fx = (v: number) => M.l + ((v - 49.7) / 0.6) * iw;
  const py = (p: number) => M.t + ih / 2 - (p / 130) * (ih / 2);
  const pExp = pfResponseMW(fHz, 100);
  return (
    <svg className="mk-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="PFK characteristic">
      {[-100, -50, 0, 50, 100].map((p) => (
        <g key={p}>
          <line className="tc-grid" x1={M.l} x2={W - M.r} y1={py(p)} y2={py(p)} />
          <text x={M.l - 5} y={py(p) + 3} textAnchor="end">
            {p}
          </text>
        </g>
      ))}
      {[49.7, 49.8, 49.9, 50, 50.1, 50.2, 50.3].map((v) => (
        <text key={v} x={fx(v)} y={H - 10} textAnchor="middle">
          {v.toFixed(1)}
        </text>
      ))}
      <rect className="mk-db" x={fx(49.99)} y={M.t} width={fx(50.01) - fx(49.99)} height={ih} />
      <path className="mk-pf" d={`M${fx(49.7)} ${py(100)}H${fx(49.8)}L${fx(50.2)} ${py(-100)}H${fx(50.3)}`} />
      <circle
        className="mk-op"
        cx={fx(Math.max(49.7, Math.min(50.3, fHz)))}
        cy={py(Math.abs(fHz - 50) <= 0.01 ? 0 : pExp)}
        r={4}
      />
      <text className="mk-lbl" x={M.l + 60} y={M.t + 12}>
        + discharge
      </text>
      <text className="mk-lbl" x={M.l + 6} y={M.t + ih - 4}>
        − charge
      </text>
      <text className="mk-lbl" x={W - M.r - 4} y={M.t + 12} textAnchor="end">
        R = {f(reserveMW)} MW
      </text>
    </svg>
  );
};

const PqChart: React.FC<{ pPu: number; qPu: number }> = ({ pPu, qPu }) => {
  const W = 300;
  const H = 230;
  const M = { l: 40, r: 12, t: 12, b: 28 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const qx = (v: number) => M.l + ((v + 1.1) / 2.2) * iw;
  const py = (v: number) => M.t + ih / 2 - (v / 1.1) * (ih / 2);
  return (
    <svg className="mk-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="P–Q capability">
      {[-1, -0.4, 0, 0.4, 1].map((v) => (
        <text key={v} x={qx(v)} y={H - 10} textAnchor="middle">
          {v}
        </text>
      ))}
      <path
        className="mk-pq"
        d={`M${qx(-0.4)} ${py(1)}H${qx(0.4)}V${py(0.1)}H${qx(1)}V${py(-0.1)}H${qx(0.4)}V${py(-1)}H${qx(-0.4)}V${py(-0.1)}H${qx(-1)}V${py(0.1)}H${qx(-0.4)}Z`}
      />
      <circle className="mk-op" cx={qx(Math.max(-1, Math.min(1, qPu)))} cy={py(Math.max(-1, Math.min(1, pPu)))} r={4} />
    </svg>
  );
};

const LvrtChart: React.FC = () => {
  const W = 300;
  const H = 200;
  const M = { l: 36, r: 10, t: 10, b: 26 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const tx = (t: number) => M.l + ((t + 200) / 2200) * iw;
  const uy = (u: number) => M.t + ih - (u / 1.2) * ih;
  return (
    <svg className="mk-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="LVRT">
      {[0, 0.45, 0.7, 0.9, 1].map((v) => (
        <line key={v} className="tc-grid" x1={M.l} x2={W - M.r} y1={uy(v)} y2={uy(v)} />
      ))}
      <path
        className="mk-pf"
        d={`M${tx(-200)} ${uy(1)}H${tx(0)}V${uy(0.45)}H${tx(150)}V${uy(0.7)}H${tx(700)}L${tx(1500)} ${uy(0.9)}H${tx(2000)}`}
      />
      <text className="mk-lbl" x={W - M.r} y={H - 22} textAnchor="end">
        t (ms)
      </text>
      <text className="mk-lbl" x={M.l + 4} y={M.t + 10}>
        U (pu)
      </text>
    </svg>
  );
};
