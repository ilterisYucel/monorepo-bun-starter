import React from "react";
import { COLORS_LIGHT } from "../colors/tokensLight";
import { NOVA_ICONS } from "../icons/demo-icons";
import type { DemoManeuverItem } from "./maneuver-types";

/**
 * Manevra kartı (SPEC UC-5/T-22). Sunucu kataloğundan gelen (demo_*) kaydı
 * gösterir; seçim durumu props ile.
 */

export interface DemoManeuverCardProps {
  item: DemoManeuverItem;
  selected: boolean;
  onSelect: (item: DemoManeuverItem) => void;
}

function iconFor(item: DemoManeuverItem): React.ReactNode {
  const n = item.name;
  if (n.includes("full") && n.includes("charge")) return <NOVA_ICONS.fullChg size={26} />;
  if (n.includes("full") && n.includes("discharge")) return <NOVA_ICONS.fullDis size={26} />;
  if (n.includes("calib")) return <NOVA_ICONS.calib size={26} />;
  if (n.includes("standby") || n.includes("stop") || n.includes("idle")) return <NOVA_ICONS.stby size={26} />;
  if (n.includes("charge")) return <NOVA_ICONS.chg size={26} />;
  if (n.includes("discharge")) return <NOVA_ICONS.dis size={26} />;
  if (item.kind === "operation") return <NOVA_ICONS.calib size={26} />;
  return <NOVA_ICONS.bolt size={26} />;
}

export const DemoManeuverCard: React.FC<DemoManeuverCardProps> = ({
  item,
  selected,
  onSelect,
}) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={() => onSelect(item)}
    style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gridTemplateRows: "auto auto",
      gap: "2px 10px",
      alignItems: "center",
      textAlign: "left",
      border: `1px solid ${selected ? COLORS_LIGHT.sel : COLORS_LIGHT.line}`,
      boxShadow: selected ? `inset 0 0 0 1px ${COLORS_LIGHT.sel}` : "none",
      background: COLORS_LIGHT.panel,
      borderRadius: 6,
      padding: "10px 12px",
      cursor: "pointer",
      minWidth: 0,
    }}
  >
    <span style={{ gridRow: "1 / 3", color: selected ? COLORS_LIGHT.sel : COLORS_LIGHT.muted }}>
      {iconFor(item)}
    </span>
    <b style={{ fontSize: 14.5, color: COLORS_LIGHT.fg }}>{item.label}</b>
    <small style={{ fontSize: 11.5, color: COLORS_LIGHT.muted, lineHeight: 1.3 }}>
      {item.description ?? "—"}
    </small>
  </button>
);
