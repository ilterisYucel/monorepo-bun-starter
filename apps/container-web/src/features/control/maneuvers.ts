import type { ManeuverConfig } from "@gd-monorepo/shared-types";
import type { InputField } from "@gd-monorepo/ui";

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

export const MANEUVERS: Record<string, ManeuverConfig> = {
  fl_charge: {
    name: "fl_charge",
    label: "Şarj",
    description: "BSC'leri şarj moduna alır. Güç (kW) parametresi ile çalışır.",
    mode: "parallel",
    steps: BSC_IDS.map((id) => ({ deviceId: id, command: "charge" })),
  },

  fl_charge_timed: {
    name: "fl_charge_timed",
    label: "Şarj (Zamanlı)",
    description: "BSC'leri şarj moduna alır, süre dolunca otomatik durdurur.",
    mode: "parallel",
    steps: BSC_IDS.map((id) => ({ deviceId: id, command: "charge" })),
  },

  fl_discharge: {
    name: "fl_discharge",
    label: "Deşarj",
    description:
      "BSC'leri deşarj moduna alır. Güç (kW) parametresi ile çalışır.",
    mode: "parallel",
    steps: BSC_IDS.map((id) => ({ deviceId: id, command: "discharge" })),
  },

  fl_discharge_timed: {
    name: "fl_discharge_timed",
    label: "Deşarj (Zamanlı)",
    description: "BSC'leri deşarj moduna alır, süre dolunca otomatik durdurur.",
    mode: "parallel",
    steps: BSC_IDS.map((id) => ({ deviceId: id, command: "discharge" })),
  },

  fl_idle: {
    name: "fl_idle",
    label: "Durdur",
    description: "Tüm BSC'lerde şarj/deşarj işlemini durdurur.",
    mode: "parallel",
    steps: bscStop(),
  },

  fl01_start: {
    name: "fl01_start",
    label: "FL-01: Sistem Başlatma",
    description:
      "DC switch'leri açar, BSC'leri başlatır, DC çıkışları aktif eder. Tüm adımlar paralel çalışır.",
    mode: "parallel",
    steps: [...cbOpen(), ...bscCharge(0), ...dcOn()],
  },

  fl02_aux_loss: {
    name: "fl02_aux_loss",
    label: "FL-02: AUX Kaybı — Acil Durdurma",
    description:
      "AUX enerjisi kesildiğinde: BSC'leri durdurur, DC çıkışları kapatır, DC switch'leri açar. Sıralı çalışır.",
    mode: "sequential",
    steps: [...bscStop(), ...dcOff(), ...cbOpen()],
  },

  fl03_emergency_stop: {
    name: "fl03_emergency_stop",
    label: "FL-03: Acil Durdurma (Emergency Stop)",
    description:
      "Acil durdurma butonu tetiklendiğinde tüm sistemi güvenli şekilde kapatır.",
    mode: "sequential",
    steps: [...bscStop(), ...dcOff(), ...cbOpen()],
  },

  fl04_calibration_charge: {
    name: "fl04_calibration_charge",
    label: "FL-04: Kalibrasyon — Şarj (0.25C)",
    description: "Kalibrasyon için BSC'leri 500 kW ile şarj moduna alır.",
    mode: "parallel",
    steps: bscCharge(500),
  },

  fl04_calibration_discharge: {
    name: "fl04_calibration_discharge",
    label: "FL-04: Kalibrasyon — Deşarj (0.25C)",
    description: "Kalibrasyon için BSC'leri 500 kW ile deşarj moduna alır.",
    mode: "parallel",
    steps: bscDischarge(500),
  },

  fl05_tms_cooling_force: {
    name: "fl05_tms_cooling_force",
    label: "FL-05: TMS — Soğutmayı Zorla (8 HVAC)",
    description:
      "Tüm HVAC ünitelerini soğutma moduna zorlar. Setpoint 1.0°C'ye çekilir.",
    mode: "parallel",
    steps: hvacCool(),
  },

  fl05_tms_heating_force: {
    name: "fl05_tms_heating_force",
    label: "FL-05: TMS — Isıtmayı Zorla (8 HVAC)",
    description:
      "Tüm HVAC ünitelerini ısıtma moduna zorlar. Setpoint 50°C'ye çekilir.",
    mode: "parallel",
    steps: hvacHeat(),
  },

  fl05_tms_block_charge: {
    name: "fl05_tms_block_charge",
    label: "FL-05: TMS — Termal Koruma Durdur",
    description:
      "Termal koruma tetiklendiğinde tüm BSC'lerde şarj/deşarj işlemini durdurur.",
    mode: "parallel",
    steps: bscStop(),
  },

  fl06_charge: {
    name: "fl06_charge",
    label: "FL-06: Şarj (Ön Kontrollü)",
    description:
      "DC switch'leri kapattıktan sonra BSC'leri şarj moduna alır. Herhangi bir adım başarısız olursa durur.",
    mode: "sequential",
    onFailure: "stop",
    steps: [...cbClose(), ...bscCharge(500)],
  },

  fl06_discharge: {
    name: "fl06_discharge",
    label: "FL-06: Deşarj (Ön Kontrollü)",
    description:
      "DC switch'leri kapattıktan sonra BSC'leri deşarj moduna alır. Herhangi bir adım başarısız olursa durur.",
    mode: "sequential",
    onFailure: "stop",
    steps: [...cbClose(), ...bscDischarge(500)],
  },

  fl07_door_open: {
    name: "fl07_door_open",
    label: "FL-07: Kapı Açık — Güvenlik Durdurma",
    description:
      "Kapı açıldığında güvenlik için tüm BSC'lerde şarj/deşarj işlemini durdurur.",
    mode: "parallel",
    steps: bscStop(),
  },

  fl08_dc_fault: {
    name: "fl08_dc_fault",
    label: "FL-08: DC Arıza — Koruma Kapatma",
    description:
      "DC barada aşırı gerilim/düşük gerilim/aşırı akım/aşırı güç durumunda BSC'leri durdurur ve DC switch'leri açar.",
    mode: "parallel",
    steps: [...bscStop(), ...cbOpen()],
  },

  fl09_comm_loss: {
    name: "fl09_comm_loss",
    label: "FL-09: İletişim Kaybı — Durdur",
    description:
      "PPC veya ekipman iletişimi kesildiğinde şarj/deşarj işlemini durdurur.",
    mode: "parallel",
    steps: bscStop(),
  },

  fl10_maintenance_shutdown: {
    name: "fl10_maintenance_shutdown",
    label: "FL-10: Bakım Modu — Güvenli Kapatma",
    description:
      "Bakım moduna geçişte BSC'leri durdurur, DC switch'leri açar. Sıralı çalışır.",
    mode: "sequential",
    steps: [...bscStop(), ...cbOpen()],
  },

  fl11_ground_fault: {
    name: "fl11_ground_fault",
    label: "FL-11: Toprak Direnci Hatası — Kapatma",
    description:
      "IMD izolasyon değeri idealin altına düştüğünde sistemi güvenli şekilde kapatır.",
    mode: "sequential",
    steps: [...bscStop(), ...cbOpen()],
  },
};

export const MANEUVER_CONTROLS: Record<
  string,
  { inputs?: InputField[]; timer?: boolean }
> = {
  fl_charge: {
    inputs: [
      {
        name: "powerKw",
        label: "Güç",
        unit: "kW",
        min: 0,
        max: 500,
        step: 10,
        default: 50,
      },
    ],
  },
  fl_charge_timed: {
    inputs: [
      {
        name: "powerKw",
        label: "Güç",
        unit: "kW",
        min: 0,
        max: 500,
        step: 10,
        default: 50,
      },
    ],
    timer: true,
  },
  fl_discharge: {
    inputs: [
      {
        name: "powerKw",
        label: "Güç",
        unit: "kW",
        min: 0,
        max: 500,
        step: 10,
        default: 50,
      },
    ],
  },
  fl_discharge_timed: {
    inputs: [
      {
        name: "powerKw",
        label: "Güç",
        unit: "kW",
        min: 0,
        max: 500,
        step: 10,
        default: 50,
      },
    ],
    timer: true,
  },
};
