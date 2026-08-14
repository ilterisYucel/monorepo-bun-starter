export interface FirePanelData {
  fault: boolean;
  fire: boolean;
  firstStageAlarm: boolean;
  secondStageAlarm: boolean;
  discharged: boolean;
  extract: boolean;
  modeAuto: boolean;
  hold: boolean;
  abort: boolean;
}

export interface FirePanelConfig {
  step: number;
}

export interface FirePanelProps {
  data: FirePanelData;
  x: number;
  y: number;
  width: number;
  height: number;
  config: FirePanelConfig;
}
