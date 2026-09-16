import type { ManeuverConfig, CommandStep } from "@gd-monorepo/shared-types";
import type { InputField, ManeuverTransform } from "@gd-monorepo/ui";

/**
 * Saha manevra kataloğu — REV.01 (FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md).
 *
 * Konteyner başına TEK PCS: hedef listesi sabit DEĞİLDİR — `buildFieldManeuvers`
 * dışarıdan verilen pcsIds'ten adım üretir (N konteyner için ölçeklenir).
 *
 * Kartlar (manuel): FL-01 start/shutdown, FL-02 charge/discharge (grup seçimli,
 * santral gücü eşit dağıtım), FL-03 idle, FL-04 kalibrasyon (timer'lı),
 * FL-05 emergency stop, FL-11 maintenance.
 * GİZLİ (frontend'de GÖSTERİLMEZ — doküman kuralı): FL-06 recovery,
 * FL-07 communication loss, FL-10 islanding/grid loss — otomasyon katmanının
 * manevraları (R-06 vb. kuralların aksiyon referansı).
 */

export function stepsFor(command: string, pcsIds: string[]): CommandStep[] {
  return pcsIds.map((deviceId) => ({ deviceId, command }));
}

/** Frontend'de gösterilmeyen manevralar (REV.01 dokümanı: "göstermeyelim"). */
export const FIELD_HIDDEN_MANEUVER_NAMES: ReadonlySet<string> = new Set([
  "fl06_recovery",
  "fl07_comm_loss",
  "fl10_islanding",
]);

/** pcsIds hedef listesinden REV.01 manevra kataloğunu üretir. */
export function buildFieldManeuvers(
  pcsIds: string[],
): Record<string, ManeuverConfig> {
  return {
    fl01_startup: {
      name: "fl01_startup",
      label: "maneuver.fl01Startup",
      description: "maneuver.fl01StartupDesc",
      mode: "parallel",
      onFailure: "continue",
      steps: stepsFor("start", pcsIds),
      rollbackSteps: [],
    },
    fl01_shutdown: {
      name: "fl01_shutdown",
      label: "maneuver.fl01Shutdown",
      description: "maneuver.fl01ShutdownDesc",
      mode: "parallel",
      onFailure: "continue",
      steps: stepsFor("stop", pcsIds),
      rollbackSteps: [],
    },
    fl02_charge: {
      name: "fl02_charge",
      label: "maneuver.fl02Charge",
      description: "maneuver.fl02ChargeDesc",
      mode: "parallel",
      onFailure: "continue",
      steps: stepsFor("charge", pcsIds),
      rollbackSteps: stepsFor("stop", pcsIds),
    },
    fl02_discharge: {
      name: "fl02_discharge",
      label: "maneuver.fl02Discharge",
      description: "maneuver.fl02DischargeDesc",
      mode: "parallel",
      onFailure: "continue",
      steps: stepsFor("discharge", pcsIds),
      rollbackSteps: stepsFor("stop", pcsIds),
    },
    fl03_idle: {
      name: "fl03_idle",
      label: "maneuver.fl03Idle",
      description: "maneuver.fl03IdleDesc",
      mode: "parallel",
      onFailure: "continue",
      steps: stepsFor("set_power_zero", pcsIds),
      rollbackSteps: [],
    },
    fl04_calibration: {
      name: "fl04_calibration",
      label: "maneuver.fl04Calibration",
      description: "maneuver.fl04CalibrationDesc",
      mode: "parallel",
      onFailure: "continue",
      // PMS yaşam döngüsü: iç algoritma DC Block'ta — ön koşul olarak
      // PCS'ler standby'a alınır (idle ön şartı).
      steps: stepsFor("standby", pcsIds),
      rollbackSteps: [],
    },
    fl05_emergency_stop: {
      name: "fl05_emergency_stop",
      label: "maneuver.fl05EmergencyStop",
      description: "maneuver.fl05EmergencyStopDesc",
      mode: "parallel",
      onFailure: "continue",
      steps: stepsFor("stop", pcsIds),
      rollbackSteps: [],
    },
    fl11_maintenance: {
      name: "fl11_maintenance",
      label: "maneuver.fl11Maintenance",
      description: "maneuver.fl11MaintenanceDesc",
      mode: "parallel",
      onFailure: "continue",
      steps: stepsFor("stop", pcsIds),
      rollbackSteps: [],
    },
    // GİZLİ — otomasyon manevraları (UI'da gösterilmez; kural aksiyon
    // referansları + tanım tamlığı için katalogda bulunur).
    fl06_recovery: {
      name: "fl06_recovery",
      label: "maneuver.fl06Recovery",
      description: "maneuver.fl06RecoveryDesc",
      mode: "parallel",
      onFailure: "continue",
      steps: [...stepsFor("fault_reset", pcsIds), ...stepsFor("standby", pcsIds)],
      rollbackSteps: [],
    },
    fl07_comm_loss: {
      name: "fl07_comm_loss",
      label: "maneuver.fl07CommLoss",
      description: "maneuver.fl07CommLossDesc",
      mode: "parallel",
      onFailure: "continue",
      steps: stepsFor("stop", pcsIds),
      rollbackSteps: [],
    },
    fl10_islanding: {
      name: "fl10_islanding",
      label: "maneuver.fl10Islanding",
      description: "maneuver.fl10IslandingDesc",
      mode: "parallel",
      onFailure: "continue",
      steps: stepsFor("stop", pcsIds),
      rollbackSteps: [],
    },
  };
}

/** Manevra kartı girişleri (grup seçimi + güç + timer). */
export interface FieldManeuverControls {
  inputs?: InputField[];
  timerConfig?: boolean;
  transform?: ManeuverTransform;
}

/** REV.01 kart girişlerini üretir — grup seçenekleri dinamik pcsIds'ten.
 *  Grup seçimi sayısal İNDEKS taşır (-1 = santral seviyesi; 0..N-1 = pcsIds[i])
 *  — ManeuverCard girişleri sayısaldır (ui değişikliği gerekmez). */
export function buildFieldManeuverControls(
  pcsIds: string[],
): Record<string, FieldManeuverControls> {
  const groupOptions = [
    { value: -1, label: "maneuver.groupAll" },
    ...pcsIds.map((id, index) => ({ value: index, label: id })),
  ];

  const groupInput: InputField = {
    name: "group",
    label: "maneuver.group",
    unit: "",
    min: -1,
    max: Math.max(0, pcsIds.length - 1),
    step: 1,
    default: -1,
    type: "select",
    options: groupOptions,
  };

  const powerInput: InputField = {
    name: "powerKw",
    label: "maneuver.power",
    unit: "kW",
    min: 0,
    max: 1725,
    step: 10,
    default: 500,
    type: "number",
  };

  // Santral gücü → seçili adım sayısına eşit dağıtım (REV.01: online PCS'lere
  // bölünür; unavailable/fault PCS'ler dağıtım dışıdır — pcsIds zaten online
  // listesinden türetilir).
  const distribute = (
    values: Record<string, number>,
    steps: CommandStep[],
  ): Record<string, number>[] => {
    const perDevice = Math.floor(values["powerKw"]! / steps.length);
    return steps.map(() => ({ powerKw: perDevice }));
  };

  return {
    fl02_charge: { inputs: [groupInput, powerInput], transform: distribute },
    fl02_discharge: { inputs: [groupInput, powerInput], transform: distribute },
    fl04_calibration: { timerConfig: true },
  };
}

/**
 * Sorgu — grup seçimine göre adımları daraltır + transform'u uygular.
 * Grup değeri -1 (veya yok) = santral seviyesi: tüm adımlar; 0..N-1 = pcsIds[i].
 */
export function resolveSteps(
  maneuver: ManeuverConfig,
  values: Record<string, unknown>,
  transform: ManeuverTransform | undefined,
  pcsIds: string[] = [],
): CommandStep[] {
  const groupIdx = values["group"];
  let steps = maneuver.steps;
  if (
    typeof groupIdx === "number" &&
    groupIdx >= 0 &&
    groupIdx < pcsIds.length
  ) {
    const targetId = pcsIds[groupIdx]!;
    steps = steps.filter((s) => s.deviceId === targetId);
  }
  if (!transform || steps.length === 0) return steps;

  const params = transform(values as Record<string, number>, steps);
  return steps.map((step, i) => ({
    ...step,
    params: params[i] as Record<string, unknown> | undefined,
  }));
}
