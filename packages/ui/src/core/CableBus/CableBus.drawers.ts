import { Graphics } from "pixi.js";
import type { StepConfig, BSCPositions } from "../../components/BSCGraphic/BSCGraphic.types";

const CABLE_COLOR = 0x5a5a7a;

export function drawCables(g: Graphics, cfg: StepConfig, pos: BSCPositions): void {
  const { rackWidth, rackHeight, step } = cfg;
  const { racks, topBusY, bottomBusY, convergence } = pos;

  const firstRack = racks[0]!;
  const busLeftX = firstRack.x;
  const busRightX = convergence.x;

  g.setStrokeStyle({
    width: Math.max(1.5, step * 0.06),
    color: CABLE_COLOR,
    cap: "round",
  });

  // Top bus bar
  g.moveTo(busLeftX, topBusY);
  g.lineTo(busRightX, topBusY);
  g.stroke();

  // Bottom bus bar
  g.moveTo(busLeftX, bottomBusY);
  g.lineTo(busRightX, bottomBusY);
  g.stroke();

  // Vertical feeders
  for (const rack of racks) {
    const cx = rack.x + rackWidth / 2;
    g.moveTo(cx, rack.y);
    g.lineTo(cx, topBusY);
    g.stroke();

    g.moveTo(cx, rack.y + rackHeight);
    g.lineTo(cx, bottomBusY);
    g.stroke();
  }
}
