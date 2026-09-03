import type { ManeuverConfig, CommandStep } from "@gd-monorepo/shared-types";

/**
 * Saha manevraları — konteyner başına TEK PCS sözleşmesi (2026-08-30).
 *
 * Hedef PCS listesi sabit DEĞİLDİR: `buildFieldManeuvers(pcsIds)` dışarıdan
 * verilen kimliklerden adım üretir (saha device-service kayıt defterinin
 * önizlemesi — panel mock konteynerlerinden türetir; gerçek backend geldiğinde
 * dinamik kayıt defterine bağlanacak).
 */
export function stepsFor(command: string, pcsIds: string[]): CommandStep[] {
  return pcsIds.map((deviceId) => ({ deviceId, command }));
}

/** pcsIds hedef listesinden 3 saha manevrası üretir. */
export function buildFieldManeuvers(
  pcsIds: string[],
): Record<string, ManeuverConfig> {
  return {
    field_charge_all: {
      name: "field_charge_all",
      label: "maneuver.fieldChargeAll",
      description: "maneuver.fieldChargeAllDesc",
      mode: "parallel",
      onFailure: "continue",
      steps: stepsFor("charge", pcsIds),
      rollbackSteps: [],
    },
    field_discharge_all: {
      name: "field_discharge_all",
      label: "maneuver.fieldDischargeAll",
      description: "maneuver.fieldDischargeAllDesc",
      mode: "parallel",
      onFailure: "continue",
      steps: stepsFor("discharge", pcsIds),
      rollbackSteps: [],
    },
    field_emergency_stop: {
      name: "field_emergency_stop",
      label: "maneuver.fieldEmergencyStop",
      description: "maneuver.fieldEmergencyStopDesc",
      mode: "parallel",
      onFailure: "continue",
      steps: stepsFor("stop", pcsIds),
      rollbackSteps: [],
    },
  };
}
