// src/components/PowerFlowAnimation/PowerFlowCanvas.tsx
import React, { useRef, useEffect, useCallback, useState } from "react";
import type { Rack } from "../../modules/racks/types";
import { RackPopover } from "./RackPopover";

interface PowerFlowCanvasProps {
  flowDirection: "Charge" | "Discharge" | "Idle";
  racks: Rack[];
  width?: number;
  height?: number;
}

// Rack koordinatları (8 üstte + 8 altta)
const RACK_WIDTH = 36;
const RACK_HEIGHT = 48;
const RACK_GAP = 12;
const START_X = 40;
const TOP_Y = 40;
const BOTTOM_Y = 111;

const SWITCH_X = START_X + 8 * (RACK_WIDTH + RACK_GAP) + 30;
const GRID_X = SWITCH_X + 60;

const SWITCH_Y_TOP = TOP_Y + RACK_HEIGHT - 10;
const SWITCH_Y_BOTTOM = BOTTOM_Y + RACK_HEIGHT - 10;
const GRID_Y_TOP = SWITCH_Y_TOP;
const GRID_Y_BOTTOM = SWITCH_Y_BOTTOM;

export const PowerFlowCanvas: React.FC<PowerFlowCanvasProps> = ({
  flowDirection,
  racks,
  width = 650,
  height = 220,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const [popoverVisible, setPopoverVisible] = useState(false);

  const getRackAtPosition = useCallback(
    (mouseX: number, mouseY: number): Rack | null => {
      for (let i = 0; i < 8; i++) {
        const x = START_X + i * (RACK_WIDTH + RACK_GAP);
        const yTop = TOP_Y;
        const yBottom = BOTTOM_Y;

        if (
          mouseX >= x &&
          mouseX <= x + RACK_WIDTH &&
          mouseY >= yTop &&
          mouseY <= yTop + RACK_HEIGHT
        ) {
          return racks[i] || null;
        }
        if (
          mouseX >= x &&
          mouseX <= x + RACK_WIDTH &&
          mouseY >= yBottom &&
          mouseY <= yBottom + RACK_HEIGHT
        ) {
          return racks[i + 8] || null;
        }
      }
      return null;
    },
    [racks],
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const rack = getRackAtPosition(mouseX, mouseY);
      if (rack) {
        setSelectedRack(rack);
        setPopoverPos({ x: e.clientX, y: e.clientY });
        setPopoverVisible(true);
        setTimeout(() => setPopoverVisible(false), 3000);
      }
    },
    [getRackAtPosition, width, height],
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, timestamp: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#0f0f1a";
      ctx.fillRect(0, 0, width, height);

      // ========== 1. KABLOLAR (Dinamik renkler) ==========

      // 🔥 Renk animasyonu için progress hesapla (0-1 arası, sürekli değişen)
      const cycleDuration = 2000; // 2 saniyede bir tam döngü
      const progress = (timestamp % cycleDuration) / cycleDuration; // 0 -> 1

      // Charge için: Yeşil -> Sarı
      const chargeColor = `hsl(${80 + progress * 40}, 100%, 50%)`; // 80° (yeşil) -> 120° (sarı)
      // Discharge için: Turuncu -> Mavi
      const dischargeColor = `hsl(${30 + progress * 210}, 100%, 50%)`; // 30° (turuncu) -> 240° (mavi)

      ctx.beginPath();
      ctx.strokeStyle = "#4a4a6a";
      ctx.lineWidth = 2;

      // Üst sıra kabloları (statik)
      for (let i = 0; i < 8; i++) {
        const x = START_X + i * (RACK_WIDTH + RACK_GAP) + RACK_WIDTH / 2;
        ctx.beginPath();
        ctx.moveTo(x, TOP_Y + RACK_HEIGHT);
        ctx.lineTo(x, SWITCH_Y_TOP - 15);
        ctx.stroke();
      }

      // Alt sıra kabloları (statik)
      for (let i = 0; i < 8; i++) {
        const x = START_X + i * (RACK_WIDTH + RACK_GAP) + RACK_WIDTH / 2;
        ctx.beginPath();
        ctx.moveTo(x, BOTTOM_Y);
        ctx.lineTo(x, SWITCH_Y_BOTTOM - 15);
        ctx.stroke();
      }

      // ========== ANA KABLOLAR (RENKLİ) ==========
      ctx.lineWidth = 3;

      if (flowDirection === "Charge") {
        // Üst ana kablo: Grid'den Switch'e (sağdan sola)
        ctx.beginPath();
        ctx.moveTo(GRID_X - 20, SWITCH_Y_TOP - 10);
        ctx.lineTo(SWITCH_X, SWITCH_Y_TOP - 10);
        ctx.strokeStyle = chargeColor;
        ctx.stroke();

        // Üst yatay kablo (Switch'ten Rack'lere)
        ctx.beginPath();
        ctx.moveTo(SWITCH_X - 10, SWITCH_Y_TOP - 10);
        ctx.lineTo(START_X + RACK_WIDTH / 2, SWITCH_Y_TOP - 10);
        ctx.strokeStyle = chargeColor;
        ctx.stroke();

        // Alt ana kablo: Grid'den Switch'e (sağdan sola)
        ctx.beginPath();
        ctx.moveTo(GRID_X - 20, SWITCH_Y_BOTTOM - 10);
        ctx.lineTo(SWITCH_X, SWITCH_Y_BOTTOM - 10);
        ctx.strokeStyle = chargeColor;
        ctx.stroke();

        // Alt yatay kablo
        ctx.beginPath();
        ctx.moveTo(SWITCH_X - 10, SWITCH_Y_BOTTOM - 10);
        ctx.lineTo(START_X + RACK_WIDTH / 2, SWITCH_Y_BOTTOM - 10);
        ctx.strokeStyle = chargeColor;
        ctx.stroke();
      } else if (flowDirection === "Discharge") {
        // Üst ana kablo: Rack'lerden Grid'e (soldan sağa)
        ctx.beginPath();
        ctx.moveTo(START_X + RACK_WIDTH / 2, SWITCH_Y_TOP - 10);
        ctx.lineTo(SWITCH_X - 10, SWITCH_Y_TOP - 10);
        ctx.strokeStyle = dischargeColor;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(SWITCH_X, SWITCH_Y_TOP - 10);
        ctx.lineTo(GRID_X - 20, SWITCH_Y_TOP - 10);
        ctx.strokeStyle = dischargeColor;
        ctx.stroke();

        // Alt ana kablo
        ctx.beginPath();
        ctx.moveTo(START_X + RACK_WIDTH / 2, SWITCH_Y_BOTTOM - 10);
        ctx.lineTo(SWITCH_X - 10, SWITCH_Y_BOTTOM - 10);
        ctx.strokeStyle = dischargeColor;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(SWITCH_X, SWITCH_Y_BOTTOM - 10);
        ctx.lineTo(GRID_X - 20, SWITCH_Y_BOTTOM - 10);
        ctx.strokeStyle = dischargeColor;
        ctx.stroke();
      } else {
        // Idle: Gri kablo
        // Üst
        ctx.beginPath();
        ctx.moveTo(START_X + RACK_WIDTH / 2, SWITCH_Y_TOP - 10);
        ctx.lineTo(SWITCH_X - 10, SWITCH_Y_TOP - 10);
        ctx.lineTo(SWITCH_X, SWITCH_Y_TOP - 10);
        ctx.lineTo(GRID_X - 20, SWITCH_Y_TOP - 10);
        ctx.strokeStyle = "#4a4a6a";
        ctx.stroke();

        // Alt
        ctx.beginPath();
        ctx.moveTo(START_X + RACK_WIDTH / 2, SWITCH_Y_BOTTOM - 10);
        ctx.lineTo(SWITCH_X - 10, SWITCH_Y_BOTTOM - 10);
        ctx.lineTo(SWITCH_X, SWITCH_Y_BOTTOM - 10);
        ctx.lineTo(GRID_X - 20, SWITCH_Y_BOTTOM - 10);
        ctx.strokeStyle = "#4a4a6a";
        ctx.stroke();
      }

      // ========== 2. RACK'LER ==========
      for (let i = 0; i < 16; i++) {
        const rack = racks[i];
        const row = i < 8 ? "top" : "bottom";
        const idx = i < 8 ? i : i - 8;
        const x = START_X + idx * (RACK_WIDTH + RACK_GAP);
        const y = row === "top" ? TOP_Y : BOTTOM_Y;

        ctx.fillStyle = "#1e1e2e";
        ctx.fillRect(x, y, RACK_WIDTH, RACK_HEIGHT);
        ctx.strokeStyle = "#3d3d5e";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, RACK_WIDTH, RACK_HEIGHT);

        ctx.fillStyle = "#3d3d5e";
        ctx.fillRect(x + RACK_WIDTH / 2 - 6, y - 6, 12, 6);
        ctx.fillRect(x + RACK_WIDTH / 2 - 6, y + RACK_HEIGHT, 12, 6);

        let fillPercent = 0.5;
        if (rack?.soc) fillPercent = rack.soc / 100;

        ctx.fillStyle =
          flowDirection === "Charge"
            ? "#10b981"
            : flowDirection === "Discharge"
              ? "#f59e0b"
              : "#6b7280";
        ctx.fillRect(
          x + 3,
          y + RACK_HEIGHT - 6 - (RACK_HEIGHT - 12) * fillPercent,
          RACK_WIDTH - 6,
          (RACK_HEIGHT - 12) * fillPercent,
        );

        ctx.fillStyle = "#e5e7eb";
        ctx.font = "10px monospace";
        ctx.fillText(`R${i + 1}`, x + 13, y + RACK_HEIGHT - 12);
        ctx.fillStyle = "#f59e0b";
        ctx.font = "8px monospace";
        ctx.fillText(
          `${rack?.soc?.toFixed(1) || 0}%`,
          x + 10,
          y + RACK_HEIGHT - 30,
        );
      }

      // ========== 3. DEVRE ANAHTARLARI ==========
      ctx.beginPath();
      ctx.arc(SWITCH_X, SWITCH_Y_TOP - 10, 10, 0, 2 * Math.PI);
      ctx.fillStyle = "#2a2a3a";
      ctx.fill();
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = "12px monospace";
      ctx.fillText("⚡", SWITCH_X - 5, SWITCH_Y_TOP - 5);

      ctx.beginPath();
      ctx.arc(SWITCH_X, SWITCH_Y_BOTTOM - 10, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.fillText("⚡", SWITCH_X - 5, SWITCH_Y_BOTTOM - 5);

      // ========== 4. ŞEBEKE ==========
      ctx.beginPath();
      ctx.arc(GRID_X, GRID_Y_TOP - 10, 18, 0, 2 * Math.PI);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#fef3c7";
      ctx.font = "bold 10px monospace";
      ctx.fillText("GRID", GRID_X - 12, GRID_Y_TOP - 5);

      ctx.beginPath();
      ctx.arc(GRID_X, GRID_Y_BOTTOM - 10, 18, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillText("GRID", GRID_X - 12, GRID_Y_BOTTOM - 5);
    },
    [width, height, flowDirection, racks],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      draw(ctx, elapsed);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: "100%",
          height: "auto",
          borderRadius: "12px",
          cursor: "pointer",
        }}
        onClick={handleCanvasClick}
      />
      <RackPopover
        rack={selectedRack}
        x={popoverPos.x}
        y={popoverPos.y}
        visible={popoverVisible}
      />
    </>
  );
};
