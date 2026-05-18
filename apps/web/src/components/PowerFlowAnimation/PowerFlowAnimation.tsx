// src/components/PowerFlowAnimation/PowerFlowAnimation.tsx
import React from "react";
import { PowerFlowCanvas } from "./PowerFlowCanvas";
import type { Rack } from "../../modules/racks/types";
import "./PowerFlowAnimation.css";

interface PowerFlowAnimationProps {
  flowDirection: "Charge" | "Discharge" | "Idle";
  racks: Rack[];
  height?: number;
}

export const PowerFlowAnimation: React.FC<PowerFlowAnimationProps> = ({
  flowDirection,
  racks,
  height = 200, // Varsayılan yükseklik
}) => {
  return (
    <div className="powerflow-container">
      <div className="powerflow-header">
        <h3>🔋 Enerji Akış Şeması</h3>
        <div className={`flow-status flow-${flowDirection.toLowerCase()}`}>
          {flowDirection === "Charge" && "ŞARJ AKTİF (Grid → Batarya)"}
          {flowDirection === "Discharge" && "DEŞARJ AKTİF (Batarya → Grid)"}
          {flowDirection === "Idle" && "BEKLEME MODU"}
        </div>
      </div>
      <PowerFlowCanvas
        flowDirection={flowDirection}
        racks={racks}
        width={680}
        height={height}
      />
      <div className="powerflow-legend">
        <div className="legend-item">
          <span className="legend-battery"></span>
          <span>Batarya Grupları (Her biri 1 Rack)</span>
        </div>
        <div className="legend-item">
          <span className="legend-switch"></span>
          <span>Devre Anahtarı</span>
        </div>
        <div className="legend-item">
          <span className="legend-grid"></span>
          <span>Şebeke (Grid)</span>
        </div>
        <div className="legend-item">
          <span className="legend-flow-charge"></span>
          <span>Şarj Akışı (Yeşil)</span>
        </div>
        <div className="legend-item">
          <span className="legend-flow-discharge"></span>
          <span>Deşarj Akışı (Turuncu)</span>
        </div>
        <div className="legend-item">
          <span className="legend-click"></span>
          <span>🔍 Rack'e Tıkla → Detay</span>
        </div>
      </div>
    </div>
  );
};
