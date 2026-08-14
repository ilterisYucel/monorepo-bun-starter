import React, { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { DeviceTable, useTranslation } from "@gd-monorepo/ui";
import type { DeviceTableRow } from "@gd-monorepo/ui";
import { COLORS } from "@gd-monorepo/ui";
import { useContainerData } from "../features/containers/hooks/useContainerData";
import { useFieldDevices } from "../features/field-devices/hooks/useFieldDevices";
import { mockPcs } from "../features/containers/services/mockDataGenerator";
import { PcsCard } from "../features/containers/components/PcsCard";

export const FieldDevicesPage: React.FC = () => {
  const { t } = useTranslation();
  const { fieldId } = useParams<{ fieldId: string }>();
  const { containers } = useContainerData(fieldId ?? "");
  const [selectedPcs, setSelectedPcs] = useState("PCS-1");
  const { devices, isLoading } = useFieldDevices(selectedPcs);

  const pcsOptions = useMemo(
    () => containers.map((c, i) => ({ id: `PCS-${i + 1}`, name: `PCS — ${c.name}` })),
    [containers],
  );

  const pcs = useMemo(() => mockPcs(selectedPcs), [selectedPcs]);

  return (
    <div>
      <DeviceTable
        devices={devices as DeviceTableRow[]}
        isLoading={isLoading}
        headerSlot={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: COLORS.textMuted }}>{t("field.pcsSelect")}</span>
            <select
              value={selectedPcs}
              onChange={(e) => setSelectedPcs(e.target.value)}
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
              {pcsOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        }
      />

      {pcs && (
        <div style={{ marginTop: "12px" }}>
          <PcsCard pcs={pcs} />
        </div>
      )}
    </div>
  );
};
