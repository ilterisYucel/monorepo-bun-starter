import React, { useMemo } from "react";
import { DEMO_REST_ENABLED, DemoReadyCard, deriveGroupChecks, derivePlantChecks } from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";
import { availablePoiMW } from "../features/demo-data/demo-permissives";
import { deriveAlerts } from "../features/demo-data/deriveAlerts";

/**
 * Ready/Rest kartı — referans görünürlük kuralı: YALNIZ Operations sekmesinde.
 *
 * Referans `renderReady` portu: solda **saha kartı** (PLANT READY + 5 kontrol) ve
 * rest bloğu; sağda **7 eksenli** grup hazırlık kartları (MV · BSC · PCS · Temp ·
 * Rest · Safety · Cal.). UC-13: liste seçili istasyonun gruplarına süzülür.
 */
export const DemoReadySection: React.FC = () => {
  const { rest, readyUnits, state, stationState, stationTopology, openDevices } = useDemoProjectContext();
  const L = DEMO_TOPOLOGY.limits;
  const stationUnits = new Set(stationState.units.map((u) => u.n));
  const auxKw = stationState.units[0]?.aux?.kW ?? 0;
  const earthingOk = !Object.values(stationState.station.es).some(Boolean);

  const units = useMemo(
    () =>
      readyUnits
        .filter((r) => stationUnits.has(r.n))
        .map((r) => {
          const unit = stationState.units.find((u) => u.n === r.n);
          if (unit === undefined) return r;
          return {
            ...r,
            checks: deriveGroupChecks({
              unit,
              limits: L,
              earthingOk,
              restApplied: DEMO_REST_ENABLED,
              restComplete: rest.complete,
            }),
          };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtre türevleri
    [readyUnits, stationState.units, stationState.station.es, rest.complete, earthingOk],
  );

  // Saha kartı: referans `plant-ready` satırları (canlı ölçümler) + kullanılabilir güç.
  const plant = useMemo(() => {
    const critical = deriveAlerts(stationState, stationTopology).filter((a) => a.sev === "alarm").length;
    const checks = derivePlantChecks({
      station: stationState.station,
      auxVoltage: stationState.units[0]?.aux?.v,
      criticalFaults: critical,
    });
    const readyCount = units.filter((u) => u.checks?.ok ?? u.ready).length;
    const siteOk = checks.every((c) => c.ok);
    const level: "ok" | "part" | "bad" =
      !siteOk || readyCount === 0 ? "bad" : readyCount === units.length ? "ok" : "part";
    const title =
      level === "ok"
        ? `PLANT READY · all ${readyCount} groups available`
        : level === "part"
          ? `PLANT READY · ${readyCount} / ${units.length} groups available`
          : "PLANT NOT READY";
    const unitNrs = stationState.units.map((u) => u.n);
    const dis = availablePoiMW(stationState, stationTopology, unitNrs, "dis", auxKw);
    const chg = availablePoiMW(stationState, stationTopology, unitNrs, "chg", auxKw);
    const detail =
      level === "bad"
        ? checks.filter((c) => !c.ok).map((c) => `${c.label}: ${c.detail}`).join(" · ") || "no group available"
        : `up to ${dis.toFixed(1)} MW discharge · ${chg.toFixed(1)} MW charge at POI`;
    return {
      level,
      title,
      detail,
      checks: checks.map((c) => ({ ok: c.ok, label: c.label, detail: c.detail })),
    };
  }, [stationState, stationTopology, units, auxKw]);

  return (
    <section className="card readycard">
      <DemoReadyCard
        units={units}
        rest={rest}
        showRest={DEMO_REST_ENABLED}
        ambient={stationState.ambient ?? state.ambient}
        tempMin={L.tempMin}
        tempMax={L.tempMax}
        onOpenUnit={(n) => openDevices(n, "battery")}
        plant={plant}
      />
    </section>
  );
};
