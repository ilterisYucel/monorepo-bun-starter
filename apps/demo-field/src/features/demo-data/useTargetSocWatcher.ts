import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { OperationRunRecord } from "@gd-monorepo/shared-types";
import type { NovaMimicState } from "@gd-monorepo/ui";
import { demoManeuverApi } from "./demoManeuverApi";
import { useTargetSocStore } from "./stores/TargetSocStore";

/**
 * Hedef SOC gözlemcisi (SPEC UC-5). Aktif hedef varken scope SOC ortalamasını
 * izler; `chg → soc ≥ target` / `dis → soc ≤ target` olunca **standby** (stop)
 * çalıştırır ve hedefi temizler.
 *
 * Yarışı önlemek için hedef yalnız `setAt`'ten SONRA başlayan ve yönle eşleşen
 * bir **run (charge/discharge)** oluştuğunda ateşlenir — böylece stop, komut
 * başlamadan önce değil, manevra gerçekten yürürken çalışır.
 * Sekmeden bağımsız — DemoProjectLayout'ta çağrılır.
 */

export function socOf(state: NovaMimicState, scope: number[]): number | undefined {
  const units = scope.length ? state.units.filter((u) => scope.includes(u.n)) : state.units;
  const banks = units.flatMap((u) => u.banks);
  if (banks.length === 0) return undefined;
  return banks.reduce((a, b) => a + b.soc, 0) / banks.length;
}

export function targetReached(soc: number, target: number, dir: "chg" | "dis"): boolean {
  return dir === "chg" ? soc >= target : soc <= target;
}

/** Yönle eşleşen ve `setAt`'ten sonra başlayan bir run var mı. */
export function matchingRunStarted(
  runs: OperationRunRecord[],
  dir: "chg" | "dis",
  setAt: number,
): boolean {
  const name = dir === "chg" ? "charge" : "discharge";
  return runs.some((r) => r.name === name && Date.parse(r.startedAt) >= setAt - 2000);
}

export function useTargetSocWatcher(state: NovaMimicState, runs: OperationRunRecord[]): void {
  const target = useTargetSocStore((s) => s.target);
  const dir = useTargetSocStore((s) => s.dir);
  const scope = useTargetSocStore((s) => s.scope);
  const active = useTargetSocStore((s) => s.active);
  const setAt = useTargetSocStore((s) => s.setAt);
  const clear = useTargetSocStore((s) => s.clear);
  const qc = useQueryClient();
  const firing = useRef(false);

  useEffect(() => {
    if (!active || target === null || dir === null) return;
    if (firing.current) return;
    if (!matchingRunStarted(runs, dir, setAt)) return;
    const soc = socOf(state, scope);
    if (soc === undefined) return;
    if (!targetReached(soc, target, dir)) return;

    firing.current = true;
    void demoManeuverApi
      .stop()
      .catch(() => undefined)
      .finally(() => {
        clear();
        void qc.invalidateQueries({ queryKey: ["demo-runs"] });
        void qc.invalidateQueries({ queryKey: ["demo-field-containers"] });
        setTimeout(() => {
          firing.current = false;
        }, 5000);
      });
  }, [state, runs, target, dir, scope, active, setAt, clear, qc]);
}
