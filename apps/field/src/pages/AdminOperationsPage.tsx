import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { OperationRecord, OperationStep } from "@gd-monorepo/shared-types";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { fieldManeuverApi } from "../features/field-control/services/fieldManeuverApi";
import { useContainerData } from "../features/containers/hooks/useContainerData";
import { siteFieldId } from "../lib/site-field";

/**
 * AdminOperationsPage — saha admin operasyon tanım YÖNETİMİ (C4, §11.3):
 *
 * - Yalnız admin: AuthStore.isAdmin değilse içerik gösterilmez.
 * - Adım kurucusu: sistem seçimi (ContainerProxy listesi — connected
 *   konteynerler) + manevra seçimi (GET /api/maneuvers) + mode/onFailure +
 *   rollback adımları. Uzak adım (system) Faz C kanalıyla GERÇEKTİR.
 * - Kaydet: POST /operations (mükerrer → hata); Sil: DELETE (yumuşak —
 *   enabled=false); Geçmiş: GET /operations/runs.
 * - Tanımlar tier-LOCAL'dir (başka tier'a çoğaltılmaz — §11.3).
 */

const stepOf = (system: string, maneuver: string): OperationStep =>
  system === "local"
    ? { maneuver }
    : { system, maneuver };

export const AdminOperationsPage: React.FC = () => {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const queryClient = useQueryClient();
  const fieldId = siteFieldId();

  const { containers } = useContainerData(fieldId);
  const systems = useMemo(
    () => [
      { id: "local", label: "Yerel (saha)" },
      ...containers
        .filter((c) => c.connectionStatus === "connected")
        .map((c) => ({ id: c.containerId, label: c.containerId })),
    ],
    [containers],
  );

  const { data: maneuvers = [] } = useQuery({
    queryKey: ["field-maneuvers"],
    queryFn: ({ signal }) => fieldManeuverApi.listManeuvers(signal),
  });
  const { data: operations = [] } = useQuery({
    queryKey: ["field-operations"],
    queryFn: ({ signal }) => fieldManeuverApi.listOperations(signal),
  });
  const { data: runs = [] } = useQuery({
    queryKey: ["field-operation-runs"],
    queryFn: ({ signal }) => fieldManeuverApi.listRuns(signal),
  });

  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"parallel" | "sequential">("sequential");
  const [onFailure, setOnFailure] = useState<"stop" | "continue" | "rollback">("stop");
  const [steps, setSteps] = useState<Array<{ system: string; maneuver: string }>>([
    { system: "local", maneuver: "" },
  ]);
  const [rollback, setRollback] = useState<Array<{ system: string; maneuver: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => {
      const definition: OperationRecord = {
        name,
        label: label || name,
        mode,
        onFailure,
        steps: steps
          .filter((s) => s.maneuver !== "")
          .map((s) => stepOf(s.system, s.maneuver)),
        ...(onFailure === "rollback" && rollback.length > 0
          ? { rollback: rollback.filter((r) => r.maneuver !== "").map((r) => stepOf(r.system, r.maneuver)) }
          : {}),
      };
      return fieldManeuverApi.createOperation(definition);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["field-operations"] });
      setName("");
      setLabel("");
      setError(null);
    },
    onError: (err: unknown) => {
      setError(String((err as { response?: { status?: number } })?.response?.status ?? err));
    },
  });

  const remove = useMutation({
    mutationFn: (opName: string) => fieldManeuverApi.deleteOperation(opName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["field-operations"] });
    },
  });

  if (!isAdmin) {
    return <div style={{ padding: 24 }}>Yalnızca admin erişebilir.</div>;
  }

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <h2>Operasyon Tanımları (Admin)</h2>

      <section style={{ display: "grid", gap: 8, maxWidth: 560 }}>
        <h3>Yeni Operasyon</h3>
        <label>
          Ad:{" "}
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Etiket:{" "}
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={name} />
        </label>
        <label>
          Mod:{" "}
          <select value={mode} onChange={(e) => setMode(e.target.value as "parallel" | "sequential")}>
            <option value="sequential">Sıralı</option>
            <option value="parallel">Paralel</option>
          </select>
        </label>
        <label>
          Hata politikası:{" "}
          <select value={onFailure} onChange={(e) => setOnFailure(e.target.value as never)}>
            <option value="stop">Dur</option>
            <option value="continue">Devam</option>
            <option value="rollback">Geri Al</option>
          </select>
        </label>

        <h4>Adımlar</h4>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <select
              aria-label={`step-${i}-system`}
              value={s.system}
              onChange={(e) =>
                setSteps((prev) => prev.map((x, j) => (j === i ? { ...x, system: e.target.value } : x)))
              }
            >
              {systems.map((sys) => (
                <option key={sys.id} value={sys.id}>
                  {sys.label}
                </option>
              ))}
            </select>
            <select
              aria-label={`step-${i}-maneuver`}
              value={s.maneuver}
              onChange={(e) =>
                setSteps((prev) => prev.map((x, j) => (j === i ? { ...x, maneuver: e.target.value } : x)))
              }
            >
              <option value="">— manevra seç —</option>
              {maneuvers.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.label} ({m.name})
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))}>
              −
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSteps((prev) => [...prev, { system: "local", maneuver: "" }])}
        >
          + Adım
        </button>

        {onFailure === "rollback" && (
          <>
            <h4>Geri Alma Adımları</h4>
            {rollback.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <select
                  aria-label={`rollback-${i}-system`}
                  value={s.system}
                  onChange={(e) =>
                    setRollback((prev) => prev.map((x, j) => (j === i ? { ...x, system: e.target.value } : x)))
                  }
                >
                  {systems.map((sys) => (
                    <option key={sys.id} value={sys.id}>
                      {sys.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`rollback-${i}-maneuver`}
                  value={s.maneuver}
                  onChange={(e) =>
                    setRollback((prev) => prev.map((x, j) => (j === i ? { ...x, maneuver: e.target.value } : x)))
                  }
                >
                  <option value="">— manevra seç —</option>
                  {maneuvers.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.label} ({m.name})
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setRollback((prev) => prev.filter((_, j) => j !== i))}>
                  −
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRollback((prev) => [...prev, { system: "local", maneuver: "" }])}
            >
              + Geri Alma Adımı
            </button>
          </>
        )}

        <button type="button" disabled={!name || create.isPending} onClick={() => create.mutate()}>
          Kaydet
        </button>
        {error && <p style={{ color: "red" }}>Hata: {error}</p>}
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Tanımlı Operasyonlar</h3>
        <ul>
          {operations.map((op) => (
            <li key={op.name}>
              {op.label} ({op.name}) — {op.mode}/{op.onFailure ?? "stop"}{" "}
              <button
                type="button"
                data-delete-op={op.name}
                onClick={() => remove.mutate(op.name)}
              >
                Devre Dışı Bırak
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Çalıştırma Geçmişi</h3>
        <table style={{ textAlign: "left" }}>
          <thead>
            <tr>
              <th>Ad</th>
              <th>Durum</th>
              <th>Tetikleyici</th>
              <th>Başlangıç</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.status}</td>
                <td>{r.trigger}</td>
                <td>{r.startedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};
