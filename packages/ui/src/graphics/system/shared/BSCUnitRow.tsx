import React, { useMemo } from "react";
import type { Rack } from "../../../types";
import type { ChargeStatus } from "@gd-monorepo/shared-types";
import { Cable } from "../../elements/Cable";
import { RackCell } from "../../elements/RackCell";
import { CircuitBreaker } from "../../elements/CircuitBreaker";
import { DCOutput } from "../../elements/DCOutput";
import type { Point2D } from "../../types";

// BSC rack satırı: rack'ler + bus/feeder kabloları + kesici + DC çıkış.
// BSC.tsx ve BESSDiagram.tsx ortak kullanır — kablo/kesici kodu tek yerde.
export interface BSCUnitRowPositions {
  rackXs: number[];
  rackY: number;
  rackWidth: number;
  rackHeight: number;
  topBusY: number;
  bottomBusY: number;
  convergenceX: number;
  cbStartX: number;
  cbEndX: number;
  dcX: number;
  dcRadius: number;
  centerY: number;
  step: number;
}

export interface BSCUnitRowUnit {
  deviceId: string;
  racks: Rack[];
  breakerStatus?: "online" | "offline";
  breakerPosition?: "open" | "close";
  dcOutput?: {
    status: "online" | "offline";
    voltage: number;
    current: number;
  };
}

export interface BSCUnitRowProps {
  unit: BSCUnitRowUnit;
  positions: BSCUnitRowPositions;
  flowDirection: ChargeStatus;
  onRackClick?: (rackId: number, position?: { x: number; y: number }) => void;
  onBreakerToggle?: (position: "open" | "close") => void;
  // opsiyonel: DC çıkışından sağ bus hattına bağlantı (BESS sağ sütun)
  busEndX?: number;
}

export const BSCUnitRow: React.FC<BSCUnitRowProps> = ({
  unit,
  positions,
  flowDirection,
  onRackClick,
  onBreakerToggle,
  busEndX,
}) => {
  const p = positions;
  const flow = flowDirection.toLowerCase() as "charge" | "discharge" | "idle";

  const cables = useMemo(() => {
    const items: Array<{ key: string; path: Point2D[] }> = [];
    items.push({ key: "top-bus", path: [{ x: p.rackXs[0]!, y: p.topBusY }, { x: p.convergenceX, y: p.topBusY }] });
    items.push({ key: "bot-bus", path: [{ x: p.rackXs[0]!, y: p.bottomBusY }, { x: p.convergenceX, y: p.bottomBusY }] });
    items.push({
      key: "conv-top",
      path: [
        { x: p.convergenceX, y: p.topBusY },
        { x: p.convergenceX, y: p.centerY },
        { x: p.cbStartX, y: p.centerY },
      ],
    });
    items.push({
      key: "conv-bot",
      path: [
        { x: p.convergenceX, y: p.bottomBusY },
        { x: p.convergenceX, y: p.centerY },
        { x: p.cbStartX, y: p.centerY },
      ],
    });
    for (const rx of p.rackXs) {
      const cx = rx + p.rackWidth / 2;
      items.push({ key: `feeder-t-${rx}`, path: [{ x: cx, y: p.rackY }, { x: cx, y: p.topBusY }] });
      items.push({ key: `feeder-b-${rx}`, path: [{ x: cx, y: p.rackY + p.rackHeight }, { x: cx, y: p.bottomBusY }] });
    }
    items.push({
      key: "cb-dc",
      path: [
        { x: p.cbEndX, y: p.centerY },
        { x: p.dcX - p.dcRadius, y: p.centerY },
      ],
    });
    if (busEndX != null) {
      items.push({
        key: "dc-bus",
        path: [
          { x: p.dcX + p.dcRadius, y: p.centerY },
          { x: busEndX, y: p.centerY },
        ],
      });
    }
    return items;
  }, [p, busEndX]);

  const rackCellConfig = { step: p.step, rackWidth: p.rackWidth, rackHeight: p.rackHeight };

  return (
    <>
      {cables.map((c) => (
        <Cable key={c.key} path={c.path} flowDirection={flow} step={p.step} />
      ))}

      {unit.racks.map((rack, ri) => {
        const rx = p.rackXs[ri];
        if (rx == null) return null;
        return (
          <RackCell
            key={rack?.id ?? ri}
            rack={rack}
            x={rx}
            y={p.rackY}
            config={rackCellConfig}
            flowDirection={flowDirection}
            onClick={onRackClick ? (r, position) => onRackClick(r.id, position) : undefined}
          />
        );
      })}

      <CircuitBreaker
        config={{ step: p.step }}
        positions={{
          circuitBreaker: { endX: p.cbEndX, gapSize: p.step * 0.18 },
          convergence: { x: p.convergenceX },
          topBusY: p.topBusY,
          bottomBusY: p.bottomBusY,
        }}
        breakerStatus={unit.breakerStatus ?? "online"}
        breakerPosition={unit.breakerPosition ?? "close"}
        onClick={onBreakerToggle ? () => onBreakerToggle(unit.breakerPosition === "close" ? "open" : "close") : undefined}
      />

      <DCOutput
        config={{ step: p.step }}
        output={{ x: p.dcX, y: p.centerY, radius: p.dcRadius }}
        dcOutput={unit.dcOutput}
      />
    </>
  );
};

BSCUnitRow.displayName = "BSCUnitRow";
