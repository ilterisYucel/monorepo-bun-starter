// PM5340 Energy Analyzer Simulator — 3-phase power meter simulation
// Register adresleri resmi PM53xx Register List'e dayalı

import { INPUT } from "./register-map";

const randomFloat = (): number => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 0xFFFFFFFF;
};

const floatToRegisters = (value: number): [number, number] => {
  const buffer = Buffer.alloc(4);
  buffer.writeFloatBE(value, 0);
  return [buffer.readUInt16BE(0), buffer.readUInt16BE(2)];
};

interface PhaseValues {
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

interface EnergyAnalyzerState {
  phaseA: PhaseValues;
  phaseB: PhaseValues;
  phaseC: PhaseValues;
  neutralCurrent: number;
  frequency: number;
  activeEnergyDeliveredKwh: number;
  activeEnergyReceivedKwh: number;
  reactiveEnergyDeliveredKvarh: number;
  reactiveEnergyReceivedKvarh: number;
  apparentEnergyDeliveredKvah: number;
  demandPowerPresent: number;
  demandPowerPeak: number;
  demandCurrentPresent: number;
}

function createPhase(baseCurrent: number): PhaseValues {
  return {
    voltageLN: 230.0,
    voltageLL: 400.0,
    current: baseCurrent,
    activePower: 0,
    reactivePower: 0,
    apparentPower: 0,
    powerFactor: 0.90,
    thdCurrent: 3.0,
    thdVoltage: 2.0,
  };
}

function defaultState(): EnergyAnalyzerState {
  return {
    phaseA: createPhase(120),
    phaseB: createPhase(115),
    phaseC: createPhase(125),
    neutralCurrent: 8,
    frequency: 50.0,
    activeEnergyDeliveredKwh: 15750,
    activeEnergyReceivedKwh: 120,
    reactiveEnergyDeliveredKvarh: 4800,
    reactiveEnergyReceivedKvarh: 60,
    apparentEnergyDeliveredKvah: 17200,
    demandPowerPresent: 75,
    demandPowerPeak: 85,
    demandCurrentPresent: 120,
  };
}

function fluctuate(base: number, amplitude: number): number {
  return base + (randomFloat() - 0.5) * amplitude * 2;
}

function updatePhase(p: PhaseValues, baseCurrent: number, secs: number): void {
  p.voltageLN += (fluctuate(230, 3) - p.voltageLN) * 0.3 * secs;
  p.voltageLL = p.voltageLN * Math.sqrt(3) * (1 + (randomFloat() - 0.5) * 0.006);
  p.current += (fluctuate(baseCurrent, 8) - p.current) * 0.25 * secs;
  const pf = 0.85 + randomFloat() * 0.1;
  p.powerFactor = pf;
  p.activePower = p.voltageLN * p.current * pf / 1000;
  p.reactivePower = p.voltageLN * p.current * Math.sin(Math.acos(pf)) / 1000;
  p.apparentPower = Math.sqrt(p.activePower ** 2 + p.reactivePower ** 2);
  p.thdCurrent += (2.0 + randomFloat() * 5.0 - p.thdCurrent) * 0.15 * secs;
  p.thdVoltage += (1.0 + randomFloat() * 2.0 - p.thdVoltage) * 0.1 * secs;
}

export class EnergyAnalyzerSimulator {
  private state: EnergyAnalyzerState;

  constructor() {
    this.state = defaultState();
  }

  tick(elapsedSeconds: number): void {
    const s = this.state;
    const secs = Math.min(elapsedSeconds, 5);

    updatePhase(s.phaseA, 120, secs);
    updatePhase(s.phaseB, 115, secs);
    updatePhase(s.phaseC, 125, secs);

    const totalI = s.phaseA.current + s.phaseB.current + s.phaseC.current;
    s.neutralCurrent += (Math.abs(s.phaseA.current - s.phaseB.current + s.phaseC.current) * 0.15 - s.neutralCurrent) * 0.2 * secs;

    s.frequency += (50.0 + (randomFloat() - 0.5) * 0.1 - s.frequency) * 0.3 * secs;

    const totalP = s.phaseA.activePower + s.phaseB.activePower + s.phaseC.activePower;
    const totalQ = s.phaseA.reactivePower + s.phaseB.reactivePower + s.phaseC.reactivePower;
    const totalS = s.phaseA.apparentPower + s.phaseB.apparentPower + s.phaseC.apparentPower;

    const hoursElapsed = secs / 3600;
    s.activeEnergyDeliveredKwh += Math.max(0, totalP) * hoursElapsed;
    s.activeEnergyReceivedKwh += Math.max(0, -totalP) * hoursElapsed * 0.05;
    s.reactiveEnergyDeliveredKvarh += Math.max(0, totalQ) * hoursElapsed;
    s.reactiveEnergyReceivedKvarh += Math.max(0, -totalQ) * hoursElapsed * 0.02;
    s.apparentEnergyDeliveredKvah += totalS * hoursElapsed;

    s.demandPowerPresent += (totalP * (0.9 + randomFloat() * 0.2) - s.demandPowerPresent) * 0.1 * secs;
    s.demandPowerPeak = Math.max(s.demandPowerPeak, s.demandPowerPresent);
    s.demandCurrentPresent += (totalI * 0.33 - s.demandCurrentPresent) * 0.1 * secs;
  }

  readInputRegister(address: number): number {
    const s = this.state;
    const f = floatToRegisters;

    switch (address) {
      case INPUT.CURRENT_A:     return f(s.phaseA.current)[0];
      case INPUT.CURRENT_A + 1: return f(s.phaseA.current)[1];
      case INPUT.CURRENT_B:     return f(s.phaseB.current)[0];
      case INPUT.CURRENT_B + 1: return f(s.phaseB.current)[1];
      case INPUT.CURRENT_C:     return f(s.phaseC.current)[0];
      case INPUT.CURRENT_C + 1: return f(s.phaseC.current)[1];
      case INPUT.CURRENT_N:     return f(s.neutralCurrent)[0];
      case INPUT.CURRENT_N + 1: return f(s.neutralCurrent)[1];
      case INPUT.CURRENT_G:     return f(0)[0];
      case INPUT.CURRENT_G + 1: return f(0)[1];
      case INPUT.CURRENT_AVG:     return f((s.phaseA.current + s.phaseB.current + s.phaseC.current) / 3)[0];
      case INPUT.CURRENT_AVG + 1: return f((s.phaseA.current + s.phaseB.current + s.phaseC.current) / 3)[1];

      case INPUT.CURRENT_UNBAL_A:     return f(fluctuate(5, 3))[0];
      case INPUT.CURRENT_UNBAL_A + 1: return f(fluctuate(5, 3))[1];
      case INPUT.CURRENT_UNBAL_B:     return f(fluctuate(5, 3))[0];
      case INPUT.CURRENT_UNBAL_B + 1: return f(fluctuate(5, 3))[1];
      case INPUT.CURRENT_UNBAL_C:     return f(fluctuate(5, 3))[0];
      case INPUT.CURRENT_UNBAL_C + 1: return f(fluctuate(5, 3))[1];
      case INPUT.CURRENT_UNBAL_WORST:     return f(fluctuate(8, 4))[0];
      case INPUT.CURRENT_UNBAL_WORST + 1: return f(fluctuate(8, 4))[1];

      case INPUT.VOLTAGE_LL_AB:   return f(s.phaseA.voltageLL)[0];
      case INPUT.VOLTAGE_LL_AB + 1: return f(s.phaseA.voltageLL)[1];
      case INPUT.VOLTAGE_LL_BC:   return f(s.phaseB.voltageLL)[0];
      case INPUT.VOLTAGE_LL_BC + 1: return f(s.phaseB.voltageLL)[1];
      case INPUT.VOLTAGE_LL_CA:   return f(s.phaseC.voltageLL)[0];
      case INPUT.VOLTAGE_LL_CA + 1: return f(s.phaseC.voltageLL)[1];
      case INPUT.VOLTAGE_LL_AVG:     return f((s.phaseA.voltageLL + s.phaseB.voltageLL + s.phaseC.voltageLL) / 3)[0];
      case INPUT.VOLTAGE_LL_AVG + 1: return f((s.phaseA.voltageLL + s.phaseB.voltageLL + s.phaseC.voltageLL) / 3)[1];

      case INPUT.VOLTAGE_LN_A:   return f(s.phaseA.voltageLN)[0];
      case INPUT.VOLTAGE_LN_A + 1: return f(s.phaseA.voltageLN)[1];
      case INPUT.VOLTAGE_LN_B:   return f(s.phaseB.voltageLN)[0];
      case INPUT.VOLTAGE_LN_B + 1: return f(s.phaseB.voltageLN)[1];
      case INPUT.VOLTAGE_LN_C:   return f(s.phaseC.voltageLN)[0];
      case INPUT.VOLTAGE_LN_C + 1: return f(s.phaseC.voltageLN)[1];
      case INPUT.VOLTAGE_LN_AVG:     return f((s.phaseA.voltageLN + s.phaseB.voltageLN + s.phaseC.voltageLN) / 3)[0];
      case INPUT.VOLTAGE_LN_AVG + 1: return f((s.phaseA.voltageLN + s.phaseB.voltageLN + s.phaseC.voltageLN) / 3)[1];

      case INPUT.ACTIVE_POWER_A:   return f(s.phaseA.activePower)[0];
      case INPUT.ACTIVE_POWER_A + 1: return f(s.phaseA.activePower)[1];
      case INPUT.ACTIVE_POWER_B:   return f(s.phaseB.activePower)[0];
      case INPUT.ACTIVE_POWER_B + 1: return f(s.phaseB.activePower)[1];
      case INPUT.ACTIVE_POWER_C:   return f(s.phaseC.activePower)[0];
      case INPUT.ACTIVE_POWER_C + 1: return f(s.phaseC.activePower)[1];
      case INPUT.ACTIVE_POWER_TOTAL:     return f(s.phaseA.activePower + s.phaseB.activePower + s.phaseC.activePower)[0];
      case INPUT.ACTIVE_POWER_TOTAL + 1: return f(s.phaseA.activePower + s.phaseB.activePower + s.phaseC.activePower)[1];

      case INPUT.REACTIVE_POWER_A:   return f(s.phaseA.reactivePower)[0];
      case INPUT.REACTIVE_POWER_A + 1: return f(s.phaseA.reactivePower)[1];
      case INPUT.REACTIVE_POWER_B:   return f(s.phaseB.reactivePower)[0];
      case INPUT.REACTIVE_POWER_B + 1: return f(s.phaseB.reactivePower)[1];
      case INPUT.REACTIVE_POWER_C:   return f(s.phaseC.reactivePower)[0];
      case INPUT.REACTIVE_POWER_C + 1: return f(s.phaseC.reactivePower)[1];
      case INPUT.REACTIVE_POWER_TOTAL:     return f(s.phaseA.reactivePower + s.phaseB.reactivePower + s.phaseC.reactivePower)[0];
      case INPUT.REACTIVE_POWER_TOTAL + 1: return f(s.phaseA.reactivePower + s.phaseB.reactivePower + s.phaseC.reactivePower)[1];

      case INPUT.APPARENT_POWER_A:   return f(s.phaseA.apparentPower)[0];
      case INPUT.APPARENT_POWER_A + 1: return f(s.phaseA.apparentPower)[1];
      case INPUT.APPARENT_POWER_B:   return f(s.phaseB.apparentPower)[0];
      case INPUT.APPARENT_POWER_B + 1: return f(s.phaseB.apparentPower)[1];
      case INPUT.APPARENT_POWER_C:   return f(s.phaseC.apparentPower)[0];
      case INPUT.APPARENT_POWER_C + 1: return f(s.phaseC.apparentPower)[1];
      case INPUT.APPARENT_POWER_TOTAL:     return f(s.phaseA.apparentPower + s.phaseB.apparentPower + s.phaseC.apparentPower)[0];
      case INPUT.APPARENT_POWER_TOTAL + 1: return f(s.phaseA.apparentPower + s.phaseB.apparentPower + s.phaseC.apparentPower)[1];

      case INPUT.PF_A:   return f(s.phaseA.powerFactor)[0];
      case INPUT.PF_A + 1: return f(s.phaseA.powerFactor)[1];
      case INPUT.PF_B:   return f(s.phaseB.powerFactor)[0];
      case INPUT.PF_B + 1: return f(s.phaseB.powerFactor)[1];
      case INPUT.PF_C:   return f(s.phaseC.powerFactor)[0];
      case INPUT.PF_C + 1: return f(s.phaseC.powerFactor)[1];
      case INPUT.PF_TOTAL: {
        const totalActive = s.phaseA.activePower + s.phaseB.activePower + s.phaseC.activePower;
        const totalApparent = s.phaseA.apparentPower + s.phaseB.apparentPower + s.phaseC.apparentPower;
        const totalPf = totalApparent > 0.01 ? totalActive / totalApparent : 0;
        return f(totalPf)[0];
      }
      case INPUT.PF_TOTAL + 1: {
        const totalActive = s.phaseA.activePower + s.phaseB.activePower + s.phaseC.activePower;
        const totalApparent = s.phaseA.apparentPower + s.phaseB.apparentPower + s.phaseC.apparentPower;
        const totalPf = totalApparent > 0.01 ? totalActive / totalApparent : 0;
        return f(totalPf)[1];
      }

      case INPUT.FREQUENCY:     return f(s.frequency)[0];
      case INPUT.FREQUENCY + 1: return f(s.frequency)[1];

      case INPUT.ACTIVE_ENERGY_DELIVERED:     return f(s.activeEnergyDeliveredKwh)[0];
      case INPUT.ACTIVE_ENERGY_DELIVERED + 1: return f(s.activeEnergyDeliveredKwh)[1];
      case INPUT.ACTIVE_ENERGY_RECEIVED:     return f(s.activeEnergyReceivedKwh)[0];
      case INPUT.ACTIVE_ENERGY_RECEIVED + 1: return f(s.activeEnergyReceivedKwh)[1];
      case INPUT.REACTIVE_ENERGY_DELIVERED:     return f(s.reactiveEnergyDeliveredKvarh)[0];
      case INPUT.REACTIVE_ENERGY_DELIVERED + 1: return f(s.reactiveEnergyDeliveredKvarh)[1];
      case INPUT.REACTIVE_ENERGY_RECEIVED:     return f(s.reactiveEnergyReceivedKvarh)[0];
      case INPUT.REACTIVE_ENERGY_RECEIVED + 1: return f(s.reactiveEnergyReceivedKvarh)[1];
      case INPUT.APPARENT_ENERGY_DELIVERED:     return f(s.apparentEnergyDeliveredKvah)[0];
      case INPUT.APPARENT_ENERGY_DELIVERED + 1: return f(s.apparentEnergyDeliveredKvah)[1];

      case INPUT.THD_I_A:   return f(s.phaseA.thdCurrent)[0];
      case INPUT.THD_I_A + 1: return f(s.phaseA.thdCurrent)[1];
      case INPUT.THD_I_B:   return f(s.phaseB.thdCurrent)[0];
      case INPUT.THD_I_B + 1: return f(s.phaseB.thdCurrent)[1];
      case INPUT.THD_I_C:   return f(s.phaseC.thdCurrent)[0];
      case INPUT.THD_I_C + 1: return f(s.phaseC.thdCurrent)[1];
      case INPUT.THD_I_N:     return f(s.neutralCurrent * 0.02)[0];
      case INPUT.THD_I_N + 1: return f(s.neutralCurrent * 0.02)[1];

      case INPUT.THD_V_AB:   return f(s.phaseA.thdVoltage)[0];
      case INPUT.THD_V_AB + 1: return f(s.phaseA.thdVoltage)[1];
      case INPUT.THD_V_BC:   return f(s.phaseB.thdVoltage)[0];
      case INPUT.THD_V_BC + 1: return f(s.phaseB.thdVoltage)[1];
      case INPUT.THD_V_CA:   return f(s.phaseC.thdVoltage)[0];
      case INPUT.THD_V_CA + 1: return f(s.phaseC.thdVoltage)[1];
      case INPUT.THD_V_AN:   return f(s.phaseA.thdVoltage)[0];
      case INPUT.THD_V_AN + 1: return f(s.phaseA.thdVoltage)[1];
      case INPUT.THD_V_BN:   return f(s.phaseB.thdVoltage)[0];
      case INPUT.THD_V_BN + 1: return f(s.phaseB.thdVoltage)[1];
      case INPUT.THD_V_CN:   return f(s.phaseC.thdVoltage)[0];
      case INPUT.THD_V_CN + 1: return f(s.phaseC.thdVoltage)[1];

      case INPUT.DEMAND_POWER_PRESENT:     return f(s.demandPowerPresent)[0];
      case INPUT.DEMAND_POWER_PRESENT + 1: return f(s.demandPowerPresent)[1];
      case INPUT.DEMAND_POWER_PEAK:     return f(s.demandPowerPeak)[0];
      case INPUT.DEMAND_POWER_PEAK + 1: return f(s.demandPowerPeak)[1];
      case INPUT.DEMAND_CURRENT_PRESENT:     return f(s.demandCurrentPresent)[0];
      case INPUT.DEMAND_CURRENT_PRESENT + 1: return f(s.demandCurrentPresent)[1];

      default: return 0;
    }
  }

  readHoldingRegister(address: number): number {
    return this.readInputRegister(address);
  }

  writeHoldingRegister(_address: number, _value: number): void {}

  readCoil(_address: number): boolean {
    return false;
  }

  writeCoil(_address: number, _value: boolean): void {}

  readDiscreteInput(_address: number): boolean {
    return false;
  }
}
