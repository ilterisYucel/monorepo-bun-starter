import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { FirePanelSummary } from "../types/fire-panel";

export function telemetriesToFirePanelSummary(
  telemetries: TelemetryData[],
): FirePanelSummary {
  const findBoolean = (name: string): boolean => {
    const t = telemetries.find((x) => x.name === name);
    if (!t) return false;
    return t.value === 1 || t.value === true;
  };

  return {
    fault: findBoolean("Fault"),
    fire: findBoolean("Fire"),
    firstStageAlarm: findBoolean("1st Stage Alarm"),
    secondStageAlarm: findBoolean("2nd Stage Alarm"),
    discharged: findBoolean("Discharged"),
    extract: findBoolean("Extract"),
    modeAuto: findBoolean("Mode Auto"),
    hold: findBoolean("Hold"),
    abort: findBoolean("Abort"),
  };
}
