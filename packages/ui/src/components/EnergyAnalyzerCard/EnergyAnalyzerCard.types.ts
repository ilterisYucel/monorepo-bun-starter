export interface EnergyAnalyzerPhase {
  voltageLN: number;
  voltageLL: number;
  current: number;
  activePower: number;
  reactivePower: number;
  apparentPower: number;
  powerFactor: number;
  thdCurrent: number;
  thdVoltage: number;
}

export interface EnergyAnalyzerSummary {
  deviceId: string;
  frequency: number;
  activeEnergyDelivered: number;
  neutralCurrent: number;
  demandPowerPresent: number;
  demandPowerPeak: number;
  demandCurrentPresent: number;
  reactiveEnergyDelivered: number;
  reactiveEnergyReceived: number;
  apparentEnergy: number;
  activeEnergyReceived: number;
  phaseA: EnergyAnalyzerPhase;
  phaseB: EnergyAnalyzerPhase;
  phaseC: EnergyAnalyzerPhase;
}

export interface EnergyAnalyzerCardLabels {
  online: string;
  frequency: string;
  activePower: string;
  energy: string;
  phaseA: string;
  phaseB: string;
  phaseC: string;
  voltageLN: string;
  voltageLL: string;
  current: string;
  reactivePower: string;
  apparentPower: string;
  powerFactor: string;
  thdCurrent: string;
  thdVoltage: string;
  neutral: string;
  demandPowerPresent: string;
  demandPowerPeak: string;
  demandCurrentPresent: string;
  reactiveEnergyDelivered: string;
  reactiveEnergyReceived: string;
  apparentEnergy: string;
  activeEnergyReceived: string;
  detail: string;
}

export interface EnergyAnalyzerCardProps {
  summary: EnergyAnalyzerSummary;
  totalActivePower: number;
  onDetailClick?: () => void;
  labels?: EnergyAnalyzerCardLabels;
}
