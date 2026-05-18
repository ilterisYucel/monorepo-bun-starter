// src/components/PowerFlowAnimation/RackPopover.tsx
import React from "react";
import type { Rack } from "../../modules/racks/types";

interface RackPopoverProps {
  rack: Rack | null;
  x: number;
  y: number;
  visible: boolean;
}

export const RackPopover: React.FC<RackPopoverProps> = ({
  rack,
  x,
  y,
  visible,
}) => {
  if (!visible || !rack) return null;

  return (
    <div
      className="rack-popover"
      style={{
        position: "fixed",
        left: x + 20,
        top: y - 10,
        zIndex: 1000,
      }}
    >
      <div className="rack-popover-content">
        <div className="rack-popover-header">
          <strong>{rack.name}</strong>
          <span className={`status-badge status-${rack.status}`}>
            {rack.status}
          </span>
        </div>
        <div className="rack-popover-body">
          <div className="popover-row">
            <span>🔋 Charge Status:</span>
            <span className={`charge-${rack.charge_status.toLowerCase()}`}>
              {rack.charge_status}
            </span>
          </div>
          <div className="popover-row">
            <span>📊 SoC:</span>
            <strong>{rack.soc?.toFixed(1) || "N/A"}%</strong>
          </div>
          <div className="popover-row">
            <span>💪 SoH:</span>
            <strong>{rack.soh?.toFixed(1) || "N/A"}%</strong>
          </div>
          <div className="popover-row">
            <span>⚡ Voltage:</span>
            <strong>{rack.voltage?.toFixed(1) || "N/A"} V</strong>
          </div>
          <div className="popover-row">
            <span>🔌 Current:</span>
            <strong>{rack.current?.toFixed(1) || "N/A"} A</strong>
          </div>
          <div className="popover-row">
            <span>💪 Power:</span>
            <strong>{rack.power_kw?.toFixed(1) || "N/A"} kW</strong>
          </div>
          <div className="popover-row">
            <span>🌡️ Temperature:</span>
            <strong>{rack.temperature?.toFixed(1) || "N/A"} °C</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
