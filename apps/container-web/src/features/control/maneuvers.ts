import type { ManeuverConfig } from "@gd-monorepo/shared-types";
import type { InputField, ManeuverTransform } from "@gd-monorepo/ui";

const HVAC_IDS = [
  "HVAC-1",
  "HVAC-2",
  "HVAC-3",
  "HVAC-4",
  "HVAC-5",
  "HVAC-6",
  "HVAC-7",
  "HVAC-8",
];
const BSC_IDS = ["BSC-1", "BSC-2"];
const CB_IDS = ["CB-1", "CB-2"];
const DC_IDS = ["DC-1", "DC-2"];

const bscCharge = (powerKw: number) =>
  BSC_IDS.map((id) => ({
    deviceId: id,
    command: "charge",
    params: { powerKw },
  }));
const bscDischarge = (powerKw: number) =>
  BSC_IDS.map((id) => ({
    deviceId: id,
    command: "discharge",
    params: { powerKw },
  }));
const bscStop = () => BSC_IDS.map((id) => ({ deviceId: id, command: "stop" }));
const cbOpen = () => CB_IDS.map((id) => ({ deviceId: id, command: "open" }));
const cbClose = () => CB_IDS.map((id) => ({ deviceId: id, command: "close" }));
const dcOn = () => DC_IDS.map((id) => ({ deviceId: id, command: "on" }));
const dcOff = () => DC_IDS.map((id) => ({ deviceId: id, command: "off" }));
const hvacOn = () => HVAC_IDS.map((id) => ({ deviceId: id, command: "on" }));
const hvacOff = () => HVAC_IDS.map((id) => ({ deviceId: id, command: "off" }));
const hvacCool = () =>
  HVAC_IDS.map((id) => ({ deviceId: id, command: "force_cool" }));
const hvacHeat = () =>
  HVAC_IDS.map((id) => ({ deviceId: id, command: "force_heat" }));

export const HIDDEN_MANEUVER_NAMES: ReadonlySet<string> = new Set([
  "fl_bsc_power",
  "fl_idle",
  "fl02_aux_loss",
  "fl05_tms_block_charge",
  "fl06_charge",
  "fl06_discharge",
  "fl07_door_open",
  "fl08_dc_fault",
  "fl09_comm_loss",
  "fl11_ground_fault",
]);

export const MANEUVERS: Record<string, ManeuverConfig> = {
  fl_bsc_power: {
    name: "fl_bsc_power",
    label: "BSC Güç Kontrolü",
    description: "maneuver.desc.fl_bsc_power",
    mode: "parallel",
    steps: BSC_IDS.map((id) => ({ deviceId: id })),
    rollbackSteps: bscStop(),
  },

  fl_idle: {
    name: "fl_idle",
    label: "Durdur",
    description: "maneuver.desc.fl_idle",
    mode: "parallel",
    steps: bscStop(),
  },

  fl01_start: {
    name: "fl01_start",
    label: "FL-01: Sistem Başlatma",
    description: "maneuver.desc.fl01_start",
    mode: "parallel",
    steps: [...cbOpen(), ...bscCharge(0), ...dcOn()],
  },

  fl02_aux_loss: {
    name: "fl02_aux_loss",
    label: "FL-02: AUX Kaybı — Acil Durdurma",
    description: "maneuver.desc.fl02_aux_loss",
    mode: "sequential",
    steps: [...bscStop(), ...dcOff(), ...cbOpen()],
  },

  fl03_emergency_stop: {
    name: "fl03_emergency_stop",
    label: "FL-03: Acil Durdurma (Emergency Stop)",
    description: "maneuver.desc.fl03_emergency_stop",
    mode: "sequential",
    steps: [...bscStop(), ...dcOff(), ...cbOpen()],
  },

  fl04_calibration_charge: {
    name: "fl04_calibration_charge",
    label: "FL-04: Kalibrasyon — Şarj (0.25C)",
    description: "maneuver.desc.fl04_calibration_charge",
    mode: "parallel",
    steps: bscCharge(500),
  },

  fl04_calibration_discharge: {
    name: "fl04_calibration_discharge",
    label: "FL-04: Kalibrasyon — Deşarj (0.25C)",
    description: "maneuver.desc.fl04_calibration_discharge",
    mode: "parallel",
    steps: bscDischarge(500),
  },

  fl05_tms_cooling_force: {
    name: "fl05_tms_cooling_force",
    label: "FL-05: TMS — Soğutmayı Zorla (8 HVAC)",
    description: "maneuver.desc.fl05_tms_cooling_force",
    mode: "parallel",
    steps: hvacCool(),
  },

  fl05_tms_heating_force: {
    name: "fl05_tms_heating_force",
    label: "FL-05: TMS — Isıtmayı Zorla (8 HVAC)",
    description: "maneuver.desc.fl05_tms_heating_force",
    mode: "parallel",
    steps: hvacHeat(),
  },

  fl05_tms_block_charge: {
    name: "fl05_tms_block_charge",
    label: "FL-05: TMS — Termal Koruma Durdur",
    description: "maneuver.desc.fl05_tms_block_charge",
    mode: "parallel",
    steps: bscStop(),
  },

  fl06_charge: {
    name: "fl06_charge",
    label: "FL-06: Şarj (Ön Kontrollü)",
    description: "maneuver.desc.fl06_charge",
    mode: "sequential",
    onFailure: "stop",
    steps: [...cbClose(), ...bscCharge(500)],
  },

  fl06_discharge: {
    name: "fl06_discharge",
    label: "FL-06: Deşarj (Ön Kontrollü)",
    description: "maneuver.desc.fl06_discharge",
    mode: "sequential",
    onFailure: "stop",
    steps: [...cbClose(), ...bscDischarge(500)],
  },

  fl07_door_open: {
    name: "fl07_door_open",
    label: "FL-07: Kapı Açık — Güvenlik Durdurma",
    description: "maneuver.desc.fl07_door_open",
    mode: "parallel",
    steps: bscStop(),
  },

  fl08_dc_fault: {
    name: "fl08_dc_fault",
    label: "FL-08: DC Arıza — Koruma Kapatma",
    description: "maneuver.desc.fl08_dc_fault",
    mode: "parallel",
    steps: [...bscStop(), ...cbOpen()],
  },

  fl09_comm_loss: {
    name: "fl09_comm_loss",
    label: "FL-09: İletişim Kaybı — Durdur",
    description: "maneuver.desc.fl09_comm_loss",
    mode: "parallel",
    steps: bscStop(),
  },

  fl10_maintenance_shutdown: {
    name: "fl10_maintenance_shutdown",
    label: "FL-10: Bakım Modu — Güvenli Kapatma",
    description: "maneuver.desc.fl10_maintenance_shutdown",
    mode: "sequential",
    steps: [...bscStop(), ...cbOpen()],
  },

  fl11_ground_fault: {
    name: "fl11_ground_fault",
    label: "FL-11: Toprak Direnci Hatası — Kapatma",
    description: "maneuver.desc.fl11_ground_fault",
    mode: "sequential",
    steps: [...bscStop(), ...cbOpen()],
  },

  fl_dc_breaker_close: {
    name: "fl_dc_breaker_close",
    label: "DC Kesici Kapat",
    description: "maneuver.desc.fl_dc_breaker_close",
    mode: "parallel",
    steps: cbClose(),
  },

  fl_contactor_close: {
    name: "fl_contactor_close",
    label: "Kontaktör Kapat",
    description: "maneuver.desc.fl_contactor_close",
    mode: "parallel",
    steps: BSC_IDS.map((id) => ({ deviceId: id, command: "contactor_close" })),
  },
};

export const MANEUVER_CONTROLS: Record<
  string,
  { inputs?: InputField[]; timer?: boolean; transform?: ManeuverTransform }
> = {
  fl_bsc_power: {
    inputs: [
      {
        name: "mode",
        label: "Mod",
        unit: "",
        min: 0,
        max: 1,
        step: 1,
        default: 0,
        type: "select",
        options: [
          { value: 0, label: "Şarj" },
          { value: 1, label: "Deşarj" },
        ],
      },
      {
        name: "powerKw",
        label: "Güç",
        unit: "kW",
        min: 0,
        max: 3568,
        step: 10,
        default: 50,
      },
    ],
    timer: true,
    transform: (values, steps) => {
      const command = values.mode === 0 ? "charge" : "discharge";
      return steps.map(() => ({ ...values, command }));
    },
  },
};
