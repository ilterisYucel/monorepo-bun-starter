import React from "react";
import type { RestState } from "./demo-readiness";

/**
 * Ready / Rest kartı — referans konsol düzeni (SPEC UC-2, FR-2.3):
 * solda büyük rest bloğu (dinlenme süresi/ilerleme), sağda grup bazlı termal
 * hazırlık çipleri (READY / NOT READY + sıcaklık aralığı). Tüm türevler saf
 * (`demo-readiness.ts` + `deriveKpis`); veri props'tan gelir.
 */

export interface DemoReadyUnit {
  n: number;
  tmin: number;
  tmax: number;
  ready: boolean;
  note: string;
}

export interface DemoReadyCardProps {
  units: DemoReadyUnit[];
  rest: RestState;
  restHours?: number;
  ambient?: number;
  tempMin: number;
  tempMax: number;
  onOpenUnit?: (n: number) => void;
}

const hms = (minutes: number): string => {
  const total = Math.max(0, Math.round(minutes * 60));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const DemoReadyCard: React.FC<DemoReadyCardProps> = ({
  units,
  rest,
  restHours,
  ambient,
  tempMin,
  tempMax,
  onOpenUnit,
}) => {
  const hasRest = rest.finishedAt !== undefined;
  const el = rest.elapsedMinutes ?? 0;
  const need = rest.requiredMinutes;
  const readyCount = units.filter((u) => u.ready).length;
  const restClass = !hasRest ? "none" : rest.complete ? "done" : "run";

  return (
    <div className="ready-wrap" data-testid="ready-card">
      <div className={`rest-big ${restClass}`}>
        <small>Rest time after full charge / discharge</small>
        <b className="num">
          {hasRest ? hms(el) : "—"}{" "}
          {hasRest ? <span>/ {hms(need)}</span> : null}
        </b>
        <em>
          {!hasRest
            ? `No full charge / discharge waiting · rest setting ${restHours ?? need / 60} h`
            : rest.complete
              ? "REST TIME COMPLETE"
              : "REST TIME NOT COMPLETE"}
        </em>
        {hasRest ? (
          <span className="prog">
            <i style={{ width: `${Math.min(100, (el / need) * 100).toFixed(1)}%` }} />
          </span>
        ) : null}
      </div>
      <div className="ready-groups">
        <div className="rg-h">
          <b>
            Thermal readiness · {readyCount} / {units.length} groups
          </b>
          <span className="dsub">
            Groups may run inside {tempMin}–{tempMax} °C – also before the rest time
            is over{ambient !== undefined ? ` · ambient ${ambient.toFixed(1)} °C` : ""}
          </span>
        </div>
        <div className="rg">
          {units.map((u) => (
            <button
              key={u.n}
              type="button"
              className={`rgc ${u.ready ? "ok" : "alarm"}`}
              data-testid={`ready-unit-${u.n}`}
              onClick={() => onOpenUnit?.(u.n)}
            >
              <b>BESS#{u.n}</b>
              <span>{u.ready ? "READY" : "NOT READY"}</span>
              <small>{u.note}</small>
              <em className="num">
                {u.tmin.toFixed(1)}–{u.tmax.toFixed(1)} °C
              </em>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
