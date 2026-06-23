import React, { useMemo } from "react";
import type { Point2D } from "../../types";
import type { CableBusProps } from "./CableBus.types";
import { Cable } from "../Cable";

function cablePath(from: Point2D, to: Point2D): Point2D[] {
  return [from, to];
}

function lPath(cornerX: number, cornerY: number, from: Point2D, to: Point2D): Point2D[] {
  return [from, { x: cornerX, y: cornerY }, to];
}

export const CableBus: React.FC<CableBusProps> = ({ config, positions, flowDirection }) => {
  const { rackWidth, rackHeight, step } = config;
  const { racks, topBusY, bottomBusY, convergenceX, cbLeftMid } = positions;

  const busLeftX = racks[0]!.x;
  const busRightX = convergenceX;
  const centerY = (topBusY + bottomBusY) / 2;

  const cables = useMemo(() => {
    const items: Array<{ key: string; path: Point2D[] }> = [];

    items.push({ key: "top-bus",   path: cablePath({ x: busLeftX, y: topBusY },    { x: busRightX, y: topBusY }) });
    items.push({ key: "bot-bus",   path: cablePath({ x: busLeftX, y: bottomBusY }, { x: busRightX, y: bottomBusY }) });
    items.push({ key: "conv-top",  path: lPath(convergenceX, centerY, { x: convergenceX, y: topBusY },    cbLeftMid) });
    items.push({ key: "conv-bot",  path: lPath(convergenceX, centerY, { x: convergenceX, y: bottomBusY }, cbLeftMid) });

    for (const rack of racks) {
      const cx = rack.x + rackWidth / 2;
      items.push({ key: `feeder-t-${rack.id}`, path: cablePath({ x: cx, y: rack.y },            { x: cx, y: topBusY }) });
      items.push({ key: `feeder-b-${rack.id}`, path: cablePath({ x: cx, y: rack.y + rackHeight }, { x: cx, y: bottomBusY }) });
    }

    return items;
  }, [racks, rackWidth, busLeftX, busRightX, topBusY, bottomBusY, convergenceX, centerY, cbLeftMid]);

  return (
    <>
      {cables.map((c) => (
        <Cable key={c.key} path={c.path} flowDirection={flowDirection} step={step} />
      ))}
    </>
  );
};

CableBus.displayName = "CableBus";
