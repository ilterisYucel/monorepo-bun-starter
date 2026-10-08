import React, { useState } from "react";
import { DemoAdminView, ALL_DEMO_REGISTERS, type DemoAdminActions } from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";
import { useDemoAdminStore } from "../features/demo-data/stores/DemoAdminStore";

/** DemoAdminPage — Master admin (SPEC UC-8); tarayıcı-durumu store'undan beslenir. */
export const DemoAdminPage: React.FC = () => {
  const { state, runs, logs } = useDemoProjectContext();
  const admin = useDemoAdminStore();
  const [copyLabel, setCopyLabel] = useState("");

  const actions: DemoAdminActions = {
    setMapping: admin.setMapping,
    resetMapping: admin.resetMapping,
    setDevice: admin.setDevice,
    setParams: admin.setParams,
    setMapDev: admin.setMapDev,
    setPrev: admin.setPrev,
    copyMapping: () => {
      const payload = {
        project: DEMO_TOPOLOGY.id,
        site: DEMO_TOPOLOGY.name,
        generated: new Date().toISOString(),
        devices: admin.devices,
        mapping: Object.entries(admin.mapping).map(([key, register]) => {
          const r = ALL_DEMO_REGISTERS[register];
          return {
            key,
            register: r
              ? { id: r.id, name: r.name, addr: r.offset !== undefined ? { rackOffset: r.offset, stride: 150 } : r.addr, fc: r.fc, type: r.type, scale: r.scale ?? 1, unit: r.unit ?? "" }
              : null,
          };
        }),
      };
      const json = JSON.stringify(payload, null, 2);
      navigator.clipboard?.writeText(json).then(
        () => setCopyLabel("JSON copied to clipboard."),
        () => setCopyLabel("Clipboard unavailable."),
      );
    },
  };

  return (
    <DemoAdminView
      topology={DEMO_TOPOLOGY}
      state={state}
      runs={runs}
      logs={logs}
      admin={{
        mapping: admin.mapping,
        devices: admin.devices,
        params: admin.params,
        mapDev: admin.mapDev,
        prevUnit: admin.prevUnit,
        prevBank: admin.prevBank,
      }}
      actions={actions}
      copyLabel={copyLabel}
    />
  );
};
