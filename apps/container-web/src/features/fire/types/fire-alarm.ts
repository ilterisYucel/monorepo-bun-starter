export interface FireAlarmState {
  fault: boolean;
  fire: boolean;
  firstStage: boolean;
  secondStage: boolean;
  discharged: boolean;
  extract: boolean;
  modeAuto: boolean;
  hold: boolean;
  abort: boolean;
  reset: boolean;
  localFire: boolean;
  lastUpdated: string;
}

export interface FireAlarmCommand {
  name: "manual_release" | "hold" | "abort" | "mode_toggle";
  label: string;
  dangerous?: boolean;
}
