import React from "react";
import { PowerFlowCanvas } from "./PowerFlowCanvas";
import "./PowerFlowAnimation.css";

interface PowerFlowAnimationProps {
  flowDirection: "Charge" | "Discharge" | "Idle";
}

export const PowerFlowAnimation: React.FC<PowerFlowAnimationProps> = ({
  flowDirection,
}) => {
  return (
    <div className="powerflow-container">
      <div className="powerflow-header">
        <h3>🔋 Enerji Akış Şeması</h3>
        <div className={`flow-status flow-${flowDirection.toLowerCase()}`}>
          {flowDirection === "Charge" && "🔌 ŞARJ AKTİF (Grid → Batarya)"}
          {flowDirection === "Discharge" && "⚡ DEŞARJ AKTİF (Batarya → Grid)"}
          {flowDirection === "Idle" && "⏸️ BEKLEME MODU"}
        </div>
      </div>
      <PowerFlowCanvas flowDirection={flowDirection} width={650} height={280} />
      <div className="powerflow-legend">
        <div className="legend-item">
          <span className="legend-battery"></span>
          <span>Batarya Grupları</span>
        </div>
        <div className="legend-item">
          <span className="legend-pcs"></span>
          <span>PCS / İnverter</span>
        </div>
        <div className="legend-item">
          <span className="legend-grid"></span>
          <span>Şehir Akımı (Grid)</span>
        </div>
        <div className="legend-item">
          <span className="legend-flow-charge"></span>
          <span>Şarj Akışı</span>
        </div>
        <div className="legend-item">
          <span className="legend-flow-discharge"></span>
          <span>Deşarj Akışı</span>
        </div>
      </div>
    </div>
  );
};
