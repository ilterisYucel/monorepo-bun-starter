import React, { useState } from "react";
import { useDevicesStore } from "../stores/devicesStore";
import { DeviceTable } from "@gd-monorepo/ui";
import type { DeviceTableRow } from "@gd-monorepo/ui";
import { COLORS } from "@gd-monorepo/ui";
import { DeviceDetailModal } from "../features/devices/components/DeviceDetailModal";

export const DevicesPage: React.FC = () => {
  const { devices, loaded, loading } = useDevicesStore();
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  return (
    <>
      <DeviceTable
        devices={devices as DeviceTableRow[]}
        isLoading={loading || !loaded}
        renderActions={(device) => (
          <button
            onClick={() => setSelectedDevice(device.id)}
            style={{
              padding: "4px 12px",
              background: COLORS.infoAlpha12,
              border: `1px solid ${COLORS.info}`,
              borderRadius: "8px",
              color: COLORS.info,
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Detay
          </button>
        )}
      />
      <DeviceDetailModal
        deviceId={selectedDevice}
        open={selectedDevice !== null}
        onClose={() => setSelectedDevice(null)}
      />
    </>
  );
};
