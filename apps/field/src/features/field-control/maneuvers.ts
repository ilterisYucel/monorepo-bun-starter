import type { ManeuverConfig } from "@gd-monorepo/shared-types";

export const FIELD_MANEUVERS: Record<string, ManeuverConfig> = {
  field_charge_all: {
    name: "field_charge_all",
    label: "Tum Konteynerleri Sarj Et",
    description: "Sahadaki tum konteynerleri ayni anda sarj moduna alir",
    mode: "parallel",
    onFailure: "continue",
    steps: [],
    rollbackSteps: [],
  },
  field_discharge_all: {
    name: "field_discharge_all",
    label: "Tum Konteynerleri Desarj Et",
    description: "Sahadaki tum konteynerleri ayni anda desarj moduna alir",
    mode: "parallel",
    onFailure: "continue",
    steps: [],
    rollbackSteps: [],
  },
  field_emergency_stop: {
    name: "field_emergency_stop",
    label: "Acil Durdurma (Saha)",
    description: "Sahadaki tum konteynerleri acil durdurur",
    mode: "parallel",
    onFailure: "continue",
    steps: [],
    rollbackSteps: [],
  },
};
