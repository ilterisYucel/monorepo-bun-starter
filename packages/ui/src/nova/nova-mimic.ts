/**
 * NOVA saha yerleşimi × tek hat SVG fabrikası — framework'suz (SPEC K5).
 *
 *   const mimic = createNovaMimic(svg, topo, { onSelect, onCellSelect });
 *   mimic.update(state);
 *   mimic.setOverlay("soc"); mimic.setSelected(3); mimic.destroy();
 *
 * Renkler `nova-mimic.css` içindeki `--nm-*` CSS değişkenlerinden gelir
 * (`applyNovaLightVars` :root'a yazar). Saf yardımcılar ayrıca test edilir.
 */
import {
  listNovaUnits,
  type NovaMimicState,
  type NovaPcsState,
  type NovaSwitchPos,
  type NovaTopology,
  type NovaUnitState,
} from "./mimic-types";

const W = 1240;
const H = 940;

/* ───────────── saf yardımcılar ───────────── */

export interface EnergizationResult {
  bus: boolean;
  aux: boolean;
  feeders: Record<string, boolean>;
  units: Record<
    number,
    { inLive: boolean; busLive: boolean; trLive: boolean; outLive: boolean }
  >;
}

/** Anahtarlardan enerjili iletkenler (radyal fider, POI daima canlı). */
export function computeEnergization(
  topo: NovaTopology,
  state: NovaMimicState,
): EnergizationResult {
  const st = state.station;
  const bus = st.H01 === "closed";
  const feeders: Record<string, boolean> = {};
  const units: EnergizationResult["units"] = {};
  for (const [f, fd] of Object.entries(topo.feeders)) {
    feeders[f] = bus && st[fd.cell as keyof typeof st] === "closed";
    let up = feeders[f];
    for (const n of fd.units) {
      const u = state.units.find((x) => x.n === n);
      if (!u) continue;
      const inLive = up;
      const busLive = inLive && u.rmu.H01 === "closed";
      const trLive = busLive && u.rmu.H02 === "closed";
      const outLive = busLive && u.rmu.H03 === "closed";
      units[n] = { inLive, busLive, trLive, outLive };
      up = outLive;
    }
  }
  return { bus, aux: bus && st.H02 === "closed", feeders, units };
}

export type Severity = "alarm" | "warn" | "cold" | "maint" | "info" | null;

export function bankSeverity(
  b: { tmax: number; tmin?: number; dTdt10?: number; dvmV: number },
  L: NovaTopology["limits"],
): Severity {
  if (b.tmax > L.tempMax) return "alarm";
  if ((b.tmin ?? b.tmax) < L.tempMin) return "cold";
  if ((b.dTdt10 ?? 0) >= L.dTdtWarn || b.dvmV >= L.dvWarn) return "warn";
  return null;
}

export const rackSeverity = (
  t: number,
  L: NovaTopology["limits"],
): Severity => (t > L.tempMax ? "alarm" : t < L.tempMin ? "cold" : null);

export const PCS_TEXT: Record<NovaPcsState["state"], string> = {
  dis: "DEŞARJ",
  chg: "ŞARJ",
  stby: "BEKLEME",
  rest: "DİNLENME",
  fault: "ARIZA",
  off: "KAPALI",
};

export const POS_TEXT: Record<NovaSwitchPos, string> = {
  closed: "Kapalı",
  open: "Açık",
  tripped: "Açtı",
};

const fmt = (v: number, d = 1): string =>
  (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(".", ",");
const clamp = (v: number, a: number, b: number): number =>
  Math.min(b, Math.max(a, v));

/** Banka için varsayılan durum metni. */
export function defaultUnitStatus(
  u: NovaUnitState,
  L: NovaTopology["limits"],
): { text: string; sev: Severity } {
  if (u.rmu.H02 !== "closed" && u.rmu.es) {
    return { text: "BAKIMDA · TOPRAKLI", sev: "maint" };
  }
  const fault = u.pcs.find((p) => p.state === "fault");
  if (fault) return { text: `KISMİ · PCS-${u.n}${fault.id} ARIZA`, sev: "alarm" };
  const sv = u.banks.map((b) => bankSeverity(b, L));
  if (sv.includes("alarm")) {
    return {
      text: `SICAKLIK YÜKSEK · ${fmt(Math.max(...u.banks.map((b) => b.tmax)))} °C`,
      sev: "alarm",
    };
  }
  if (sv.includes("cold")) {
    return {
      text: `SICAKLIK DÜŞÜK · ${fmt(Math.min(...u.banks.map((b) => b.tmin ?? b.tmax)))} °C`,
      sev: "cold",
    };
  }
  if (u.banks.some((b) => (b.dTdt10 ?? 0) >= L.dTdtWarn)) {
    return { text: "SICAKLIK ARTIŞI", sev: "warn" };
  }
  if (sv.includes("warn")) return { text: "HÜCRE DENGESİZLİĞİ", sev: "warn" };
  const run = u.pcs.filter((p) => p.state === "chg" || p.state === "dis");
  if (run.length) {
    return { text: `${PCS_TEXT[run[0].state]} · ${run.length}/${u.pcs.length} PCS`, sev: null };
  }
  if (u.pcs.some((p) => p.state === "rest")) return { text: "DİNLENME", sev: null };
  return { text: "BEKLEMEDE", sev: null };
}

/** Uzaklaşan sıcaklık dolgusu: bant altı mavi, üstü kırmızı, ortada nötr. */
export const tempFill = (
  t: number,
  L: { tempMin: number; tempMax: number } = { tempMin: 19, tempMax: 25 },
): string =>
  t > L.tempMax
    ? `rgba(var(--nm-hot-rgb),${(0.3 + clamp((t - L.tempMax) / 6, 0, 1) * 0.55).toFixed(3)})`
    : t < L.tempMin
      ? `rgba(var(--nm-cold-rgb),${(0.3 + clamp((L.tempMin - t) / 5, 0, 1) * 0.55).toFixed(3)})`
      : "rgba(var(--nm-mid-rgb),0.16)";

export const rackFill = tempFill;

/* ───────────── SVG primitifleri ───────────── */
const X = (s: "L" | "R", x: number): number => (s === "L" ? x : W - x);
const RX = (s: "L" | "R", x: number, w: number): number =>
  s === "L" ? x : W - x - w;
const seg = (
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  c = "",
): string => `<line id="${id}" class="nm-cond ${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const cbH = (id: string, cx: number, y: number): string =>
  `<g id="${id}" class="nm-sw nm-cb"><line class="nm-tm" x1="${cx - 10}" y1="${y}" x2="${cx - 5}" y2="${y}"/><line class="nm-tm" x1="${cx + 5}" y1="${y}" x2="${cx + 10}" y2="${y}"/><rect class="nm-bd" x="${cx - 5}" y="${y - 5}" width="10" height="10" rx="1"/></g>`;
const cbV = (id: string, x: number, cy: number): string =>
  `<g id="${id}" class="nm-sw nm-cb"><line class="nm-tm" x1="${x}" y1="${cy - 12}" x2="${x}" y2="${cy - 6}"/><line class="nm-tm" x1="${x}" y1="${cy + 6}" x2="${x}" y2="${cy + 12}"/><rect class="nm-bd" x="${x - 6}" y="${cy - 6}" width="12" height="12" rx="1"/></g>`;
/** Motorlu kumanda mekanizması işareti ("M", K2). */
const motorMarker = (x: number, y: number): string =>
  `<g class="nm-motor"><circle cx="${x}" cy="${y}" r="5.2"/><text x="${x}" y="${y + 3}" text-anchor="middle">M</text></g>`;

function buildStation(topo: NovaTopology, p: string): string {
  const st = topo.station;
  let h = `<text class="nm-th" x="358" y="58" text-anchor="end">${st.name}</text><text class="nm-t" x="358" y="72" text-anchor="end">${st.rating}</text>`;
  st.cells.forEach((c, i) => {
    const x = 370 + i * 100;
    const cx = x + 50;
    h += `<rect class="nm-cell" x="${x}" y="40" width="100" height="130"/><text class="nm-th" x="${cx}" y="20" text-anchor="middle" style="font-size:11px">${c.id}</text><text class="nm-t" x="${cx}" y="32" text-anchor="middle">${c.label}</text>`;
    const id = `${p}st${c.id}`;
    if (c.kind === "cb") {
      h += seg(id + "a", cx, 62, cx, 93, "nm-mv") + cbV(id, cx, 105) + seg(id + "b", cx, 117, cx, 170, "nm-mv");
      if (c.ct) h += `<circle class="nm-ct" cx="${cx}" cy="131" r="5.5"/><text class="nm-tv" id="${id}I" x="${cx + 9}" y="134"></text>`;
      if (c.motor) h += motorMarker(x + 88, 118);
      if (c.es) {
        h += `<g id="${id}es" class="nm-esw"><line class="nm-esl" x1="${cx}" y1="150" x2="${cx - 14}" y2="150"/><circle class="nm-esd" cx="${cx - 14}" cy="150" r="1.8"/><line class="nm-esl nm-bc" x1="${cx - 14}" y1="150" x2="${cx - 14}" y2="160"/><line class="nm-esl nm-bo" x1="${cx - 14}" y1="150" x2="${cx - 21}" y2="158"/><line class="nm-esl" x1="${cx - 20}" y1="161" x2="${cx - 8}" y2="161"/><line class="nm-esl" x1="${cx - 18}" y1="164" x2="${cx - 10}" y2="164"/><line class="nm-esl" x1="${cx - 16}" y1="167" x2="${cx - 12}" y2="167"/></g>`;
      }
    }
    if (c.kind === "lbs") {
      h += seg(id + "a", cx, 62, cx, 93, "nm-mv") + `<g id="${id}" class="nm-sw nm-lbs"><circle class="nm-dot" cx="${cx}" cy="${117}" r="2.6"/><line class="nm-bl" x1="${cx - 5}" y1="93" x2="${cx + 5}" y2="93"/><line class="nm-bl nm-bc" x1="${cx}" y1="93" x2="${cx}" y2="117"/><line class="nm-bl nm-bo" x1="${cx}" y1="93" x2="${cx + 9}" y2="114"/></g>` + seg(id + "b", cx, 117, cx, 150, "nm-mv") + `<text class="nm-t8" x="${cx}" y="162" text-anchor="middle">→ AUX</text>`;
    }
    if (c.kind === "vt") {
      h += seg(id + "a", cx, 62, cx, 88, "nm-mv") + `<rect x="${cx - 3}" y="88" width="6" height="11" class="nm-vt"/>` + seg(id + "b", cx, 99, cx, 106, "nm-mv");
      h += `<circle class="nm-vt" cx="${cx}" cy="113" r="7"/><circle class="nm-vt" cx="${cx}" cy="123" r="7"/>`;
      h += `<text class="nm-tv" id="${id}I" x="${cx}" y="143" text-anchor="middle"></text><text class="nm-tv" id="${p}vtTxt" x="${cx}" y="155" text-anchor="middle"></text><text class="nm-tvm" id="${p}hzTxt" x="${cx}" y="166" text-anchor="middle"></text>`;
      h += `<circle class="nm-ct" cx="${cx - 30}" cy="62" r="5.5"/><text class="nm-t8" x="${cx - 30}" y="80" text-anchor="middle">CT</text>`;
    }
  });
  h += seg(`${p}sbus`, 370, 62, 370 + st.cells.length * 100, 62, "nm-mv nm-bus") + `<text class="nm-t8" x="374" y="56">${st.busLabel}</text>`;
  h += st.cells
    .map((c, i) =>
      c.kind === "lbs"
        ? ""
        : `<rect class="nm-cellhit" tabindex="0" role="button" aria-label="${c.id} ${c.label}" data-cell="${c.id}" x="${371 + i * 100}" y="41" width="98" height="128" rx="2"/>`,
    )
    .join("");
  const inc = st.cells.findIndex((c) => c.role === "incomer");
  const icx = 420 + inc * 100;
  h += `<path id="${p}poiL" class="nm-cond nm-mv nm-live" d="M${icx} 170V200H196"/><circle cx="192" cy="200" r="4" class="nm-poi"/>`;
  h += `<path id="${p}flPoi" class="nm-flow flowline" d="M${icx} 170V200H196"/>`;
  h += `<text class="nm-th" x="182" y="196" text-anchor="end">${st.poiLabel}</text><text class="nm-tv" id="${p}poiTxt" x="182" y="211" text-anchor="end"></text>`;
  h += `<text class="nm-t8" x="${(icx + 196) / 2}" y="194" text-anchor="middle">${st.poiCable}</text>`;
  const lanes: Record<string, number> = { L: 604, R: 636 };
  const fs = Object.entries(topo.feeders).map(([f, fd]) => ({
    f,
    fd,
    cx: 420 + st.cells.findIndex((c) => c.id === fd.cell) * 100,
  }));
  const right = fs.find((x) => x.fd.side === "R");
  fs.forEach(({ f, fd, cx }) => {
    const lane = lanes[fd.side];
    const y = fd.side === "R" ? 212 : 232;
    let d = `M${cx} 170V${y}`;
    const crosses = fd.side === "L" && right !== undefined && right.cx < cx;
    d += crosses ? `H${lanes.R + 8}a8 8 0 0 0 -16 0H${lane}` : `H${lane}`;
    d += "V250";
    h += `<path id="${p}fd${f}" class="nm-cond nm-mv" d="${d}"/>`;
    h += `<path id="${p}fl${f}" class="nm-flow flowline" d="${d}"/>`;
    const L = fd.side === "L";
    const tx = L ? 596 : 644;
    const a = L ? "end" : "start";
    h += `<text class="nm-t8" x="${tx}" y="250" text-anchor="${a}">${fd.cell} · BESS#${fd.units[0]}–${fd.units[fd.units.length - 1]}</text>`;
    h += `<text class="nm-th" x="${tx}" y="262" text-anchor="${a}" style="font-size:11px">FİDER ${f}</text><text class="nm-tvm" id="${p}fd${f}txt" x="${tx}" y="274" text-anchor="${a}"></text>`;
  });
  return h;
}

function buildUnit(
  topo: NovaTopology,
  u: { n: number; side: "L" | "R"; row: number; last: boolean },
  p: string,
): string {
  const s = u.side;
  const n = u.n;
  const U = topo.unit;
  const top = 290 + u.row * 130;
  const m = top + 68;
  const yA = top + 42;
  const yB = top + 94;
  const cx0 = RX(s, 20, 260);
  const lane = X(s, 604);
  const hx = s === "L" ? 10 : 642;
  let h = `<g id="${p}u${n}" class="nm-unit demo-unit" tabindex="0" role="button" aria-label="BESS#${n} ayrıntıları" data-unit="${n}">`;
  h += `<rect class="nm-hit" x="${hx}" y="${top - 4}" width="588" height="128"/><rect class="nm-selbox" x="${hx}" y="${top - 4}" width="588" height="128" rx="6"/>`;
  h += `<text class="nm-th" x="${cx0}" y="${top + 11}">BESS#${n}</text><text class="nm-ust" id="${p}ust${n}" x="${cx0 + 56}" y="${top + 11}"></text>`;
  h += `<rect class="nm-cont" x="${cx0}" y="${top + 18}" width="260" height="100" rx="2"/>`;
  for (const [dx, dy] of [[0, 0], [254, 0], [0, 94], [254, 94]]) {
    h += `<rect class="nm-cast" x="${cx0 + dx}" y="${top + 18 + dy}" width="6" height="6" rx="1"/>`;
  }
  h += `<rect class="nm-hatch" x="${cx0 + 1}" y="${top + 19}" width="258" height="98"/>`;
  U.banks.forEach((b, i) => {
    const hy = top + 18 + i * 50;
    const k = `${p}${n}${b}`;
    h += `<rect class="nm-bankfill" id="${k}bk" x="${cx0 + 1}" y="${hy + 1}" width="258" height="48"/>`;
    h += `<text class="nm-th" x="${cx0 + 11}" y="${hy + 30}" style="font-size:13px">${b}</text>`;
    h += `<text class="nm-tv" id="${k}t1" x="${cx0 + 28}" y="${hy + 19}"></text><text class="nm-tvm" id="${k}t2" x="${cx0 + 28}" y="${hy + 33}"></text>`;
    h += `<rect class="nm-socbg" x="${cx0 + 28}" y="${hy + 40}" width="145" height="3"/><rect class="nm-socfg" id="${k}sb" x="${cx0 + 28}" y="${hy + 40}" width="0" height="3"/>`;
    const rw = Math.min(10, (76 - 2.5 * (U.racksPerBank - 1)) / U.racksPerBank);
    for (let r = 0; r < U.racksPerBank; r++) {
      h += `<rect class="nm-rack" id="${k}r${r}" x="${cx0 + 182 + r * (rw + 2.5)}" y="${hy + 10}" width="${rw}" height="30" rx="1.5"/>`;
    }
    h += `<rect class="nm-bo" id="${k}bo" x="${cx0 + 2}" y="${hy + 2}" width="256" height="46" rx="1"/>`;
  });
  h += `<line class="nm-div" x1="${cx0}" y1="${top + 68}" x2="${cx0 + 260}" y2="${top + 68}"/>`;
  U.banks.forEach((b, i) => {
    const y = i ? yB : yA;
    const k = `${p}${n}${b}`;
    h += seg(`${k}dc1`, X(s, 280), y, X(s, 289), y, "nm-live") + seg(`${k}dc2`, X(s, 309), y, X(s, 318), y) + cbH(`${k}qf`, X(s, 299), y);
    h += `<line id="${k}fl" class="nm-flow" x1="${X(s, 280)}" y1="${y}" x2="${X(s, 318)}" y2="${y}"/><text class="nm-t8" x="${X(s, 299)}" y="${y - 9}" text-anchor="middle">DC</text>`;
    const px = RX(s, 318, 108);
    const py = top + 20 + i * 52;
    h += `<g id="${k}pc" class="nm-pcs"><rect class="nm-pcsbox" x="${px}" y="${py}" width="108" height="44" rx="2"/>`;
    h += `<rect class="nm-isym" x="${px + 5}" y="${py + 9}" width="24" height="24"/><line class="nm-isym" x1="${px + 5}" y1="${py + 33}" x2="${px + 29}" y2="${py + 9}"/>`;
    h += `<text class="nm-t8" x="${px + 8}" y="${py + 18}" style="font-size:8px">=</text><text class="nm-t8" x="${px + 20}" y="${py + 31}" style="font-size:9px">~</text>`;
    h += `<text class="nm-tst" id="${k}ps" x="${px + 35}" y="${py + 13}"></text><text class="nm-tv" id="${k}pp" x="${px + 35}" y="${py + 26}"></text><text class="nm-tvm" id="${k}pt" x="${px + 35}" y="${py + 39}"></text>`;
    h += `<text class="nm-t8" x="${px + 104}" y="${py + 13}" text-anchor="end">${n}${b}</text></g>`;
  });
  h += seg(`${p}la${n}`, X(s, 426), yA, X(s, 446), yA) + seg(`${p}lb${n}`, X(s, 426), yB, X(s, 446), yB) + seg(`${p}lv${n}`, X(s, 446), yA, X(s, 446), yB, "nm-bus") + seg(`${p}lt${n}`, X(s, 446), m, X(s, 455), m);
  h += `<text class="nm-t8" x="${X(s, 446)}" y="${yB + 15}" text-anchor="middle">${U.lvLabel}</text>`;
  h += `<circle class="nm-trc" id="${p}tr1${n}" cx="${X(s, 465)}" cy="${m}" r="10"/><circle class="nm-trc" id="${p}tr2${n}" cx="${X(s, 479)}" cy="${m}" r="10"/>`;
  h += `<text class="nm-t8" x="${X(s, 472)}" y="${m - 16}" text-anchor="middle">${U.trKVA} kVA</text>`;
  h += seg(`${p}hv${n}`, X(s, 489), m, X(s, 530), m, "nm-mv");
  h += `<rect class="nm-rmubox" x="${RX(s, 518, 70)}" y="${top + 14}" width="70" height="108" rx="3"/><text class="nm-t8" x="${X(s, 553)}" y="${top + 129}" text-anchor="middle">RMU</text>`;
  const by = u.last ? m : top + 102;
  h += seg(`${p}rb${n}`, X(s, 560), top + 34, X(s, 560), by, "nm-mv nm-bus");
  h += cbH(`${p}h2${n}`, X(s, 540), m) + seg(`${p}h2b${n}`, X(s, 550), m, X(s, 560), m, "nm-mv");
  h += `<g id="${p}es${n}" class="nm-es" style="display:none"><line x1="${X(s, 527)}" y1="${m}" x2="${X(s, 527)}" y2="${m + 10}"/><line x1="${X(s, 521)}" y1="${m + 10}" x2="${X(s, 533)}" y2="${m + 10}"/><line x1="${X(s, 523)}" y1="${m + 13}" x2="${X(s, 531)}" y2="${m + 13}"/><line x1="${X(s, 525)}" y1="${m + 16}" x2="${X(s, 529)}" y2="${m + 16}"/></g>`;
  h += seg(`${p}h1a${n}`, X(s, 560), top + 34, X(s, 571), top + 34, "nm-mv") + lbsH(`${p}h1${n}`, X(s, 582), top + 34, s) + seg(`${p}h1b${n}`, X(s, 593), top + 34, lane, top + 34, "nm-mv");
  if (!u.last) {
    h += seg(`${p}h3a${n}`, X(s, 560), top + 102, X(s, 571), top + 102, "nm-mv") + lbsH(`${p}h3${n}`, X(s, 582), top + 102, s) + seg(`${p}h3b${n}`, X(s, 593), top + 102, lane, top + 102, "nm-mv");
  }
  const lx = s === "L" ? 523 : 692;
  h += `<text class="nm-t8" x="${lx}" y="${top + 31}">H01</text><text class="nm-t8" x="${X(s, 540)}" y="${m - 10}" text-anchor="middle">H02</text>`;
  if (!u.last) h += `<text class="nm-t8" x="${lx}" y="${top + 99}">H03</text>`;
  h += `</g>`;
  const prev = u.row === 0 ? 250 : 290 + (u.row - 1) * 130 + 102;
  h += seg(`${p}ln${n}`, lane, prev, lane, top + 34, "nm-mv");
  return h;
}

function lbsH(id: string, cx: number, y: number, s: "L" | "R"): string {
  const d = s === "R" ? -1 : 1;
  const a = cx - 11 * d;
  const b = cx + 11 * d;
  return `<g id="${id}" class="nm-sw nm-lbs"><circle class="nm-dot" cx="${a}" cy="${y}" r="2.6"/><line class="nm-bl" x1="${b}" y1="${y - 5}" x2="${b}" y2="${y + 5}"/><line class="nm-bl nm-bc" x1="${a}" y1="${y}" x2="${b}" y2="${y}"/><line class="nm-bl nm-bo" x1="${a}" y1="${y}" x2="${b - 3 * d}" y2="${y - 10}"/></g>`;
}

/* ───────────── public factory ───────────── */

export type OverlayMode = "status" | "soc" | "soh" | "temp";

export interface NovaMimicOptions {
  limits?: Partial<NovaTopology["limits"]>;
  overlay?: OverlayMode;
  selected?: number | null;
  onSelect?: (n: number) => void;
  onCellSelect?: (cellId: string) => void;
}

export interface NovaMimic {
  el: SVGSVGElement;
  update(state: NovaMimicState): void;
  setSelected(n: number | null): void;
  setOverlay(mode: OverlayMode): void;
  getOverlay(): OverlayMode;
  destroy(): void;
}

let instance = 0;

export function createNovaMimic(
  svg: SVGSVGElement,
  topo: NovaTopology,
  opts: NovaMimicOptions = {},
): NovaMimic {
  const p = `nm${++instance}_`;
  const L: NovaTopology["limits"] = { ...topo.limits, ...opts.limits };
  const units = listNovaUnits(topo);
  let overlay: OverlayMode = opts.overlay ?? "status";
  let selected: number | null = opts.selected ?? null;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.classList.add("nm");
  svg.innerHTML =
    `<defs><pattern id="${p}hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" class="nm-hatchline"/></pattern></defs>` +
    buildStation(topo, p) +
    units.map((u) => buildUnit(topo, u, p)).join("");
  svg.querySelectorAll(".nm-hatch").forEach((el) => el.setAttribute("fill", `url(#${p}hatch)`));

  const el = (id: string): Element | null => svg.querySelector("#" + p + id);
  const live = (id: string, on: boolean): void => {
    const e = el(id);
    if (e) e.classList.toggle("nm-live", !!on);
  };
  const sw = (id: string, pos: NovaSwitchPos): void => {
    const e = el(id);
    if (!e) return;
    e.classList.toggle("nm-open", pos !== "closed");
    e.classList.toggle("nm-tripped", pos === "tripped");
  };
  const cls = (e: Element | null, base: string, extra: string): void => {
    if (e) e.setAttribute("class", base + (extra ? " " + extra : ""));
  };

  const pick = (e: Event): void => {
    const target = e.target as Element;
    const c = target.closest(".nm-cellhit");
    if (c) {
      opts.onCellSelect?.((c as HTMLElement).dataset.cell ?? "");
      return;
    }
    const g = target.closest(".nm-unit");
    if (g) {
      const n = Number((g as HTMLElement).dataset.unit);
      setSelected(n);
      opts.onSelect?.(n);
    }
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(e);
    }
  };
  svg.addEventListener("click", pick);
  svg.addEventListener("keydown", onKey);

  let last: NovaMimicState | null = null;

  function setSelected(n: number | null): void {
    selected = n;
    svg.querySelectorAll(".nm-unit").forEach((g) =>
      g.classList.toggle("nm-sel", Number((g as HTMLElement).dataset.unit) === n),
    );
  }
  function setOverlay(mode: OverlayMode): void {
    overlay = mode;
    if (last) update(last);
  }

  function overlayFill(b: { soc: number; soh: number; tmax: number; tmin?: number }): string {
    if (overlay === "soc") {
      return `rgba(var(--nm-seq-rgb),${(0.05 + clamp(b.soc / 100, 0, 1) * 0.7).toFixed(3)})`;
    }
    if (overlay === "soh") {
      return `rgba(var(--nm-seq-rgb),${(0.05 + clamp((b.soh - 90) / 10, 0, 1) * 0.7).toFixed(3)})`;
    }
    if (overlay === "temp") {
      const t =
        b.tmax > L.tempMax ? b.tmax : (b.tmin ?? b.tmax) < L.tempMin ? (b.tmin ?? b.tmax) : b.tmax;
      return tempFill(t, L);
    }
    return "";
  }

  function update(state: NovaMimicState): void {
    last = state;
    const E = computeEnergization(topo, state);
    const st = state.station;
    live("sbus", E.bus);
    for (const c of topo.station.cells) {
      const id = "st" + c.id;
      live(id + "a", E.bus);
      if (c.kind === "cb" || c.kind === "lbs") sw(id, st[c.id as keyof typeof st] as NovaSwitchPos);
      if (c.es) {
        const g = el(id + "es");
        g?.classList.toggle("nm-closed", !!st.es?.[c.id]);
      }
      const it = el(id + "I");
      if (it) it.textContent = st.iA ? `${c.kind === "vt" ? "I " : ""}${fmt(st.iA[c.id] ?? 0, 0)} A` : "";
      if (c.kind === "vt") live(id + "b", E.bus);
      if (c.role === "incomer") {
        live(id + "a", true);
        live(id + "b", true);
      }
      if (c.role === "feeder") live(id + "b", E.feeders[c.feeder ?? ""] ?? false);
      if (c.role === "aux") live(id + "b", E.aux);
    }
    const earthed: Record<number, { inE: boolean; busE: boolean; outE: boolean; trE: boolean }> = {};
    for (const [f, fd] of Object.entries(topo.feeders)) {
      let on = !!st.es?.[fd.cell];
      el("fd" + f)?.classList.toggle("nm-earthed", on);
      for (const n of fd.units) {
        const u = state.units.find((x) => x.n === n);
        const inE = on;
        const busE = inE && u?.rmu.H01 === "closed";
        earthed[n] = {
          inE,
          busE,
          outE: busE && u?.rmu.H03 === "closed",
          trE: busE && u?.rmu.H02 === "closed",
        };
        on = earthed[n].outE;
      }
    }
    const earth = (id: string, on: boolean): void => {
      el(id)?.classList.toggle("nm-earthed", !!on);
    };
    for (const nStr in earthed) {
      const n = Number(nStr);
      const q = earthed[n];
      earth("ln" + n, q.inE);
      earth("h1b" + n, q.inE);
      earth("h1a" + n, q.busE);
      earth("rb" + n, q.busE);
      earth("h2b" + n, q.busE);
      earth("h3a" + n, q.busE);
      earth("h3b" + n, q.outE);
      for (const k of ["hv", "tr1", "tr2"]) earth(k + n, q.trE);
    }
    for (const f of Object.keys(topo.feeders)) {
      live("fd" + f, E.feeders[f]);
      const t = el(`fd${f}txt`);
      if (t) t.textContent = state.feederMW ? `${fmt(state.feederMW[f] ?? 0)} MW` : "";
    }
    const poiTxt = el("poiTxt");
    if (poiTxt) {
      poiTxt.textContent = `${fmt(st.kV, 2)} kV · ${fmt(Math.abs(state.poiMW ?? 0))} MW ${(state.poiMW ?? 0) >= 0 ? "→" : "←"}`;
    }
    const vt = el("vtTxt");
    if (vt) {
      vt.textContent = `${fmt(st.kV, 2)} kV`;
      const hz = el("hzTxt");
      if (hz) hz.textContent = `${fmt(st.hz, 2)} Hz`;
    }

    // K2: POI'ye kadar yönlü akış animasyonu (deşarj turuncu / şarj teal).
    const poiMW = state.poiMW ?? 0;
    const flowDir = poiMW > 0.05 ? "flow-discharge" : poiMW < -0.05 ? "flow-charge" : "";
    const flowOn = Math.abs(poiMW) > 0.05;
    for (const f of Object.keys(topo.feeders)) {
      const fe = el("fl" + f);
      if (fe) {
        cls(fe, "nm-flow flowline", flowDir);
        fe.classList.toggle("nm-on", flowOn);
      }
    }
    const fp = el("flPoi");
    if (fp) {
      cls(fp, "nm-flow flowline", flowDir);
      fp.classList.toggle("nm-on", flowOn);
    }

    for (const meta of units) {
      const n = meta.n;
      const u = state.units.find((x) => x.n === n);
      if (!u) continue;
      const e = E.units[n];
      const g = el("u" + n);
      const status = u.status ?? defaultUnitStatus(u, L);
      const ust = el("ust" + n);
      if (ust) {
        ust.textContent = status.text;
        cls(ust, "nm-ust", status.sev ? "nm-sev-" + status.sev : "");
      }
      g?.classList.toggle("nm-maint", status.sev === "maint");
      g?.classList.toggle("nm-sel", selected === n);
      live("ln" + n, e.inLive);
      live("h1b" + n, e.inLive);
      live("h1a" + n, e.busLive);
      live("rb" + n, e.busLive);
      live("h2b" + n, e.busLive);
      live("h3a" + n, e.busLive);
      live("h3b" + n, e.outLive);
      for (const k of ["hv", "tr1", "tr2", "lv", "lt", "la", "lb"]) live(k + n, e.trLive);
      sw("h1" + n, u.rmu.H01);
      sw("h2" + n, u.rmu.H02);
      if (!meta.last && u.rmu.H03) sw("h3" + n, u.rmu.H03);
      const esEl = el("es" + n) as HTMLElement | null;
      if (esEl) esEl.style.display = u.rmu.es ? "" : "none";
      u.banks.forEach((b, i) => {
        const k = `${n}${b.id}`;
        const pc = u.pcs[i];
        const bs = bankSeverity(b, L);
        const bf = el(k + "bk");
        if (bf) {
          if (overlay === "status") {
            (bf as HTMLElement).style.fill = "";
            cls(bf, "nm-bankfill", bs ? "nm-sev-" + bs : "");
          } else {
            cls(bf, "nm-bankfill", "");
            (bf as HTMLElement).style.fill = overlayFill(b);
          }
        }
        cls(el(k + "bo"), "nm-bo", bs ? "nm-sev-" + bs : "");
        const t1 = el(k + "t1");
        if (t1) t1.textContent = `SOC ${fmt(b.soc)}%   SOH ${fmt(b.soh)}%`;
        const t2 = el(k + "t2");
        if (t2) t2.textContent = `${fmt(b.vdc, 0)} V   Tmaks ${fmt(b.tmax)} °C`;
        el(k + "sb")?.setAttribute("width", ((145 * clamp(b.soc, 0, 100)) / 100).toFixed(1));
        b.racks.forEach((t, r) => {
          const rk = el(`${k}r${r}`) as HTMLElement | null;
          if (!rk) return;
          rk.style.fill = tempFill(t, L);
          const rs = rackSeverity(t, L);
          cls(rk, "nm-rack", rs ? "nm-sev-" + rs : "");
        });
        if (!pc) return;
        sw(k + "qf", b.dcb);
        live(k + "dc2", b.dcb === "closed");
        const run = pc.state === "chg" || pc.state === "dis";
        const fl = el(k + "fl");
        if (fl) {
          fl.classList.toggle("nm-on", run && pc.pMW > 0.01);
          fl.classList.toggle("nm-rev", pc.state === "chg");
        }
        cls(
          el(k + "pc"),
          "nm-pcs",
          pc.state === "fault" ? "nm-fault" : pc.state === "off" ? "nm-off" : pc.limited && run ? "nm-lim" : "",
        );
        const ps = el(k + "ps");
        if (ps) ps.textContent = pc.limited && run ? `SINIRLI · ${PCS_TEXT[pc.state]}` : PCS_TEXT[pc.state];
        const pp = el(k + "pp");
        if (pp) pp.textContent = run ? `${fmt(pc.pMW, 2)} MW` : "— MW";
        const pt = el(k + "pt");
        if (pt) pt.textContent = `IGBT ${fmt(pc.igbtC, 0)} °C`;
      });
    }
  }

  return {
    el: svg,
    update,
    setSelected,
    setOverlay,
    getOverlay: () => overlay,
    destroy(): void {
      svg.removeEventListener("click", pick);
      svg.removeEventListener("keydown", onKey);
      svg.innerHTML = "";
    },
  };
}
