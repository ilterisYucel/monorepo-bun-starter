import React, { useState } from "react";

/**
 * Event log paneli (SPEC UC-2/UC-7, FR-2.4) — referans `log long` düzeni:
 * zaman + seviye etiketi + mesaj, üstte seviye filtresi. Veri props'tan gelir.
 */

export interface DemoEvent {
  id: string;
  timestamp: string;
  type: string;
  source: string;
  message: string;
  details?: string;
}

export type DemoEventFilter = "all" | "alarm" | "warn" | "info";

export interface DemoEventLogProps {
  events: DemoEvent[];
}

const SEV: Record<string, "alarm" | "warn" | "info" | "maint"> = {
  error: "alarm",
  warning: "warn",
  info: "info",
  success: "info",
  alarm: "alarm",
  warn: "warn",
  maint: "maint",
};

const SEV_TXT: Record<string, string> = {
  alarm: "ALARM",
  warn: "WARNING",
  info: "INFO",
  maint: "MAINT.",
};

const hhmmss = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(
    d.getSeconds(),
  ).padStart(2, "0")}`;
};

export const DemoEventLog: React.FC<DemoEventLogProps> = ({ events }) => {
  const [filter, setFilter] = useState<DemoEventFilter>("all");
  const shown = events.filter((e) => {
    if (filter === "all") return true;
    const sev = SEV[e.type] ?? "info";
    if (filter === "alarm") return sev === "alarm";
    if (filter === "warn") return sev === "warn";
    return sev === "info" || sev === "maint";
  });

  const filters: Array<[DemoEventFilter, string]> = [
    ["all", "All"],
    ["alarm", "Alarms"],
    ["warn", "Warnings"],
    ["info", "Info"],
  ];

  return (
    <div data-testid="demo-event-log">
      <div className="card">
        <header>
          <h2>
            Event log<small>{shown.length} of {events.length} events</small>
          </h2>
          <div className="seg sm" role="group" aria-label="Log filter">
            {filters.map(([id, label]) => (
              <button
                key={id}
                type="button"
                data-testid={`event-filter-${id}`}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>
        <ol className="log">
          {shown.length === 0 ? (
            <li className="empty">No events.</li>
          ) : (
            shown.map((e) => {
              const sev = SEV[e.type] ?? "info";
              return (
                <li key={e.id} data-testid="event-row">
                  <time>{hhmmss(e.timestamp)}</time>
                  <span className={`tag c-${sev}`}>{SEV_TXT[sev]}</span>
                  <span className={`m sev-${sev}`}>{e.message}</span>
                </li>
              );
            })
          )}
        </ol>
      </div>
    </div>
  );
};
