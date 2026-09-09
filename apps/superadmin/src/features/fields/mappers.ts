import type { FieldMarker } from "@gd-monorepo/ui";
import type { AdminField } from "./types";

/** Alarmı olan çevrimiçi saha "warning" ile işaretlenir (FieldCard/FieldMap sözleşmesi). */
const statusFor = (field: AdminField): FieldMarker["status"] => {
  if (field.status !== "online") return "offline";
  if ((field.active_alarms ?? 0) > 0) return "warning";
  return "online";
};

/**
 * AdminField (snake_case backend satırı) → FieldMarker (UI sözleşmesi).
 * Sınır eşlemesi tek yerde tutulur — UI bileşenleri backend şemasını görmez.
 */
export const toFieldMarker = (field: AdminField): FieldMarker => ({
  id: field.id,
  name: field.name,
  lat: field.location?.lat ?? 0,
  lng: field.location?.lng ?? 0,
  status: statusFor(field),
  type: field.field_type ?? undefined,
  containerCount: field.container_count,
  onlineContainerCount: field.online_containers,
  totalPowerMw: field.total_power_mw ?? undefined,
  avgSoc: field.avg_soc ?? undefined,
  activeAlarms: field.active_alarms,
});
