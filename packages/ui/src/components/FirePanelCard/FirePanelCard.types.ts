export interface FirePanelState {
  fault: boolean; fire: boolean; firstStage: boolean; secondStage: boolean;
  discharged: boolean; extract: boolean; modeAuto: boolean;
  hold: boolean; abort: boolean; reset: boolean; localFire: boolean;
}

export interface FirePanelCardLabels {
  online: string;
  normal: string;
  warning: string;
  alarm: string;
  fireDetected: string;
  fireNone: string;
  faultExists: string;
  faultNone: string;
  firstStage: string;
  secondStage: string;
  discharged: string;
  extract: string;
  hold: string;
  abort: string;
  modeAuto: string;
  localFire: string;
  reset: string;
  detail: string;
}

export interface FirePanelCardProps {
  deviceId: string;
  state: FirePanelState;
  onDetailClick?: () => void;
  labels?: FirePanelCardLabels;
}
