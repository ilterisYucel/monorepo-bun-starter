import * as React from "react";
import type { IconBaseProps } from "react-icons";

/**
 * NOVA çizgi ikonları (24×24, `stroke = currentColor`) — SPEC K2/T-31.
 *
 * ScadaIconName'e `nova*` önekiyle eklenir (mevcut Tabler ikonları
 * DEĞİŞTİRİLMEZ — SCADA_ICONS mevcut anahtarları korunur). Nova bileşenleri
 * bu kayıt üzerinden erişir: `NOVA_ICONS.bolt`.
 */

type Body = React.ReactNode;

function makeIcon(body: Body) {
  return function NovaIcon(props: IconBaseProps): React.ReactNode {
    const { size = 22, color, title, className, style, ...rest } = props;
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke={color ?? "currentColor"}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
        role={title ? "img" : undefined}
        aria-hidden={title ? undefined : true}
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        {body}
      </svg>
    );
  };
}

const BOLT: Body = <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />;
const CHG: Body = (
  <>
    <path d="M12 3v11" />
    <path d="m7.5 9.5 4.5 4.5 4.5-4.5" />
    <rect x="4" y="17" width="16" height="4" rx="1" />
  </>
);
const DIS: Body = (
  <>
    <path d="M12 14V3" />
    <path d="m7.5 7.5 4.5-4.5 4.5 4.5" />
    <rect x="4" y="17" width="16" height="4" rx="1" />
  </>
);
const FULL_CHG: Body = (
  <>
    <rect x="2.5" y="7" width="17" height="10" rx="2" />
    <path d="M21.5 10.5v3" />
    <path d="M6 12h9" />
    <path d="m12 9 3 3-3 3" />
  </>
);
const FULL_DIS: Body = (
  <>
    <rect x="2.5" y="7" width="17" height="10" rx="2" />
    <path d="M21.5 10.5v3" />
    <path d="M15 12H6" />
    <path d="m9 9-3 3 3 3" />
  </>
);
const REST: Body = (
  <>
    <path d="M6 2.5h12M6 21.5h12" />
    <path d="M7.5 2.5c0 5 9 5.5 9 9.5s-9 4.5-9 9.5" />
    <path d="M16.5 2.5c0 5-9 5.5-9 9.5s9 4.5 9 9.5" />
  </>
);
const STBY: Body = (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 9v6M14 9v6" />
  </>
);
const CALIB: Body = (
  <>
    <path d="M20 12a8 8 0 0 1-14.2 5" />
    <path d="M4 12a8 8 0 0 1 14.2-5" />
    <path d="M18.5 3v4.2h-4.2" />
    <path d="M5.5 21v-4.2h4.2" />
    <path d="M12 8.5v3.5l2 1.5" />
  </>
);
const STOP: Body = <rect x="5" y="5" width="14" height="14" rx="2" />;
const HEALTH: Body = (
  <>
    <rect x="2.5" y="7" width="17" height="10" rx="2" />
    <path d="M21.5 10.5v3" />
    <path d="M5 12h3l1.5-2.5 2.5 5 1.5-2.5H17" />
  </>
);
const THERMO: Body = (
  <>
    <path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z" />
    <path d="M12 9v7.5" />
  </>
);
const UNITS: Body = (
  <>
    <rect x="3" y="3" width="5" height="5" rx="1" />
    <rect x="9.5" y="3" width="5" height="5" rx="1" />
    <rect x="16" y="3" width="5" height="5" rx="1" />
    <rect x="3" y="9.5" width="5" height="5" rx="1" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    <rect x="16" y="9.5" width="5" height="5" rx="1" />
    <rect x="3" y="16" width="5" height="5" rx="1" />
    <rect x="9.5" y="16" width="5" height="5" rx="1" />
    <rect x="16" y="16" width="5" height="5" rx="1" strokeDasharray="2 2" />
  </>
);
const BELL: Body = (
  <>
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8.5 3 8.5H3S6 15 6 8" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </>
);
const GRID: Body = (
  <path d="M2 12c2.5-7 5.5-7 8 0s5.5 7 8 0 2.5-3 4-3" />
);
const METER: Body = (
  <>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 13l4-4" />
    <path d="M8 3h8" />
  </>
);
const BREAKER: Body = (
  <>
    <rect x="7" y="7" width="10" height="10" rx="1" />
    <path d="M12 2v5M12 17v5" />
  </>
);
const EARTH: Body = (
  <>
    <path d="M12 3v9" />
    <path d="M5 12h14M8 16h8M10.5 20h3" />
  </>
);
const CT: Body = (
  <>
    <circle cx="12" cy="12" r="6" />
    <path d="M2 12h20" />
  </>
);

export const NovaIconBolt = makeIcon(BOLT);
export const NovaIconChg = makeIcon(CHG);
export const NovaIconDis = makeIcon(DIS);
export const NovaIconFullChg = makeIcon(FULL_CHG);
export const NovaIconFullDis = makeIcon(FULL_DIS);
export const NovaIconRest = makeIcon(REST);
export const NovaIconStby = makeIcon(STBY);
export const NovaIconCalib = makeIcon(CALIB);
export const NovaIconStop = makeIcon(STOP);
export const NovaIconHealth = makeIcon(HEALTH);
export const NovaIconThermo = makeIcon(THERMO);
export const NovaIconUnits = makeIcon(UNITS);
export const NovaIconBell = makeIcon(BELL);
export const NovaIconGrid = makeIcon(GRID);
export const NovaIconMeter = makeIcon(METER);
export const NovaIconBreaker = makeIcon(BREAKER);
export const NovaIconEarth = makeIcon(EARTH);
export const NovaIconCt = makeIcon(CT);

/** Dinamik dolgu seviyeli batarya (level 0…1). */
export function NovaIconBattery(
  props: IconBaseProps & { level?: number },
): React.ReactNode {
  const level = Math.max(0, Math.min(1, props.level ?? 1));
  return makeIcon(
    <>
      <rect x="2.5" y="7" width="17" height="10" rx="2" />
      <path d="M21.5 10.5v3" />
      <rect
        x="4.5"
        y="9"
        width={(13 * level).toFixed(2)}
        height="6"
        rx="0.8"
        fill="currentColor"
        stroke="none"
      />
    </>,
  )(props);
}

/** Nova ikon kaydı — `NOVA_ICONS.bolt` biçiminde erişilir. */
export const NOVA_ICONS = {
  bolt: NovaIconBolt,
  chg: NovaIconChg,
  dis: NovaIconDis,
  fullChg: NovaIconFullChg,
  fullDis: NovaIconFullDis,
  rest: NovaIconRest,
  stby: NovaIconStby,
  calib: NovaIconCalib,
  stop: NovaIconStop,
  health: NovaIconHealth,
  thermo: NovaIconThermo,
  units: NovaIconUnits,
  bell: NovaIconBell,
  grid: NovaIconGrid,
  meter: NovaIconMeter,
  breaker: NovaIconBreaker,
  earth: NovaIconEarth,
  ct: NovaIconCt,
  battery: NovaIconBattery,
} as const;

export type NovaIconName = keyof typeof NOVA_ICONS;
