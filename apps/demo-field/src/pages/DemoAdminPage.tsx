import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DemoAdminView, ALL_DEMO_REGISTERS, type DemoAdminActions } from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";
import { useDemoAdminStore } from "../features/demo-data/stores/DemoAdminStore";
import { demoApi } from "../features/demo-data/demoApi";
import { siteFieldId } from "../lib/site-field";
import { useQueryClient } from "@tanstack/react-query";
import { alertKey } from "../features/demo-data/deriveAlerts";
import { useFaultClearStore } from "../features/demo-data/stores/FaultClearStore";
import { demoAlarmApi } from "../features/demo-data/demoAlarmApi";

/**
 * Admin › Arıza temizleme (2026-10-15 sahibi kararı): aktif PMS uyarıları ve
 * cihaz alarmları tek tuşla kaldırılır. PMS uyarıları koşul bitene kadar gizlenir;
 * cihaz alarmları backend resolve ucuyla (audit'li) çözülür.
 */
const FaultClearCard: React.FC = () => {
  const { alerts, alarms } = useDemoProjectContext();
  const clear = useFaultClearStore((s) => s.clear);
  const reset = useFaultClearStore((s) => s.reset);
  const clearedCount = useFaultClearStore((s) => s.cleared.length);
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const open = alarms.filter((a) => a.active && !a.resolved);

  const resolveAlarms = async (list: typeof open): Promise<void> => {
    const res = await Promise.allSettled(
      list.map((a) => demoAlarmApi.resolve(a.deviceId, a.alarmName, "cleared from Admin")),
    );
    const failed = res.filter((r) => r.status === "rejected").length;
    await qc.invalidateQueries({ queryKey: ["demo-alarms"] });
    if (failed) setMsg(`${failed} device alarm(s) could not be resolved (permission?).`);
  };

  const clearAll = async (): Promise<void> => {
    setBusy(true);
    setMsg("");
    clear(alerts.map(alertKey));
    await resolveAlarms(open);
    setBusy(false);
    setMsg((m) => m || "All faults cleared.");
  };

  return (
    <section className="card" style={{ padding: 14, marginBottom: 14 }} data-testid="admin-fault-clear">
      <div className="dh" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <h3>Faults · clear</h3>
          <p className="dsub">
            {alerts.length} active PMS fault(s) · {open.length} open device alarm(s)
            {clearedCount ? ` · ${clearedCount} hidden until the condition ends` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-warn" disabled={busy || (alerts.length === 0 && open.length === 0)} onClick={() => void clearAll()}>
            Clear all faults
          </button>
          <button type="button" className="btn" disabled={clearedCount === 0} onClick={reset}>
            Show hidden again
          </button>
        </div>
      </div>
      {alerts.length + open.length > 0 ? (
        <div className="tblwrap">
          <table className="dt">
            <thead>
              <tr>
                <th>Source</th>
                <th>Fault</th>
                <th>Detail</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={alertKey(a)}>
                  <td>{a.unitNo !== undefined ? `BESS#${a.unitNo}` : a.cell ?? "site"} · PMS</td>
                  <td>{a.title}</td>
                  <td>{a.desc}{a.value ? ` · ${a.value}` : ""}</td>
                  <td>
                    <button type="button" className="btn sm" onClick={() => clear([alertKey(a)])}>
                      Clear
                    </button>
                  </td>
                </tr>
              ))}
              {open.map((a) => (
                <tr key={`${a.deviceId}|${a.alarmName}`}>
                  <td>{a.deviceId} · device</td>
                  <td>{a.alarmName}</td>
                  <td>{a.description ?? a.severity}</td>
                  <td>
                    <button type="button" className="btn sm" disabled={busy} onClick={() => void resolveAlarms([a])}>
                      Clear
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="dsub">No active faults.</p>
      )}
      {msg ? <p className="okmsg">{msg}</p> : null}
    </section>
  );
};

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
    station: c.station ?? null,
    connectionStatus: c.connectionStatus,
    telemetryCount: c.latestTelemetry?.length ?? 0,
  }));

  const registerContainer = async (
    containerId: string,
    token: string,
    station?: string,
  ): Promise<string | undefined> => {
    try {
      await demoApi.registerContainer(fieldId, containerId, token, station);
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
    <>
    <FaultClearCard />
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
    </>
  );
};
