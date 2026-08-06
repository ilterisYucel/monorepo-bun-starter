import React, { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { DeviceTable } from "@gd-monorepo/ui";
import type { DeviceTableRow } from "@gd-monorepo/ui";
import { COLORS } from "@gd-monorepo/ui";
import { useContainerData } from "../features/containers/hooks/useContainerData";
import { useFieldDevices } from "../features/field-devices/hooks/useFieldDevices";

export const FieldDevicesPage: React.FC = () => {
  const { fieldId } = useParams<{ fieldId: string }>();
  const { containers } = useContainerData(fieldId ?? "");
  const [selectedContainer, setSelectedContainer] = useState("container-1");
  const { devices, isLoading } = useFieldDevices(selectedContainer);

  const containerOptions = useMemo(
    () => containers.map((c) => ({ id: c.containerId, name: c.name })),
    [containers],
  );

  return (
    <DeviceTable
      devices={devices as DeviceTableRow[]}
      isLoading={isLoading}
      headerSlot={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: COLORS.textMuted }}>Konteyner:</span>
          <select
            value={selectedContainer}
            onChange={(e) => setSelectedContainer(e.target.value)}
            style={{
              padding: "6px 10px",
              background: COLORS.bgInput,
              border: `1px solid ${COLORS.borderDefault}`,
              borderRadius: "8px",
              color: COLORS.textPrimary,
              fontSize: "13px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {containerOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      }
    />
  );
};
