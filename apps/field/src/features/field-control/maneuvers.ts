import type { ManeuverConfig, CommandStep } from "@gd-monorepo/shared-types";

// Her konteyneri ayrı bir PCS kontrol eder (field device-service poll eder).
// ponytail: sabit mock listesi — gerçek backend geldiğinde field
// device-service kayıt defterinden dinamik çözülecek.
const PCS_IDS = ["PCS-1", "PCS-2", "PCS-3"];

function stepsFor(command: string): CommandStep[] {
  return PCS_IDS.map((deviceId) => ({ deviceId, command }));
}

export const FIELD_MANEUVERS: Record<string, ManeuverConfig> = {
  field_charge_all: {
    name: "field_charge_all",
    label: "maneuver.fieldChargeAll",
    description: "maneuver.fieldChargeAllDesc",
    mode: "parallel",
    onFailure: "continue",
    steps: stepsFor("charge"),
    rollbackSteps: [],
  },
  field_discharge_all: {
    name: "field_discharge_all",
    label: "maneuver.fieldDischargeAll",
    description: "maneuver.fieldDischargeAllDesc",
    mode: "parallel",
    onFailure: "continue",
    steps: stepsFor("discharge"),
    rollbackSteps: [],
  },
  field_emergency_stop: {
    name: "field_emergency_stop",
    label: "maneuver.fieldEmergencyStop",
    description: "maneuver.fieldEmergencyStopDesc",
    mode: "parallel",
    onFailure: "continue",
    steps: stepsFor("stop"),
    rollbackSteps: [],
  },
};
