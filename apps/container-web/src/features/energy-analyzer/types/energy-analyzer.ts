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
  name: string;
  frequency: number;
  activeEnergyDelivered: number;
  activeEnergyReceived: number;
  reactiveEnergyDelivered: number;
  reactiveEnergyReceived: number;
  apparentEnergy: number;
  demandPowerPresent: number;
  demandPowerPeak: number;
  demandCurrentPresent: number;
  phaseA: EnergyAnalyzerPhase;
  phaseB: EnergyAnalyzerPhase;
  phaseC: EnergyAnalyzerPhase;
  neutralCurrent: number;
}
