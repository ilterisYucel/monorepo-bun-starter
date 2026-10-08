import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DemoAdminView, ALL_DEMO_REGISTERS, type DemoAdminActions } from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";
import { useDemoAdminStore } from "../features/demo-data/stores/DemoAdminStore";
import { demoApi } from "../features/demo-data/demoApi";
import { siteFieldId } from "../lib/site-field";

/** DemoAdminPage — Master admin (SPEC UC-8); tarayıcı-durumu store'undan beslenir. */
export const DemoAdminPage: React.FC = () => {
  const fieldId = siteFieldId();
  const { state, runs, logs } = useDemoProjectContext();
  const admin = useDemoAdminStore();
  const [copyLabel, setCopyLabel] = useState("");

  const writes = useQuery({
    queryKey: ["demo-command-writes", fieldId],
    queryFn: ({ signal }) => demoApi.listCommandWrites(200, undefined, signal),
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0,
  });

  const containers = useQuery({
    queryKey: ["demo-containers-status", fieldId],
    queryFn: ({ signal }) => demoApi.containers(fieldId, signal),
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0,
  });
  const containerStatus = (containers.data ?? []).map((c) => ({
    containerId: c.containerId,
    connectionStatus: c.connectionStatus,
    telemetryCount: c.latestTelemetry?.length ?? 0,
  }));

  const registerContainer = async (containerId: string, token: string): Promise<string | undefined> => {
    try {
      await demoApi.registerContainer(fieldId, containerId, token);
      await containers.refetch();
      return undefined;
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 403) return "not authorised (admin/boss; password change or MFA may be pending)";
      if (status === 400) return "invalid token (at least 32 characters)";
      return (e as Error).message;
    }
  };

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
      writes={writes.data ?? []}
      registerContainer={registerContainer}
      containerStatus={containerStatus}
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
