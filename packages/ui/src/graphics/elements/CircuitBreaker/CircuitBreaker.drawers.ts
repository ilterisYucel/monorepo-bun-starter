import { Graphics } from "pixi.js";
import type { BreakerBusLayout } from "../../types";
import { COLOR } from "../../../colors";

// Kesici şema sembolü: sol/sağ terminal noktaları (kutu kenarlarında) +
// orta BOŞ çerçeve (yalnız outline). Çerçeve, bus hattının kesici açıklığını
// kaplar — terminal noktaları kablo uçlarıyla birebir çakışır.
// Sembol kutusu (logical): span x 0.7step — Base story ile birebir.
export function breakerSymbolRect(
  cfg: { step: number },
  pos: BreakerBusLayout,
): { x: number; y: number; width: number; height: number; centerY: number; lineStartX: number; endX: number } {
  const { step } = cfg;
  const { circuitBreaker: cb, convergence: cv, topBusY, bottomBusY } = pos;
  const centerY = (topBusY + bottomBusY) / 2;
  const lineStartX = cv.x + step * 0.2;
  const endX = cb.endX;
  return {
    x: lineStartX,
    y: centerY - step * 0.35,
    width: endX - lineStartX,
    height: step * 0.7,
    centerY,
    lineStartX,
    endX,
  };
}

// İç içe 2 kare outline (dış + iç, içleri transparent) + sol/sağ terminal
// noktaları. Sprite üretim referansı ile çizim modu aynı geometriyi kullanır.
export function drawBreakerChassis(
  g: Graphics,
  cfg: { step: number },
  pos: BreakerBusLayout,
): void {
  const { step } = cfg;
  const rect = breakerSymbolRect(cfg, pos);

  const termR = Math.max(2, step * 0.06);
  g.circle(rect.lineStartX, rect.centerY, termR);
  g.fill(COLOR.terminal);
  g.circle(rect.endX, rect.centerY, termR);
  g.fill(COLOR.terminal);

  g.rect(rect.x, rect.y, rect.width, rect.height);
  g.stroke({ width: Math.max(1, step * 0.035), color: COLOR.borderStroke });

  const innerW = rect.width * 0.56;
  const innerH = rect.height * 0.56;
  g.rect(rect.x + (rect.width - innerW) / 2, rect.y + (rect.height - innerH) / 2, innerW, innerH);
  g.stroke({ width: Math.max(0.8, step * 0.025), color: COLOR.borderStroke });
}

// Durum bıçağı: kapalı = bağlı diyagonal, açık = kalkık dikey bıçak.
// Bıçak NÖTR gri çizilir (kutuyla aynı çizgi dili — durum rengi YOKTUR;
// durum alttaki metinle taşınır). Offline: bıçak hiç çizilmez.
export function drawBreakerLever(
  g: Graphics,
  cfg: { step: number },
  pos: BreakerBusLayout,
  breakerStatus: "online" | "offline",
  breakerPosition: "open" | "close",
): void {
  if (breakerStatus === "offline") return;

  const { step } = cfg;
  const rect = breakerSymbolRect(cfg, pos);
  const midX = (rect.lineStartX + rect.endX) / 2;
  const strokeW = Math.max(3, step * 0.14);
  const gap = Math.max(step * 0.08, (rect.endX - rect.lineStartX) * 0.1);

  g.setStrokeStyle({ width: strokeW, color: COLOR.borderStroke });

  g.moveTo(rect.lineStartX + step * 0.06, rect.centerY);
  g.lineTo(midX - gap, rect.centerY);
  g.stroke();

  if (breakerPosition === "close") {
    g.moveTo(midX - gap, rect.centerY - gap * 0.6);
    g.lineTo(midX + gap, rect.centerY + gap * 0.6);
    g.stroke();
  } else {
    g.moveTo(midX, rect.centerY - gap * 0.85);
    g.lineTo(midX, rect.centerY + gap * 0.85);
    g.stroke();
  }

  g.moveTo(midX + gap, rect.centerY);
  g.lineTo(rect.endX - step * 0.06, rect.centerY);
  g.stroke();
}

export function drawBreakerBody(
  g: Graphics,
  cfg: { step: number },
  pos: BreakerBusLayout,
  breakerStatus: "online" | "offline",
  breakerPosition: "open" | "close",
): void {
  drawBreakerChassis(g, cfg, pos);
  drawBreakerLever(g, cfg, pos, breakerStatus, breakerPosition);
}
