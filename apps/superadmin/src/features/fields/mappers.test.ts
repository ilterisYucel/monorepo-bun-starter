import { describe, it, expect } from "vitest";
import { toFieldMarker } from "./mappers";
import type { AdminField } from "./types";

const base: AdminField = {
  id: "f-1",
  name: "İstanbul-1",
  location: { lat: 41.0, lng: 28.9 },
  api_url: "https://field.example",
  status: "online",
  container_count: 4,
  online_containers: 3,
  total_power_mw: 2.4,
  avg_soc: 62.4,
  active_alarms: 0,
  last_seen_at: "2026-09-07T12:00:00Z",
  metadata: {},
  created_at: "",
  updated_at: "",
  field_type: null,
};

describe("toFieldMarker (sınır eşlemesi)", () => {
  it("çevrimiçi sahayı online'a eşler", () => {
    const marker = toFieldMarker(base);
    expect(marker.status).toBe("online");
    expect(marker.containerCount).toBe(4);
    expect(marker.totalPowerMw).toBe(2.4);
  });

  it("aktif alarmı olan çevrimiçi saha warning olur", () => {
    const marker = toFieldMarker({ ...base, active_alarms: 2 });
    expect(marker.status).toBe("warning");
    expect(marker.activeAlarms).toBe(2);
  });

  it("çevrimdışı saha offline olur", () => {
    const marker = toFieldMarker({ ...base, status: "offline" });
    expect(marker.status).toBe("offline");
  });

  it("eksik ölçümler undefined taşınır (UI '—' gösterir)", () => {
    const marker = toFieldMarker({ ...base, total_power_mw: null, avg_soc: null });
    expect(marker.totalPowerMw).toBeUndefined();
    expect(marker.avgSoc).toBeUndefined();
  });

  it("field_type → marker.type taşınır; null → undefined (genel glif)", () => {
    const marker = toFieldMarker({ ...base, field_type: "wind" });
    expect(marker.type).toBe("wind");
    const noType = toFieldMarker(base);
    expect(noType.type).toBeUndefined();
  });
});
