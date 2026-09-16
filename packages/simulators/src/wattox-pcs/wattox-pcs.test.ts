import { describe, it, expect } from "vitest";
import { WattoxPcsSimulator } from "./simulator";
import {
  REG_RATED_POWER,
  REG_RATED_VOLTAGE,
  REG_RATED_CURRENT,
  REG_MAX_CHARGE_POWER,
  REG_MAX_DISCHARGE_POWER,
  REG_OP_STATUS,
  REG_FAULT_STATUS,
  REG_ALARM_STATUS,
  REG_CHARGING_STATUS,
  REG_DISCHARGING_STATUS,
  REG_BATTERY_VOLTAGE,
  REG_GRID_FREQUENCY,
  REG_GRID_ACTIVE_POWER,
  REG_GRID_V_AB,
  REG_ESTOP_BUTTON,
  REG_INSULATION_1,
  BMS_BASE,
  BMS_SOC,
  BMS_TOTAL_VOLTAGE,
  FAULT_WORD_1,
  ALARM_WORD_1,
  SET_COMMAND_SOURCE,
  SET_ACTIVE_POWER,
  SET_START,
  SET_STOP,
  SET_STANDBY,
  SET_FAULT_RESET,
  OP_STOP,
  OP_STANDBY,
  OP_CHARGING,
  OP_DISCHARGING,
  OP_FAULT,
} from "./register-map";
import { WattoxPcsAdapter } from "./modbus-adapter";

/**
 * WattoxPcsSimulator sözleşmesi (PCS-WATTOX-MIMARISI §5, T-P4):
 *
 * - Register-accurate: §3 tablolarındaki adreslerden okunur; ilk değerler
 *   nominal (Stop durumu, 50 Hz, nominal şebeke voltajı).
 * - Durum makinesi: Stop → (start) → Standby → (setpoint) → Charge(neg)/
 *   Discharge(pos); stop → Stop + setpoint 0; standby → Standby.
 * - Komut yazımları ANINDA uygulanır (validate read-back tick beklemez —
 *   AGENTS simülatör kuralı): setpoint yazılınca grid aktif güç birebir
 *   setpoint olur; işaret konvansiyonu ŞARJ NEGATİF.
 * - Fault word'leri set edilince fault durumu + opStatus Fault; fault reset
 *   sözcükleri temizler + Standby'a döndürür. Alarm word'leri alarm durumunu
 *   set eder.
 * - E-stop bitleri API ile set edilir (local/remote/BMS).
 * - EMS yüzü BMS bloğunu DEĞİŞTİREMEZ (RO); BMS port tarafı (Faz 2)
 *   `setBmsRegister` ile yazar.
 * - Yan etki: yalnızca kendi register durumu.
 */

function toInt16(v: number): number {
  return v >= 0x8000 ? v - 0x10000 : v;
}

describe("WattoxPcsSimulator", () => {
  it("ilk değerler: nominal (Stop, 50 Hz, anma güç, şebeke voltajı)", () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);

    return expect(
      Promise.all([
        a.readInputRegister(REG_RATED_POWER),
        a.readInputRegister(REG_RATED_VOLTAGE),
        a.readInputRegister(REG_RATED_CURRENT),
        a.readInputRegister(REG_OP_STATUS),
        a.readInputRegister(REG_GRID_FREQUENCY),
        a.readInputRegister(REG_GRID_V_AB),
        a.readInputRegister(REG_FAULT_STATUS),
        a.readInputRegister(REG_ALARM_STATUS),
        a.readInputRegister(REG_MAX_CHARGE_POWER),
        a.readInputRegister(REG_MAX_DISCHARGE_POWER),
        a.readInputRegister(REG_BATTERY_VOLTAGE),
        a.readInputRegister(REG_INSULATION_1),
      ]),
    ).resolves.toEqual([
      1725, // anma güç kW
      1500, // anma voltaj V
      1900, // anma akım A (varsayılan)
      OP_STOP,
      5000, // 50.00 Hz
      4000, // 400.0 V
      0,
      0,
      63811, // maks şarj gücü raw (S16: 63811 → −1725 kW)
      1725,
      15000, // 1500.0 V
      1000, // izolasyon 1000 kΩ
    ]);
  });

  it("start komutu: Stop → Standby; komut register'ı yazılanı tutar", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    await a.writeHoldingRegister(SET_START, 1);
    expect(await a.readInputRegister(REG_OP_STATUS)).toBe(OP_STANDBY);
    expect(await a.readHoldingRegister(SET_START)).toBe(1);
  });

  it("negatif setpoint → Charging; grid aktif güç birebir setpoint (şarj negatif)", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    await a.writeHoldingRegister(SET_START, 1);
    await a.writeHoldingRegister(SET_ACTIVE_POWER, toInt16(-500));
    expect(await a.readInputRegister(REG_OP_STATUS)).toBe(OP_CHARGING);
    expect(toInt16(await a.readInputRegister(REG_GRID_ACTIVE_POWER))).toBe(-500);
    expect(await a.readInputRegister(REG_CHARGING_STATUS)).toBe(1);
    expect(await a.readInputRegister(REG_DISCHARGING_STATUS)).toBe(0);
  });

  it("pozitif setpoint → Discharging", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    await a.writeHoldingRegister(SET_START, 1);
    await a.writeHoldingRegister(SET_ACTIVE_POWER, 800);
    expect(await a.readInputRegister(REG_OP_STATUS)).toBe(OP_DISCHARGING);
    expect(await a.readInputRegister(REG_DISCHARGING_STATUS)).toBe(1);
  });

  it("sıfır setpoint → Standby (sıfır güç)", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    await a.writeHoldingRegister(SET_START, 1);
    await a.writeHoldingRegister(SET_ACTIVE_POWER, toInt16(-500));
    await a.writeHoldingRegister(SET_ACTIVE_POWER, 0);
    expect(await a.readInputRegister(REG_OP_STATUS)).toBe(OP_STANDBY);
    expect(toInt16(await a.readInputRegister(REG_GRID_ACTIVE_POWER))).toBe(0);
  });

  it("stop komutu: Stop + setpoint sıfırlanır", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    await a.writeHoldingRegister(SET_START, 1);
    await a.writeHoldingRegister(SET_ACTIVE_POWER, 800);
    await a.writeHoldingRegister(SET_STOP, 1);
    expect(await a.readInputRegister(REG_OP_STATUS)).toBe(OP_STOP);
    expect(toInt16(await a.readInputRegister(REG_GRID_ACTIVE_POWER))).toBe(0);
  });

  it("standby komutu: herhangi bir işletme durumundan Standby", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    await a.writeHoldingRegister(SET_START, 1);
    await a.writeHoldingRegister(SET_ACTIVE_POWER, 800);
    await a.writeHoldingRegister(SET_STANDBY, 1);
    expect(await a.readInputRegister(REG_OP_STATUS)).toBe(OP_STANDBY);
  });

  it("fault set → fault durumu + Fault; reset → temiz + Standby", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    sim.setFaultWord(1, 1 << 5); // word1 bit5: BMS system fault
    expect(await a.readInputRegister(REG_FAULT_STATUS)).toBe(1);
    expect(await a.readInputRegister(REG_OP_STATUS)).toBe(OP_FAULT);
    await a.writeHoldingRegister(SET_FAULT_RESET, 1);
    expect(await a.readInputRegister(REG_FAULT_STATUS)).toBe(0);
    expect(await a.readInputRegister(REG_OP_STATUS)).toBe(OP_STANDBY);
  });

  it("alarm word 3 bit9 (islanding) → alarm durumu 1", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    sim.setAlarmWord(3, 1 << 9);
    expect(await a.readInputRegister(REG_ALARM_STATUS)).toBe(1);
    expect(await a.readInputRegister(ALARM_WORD_1 + 2)).toBe(1 << 9);
  });

  it("fault word adresleri D01-D10 sıralı okunur", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    sim.setFaultWord(10, 0x1234);
    expect(await a.readInputRegister(FAULT_WORD_1 + 9)).toBe(0x1234);
  });

  it("E-stop bitleri: local/remote/BMS", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    sim.setEstop({ local: true, remote: false, bms: true });
    expect(await a.readInputRegister(REG_ESTOP_BUTTON)).toBe(0b101);
  });

  it("EMS yüzü BMS bloğunu değiştiremez (RO); setBmsRegister yazar", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    const initial = await a.readInputRegister(BMS_SOC);
    await a.writeHoldingRegister(BMS_SOC, 9999);
    expect(await a.readInputRegister(BMS_SOC)).toBe(initial);

    sim.setBmsRegister(BMS_SOC, 8720);
    expect(await a.readInputRegister(BMS_SOC)).toBe(8720);
  });

  it("BMS bloğu dışına setBmsRegister reddedilir (throw)", () => {
    const sim = new WattoxPcsSimulator({});
    expect(() => sim.setBmsRegister(BMS_BASE - 1, 1)).toThrow();
    expect(() => sim.setBmsRegister(BMS_BASE + 23, 1)).toThrow();
  });

  it("komut kaynağı register'ı yazılabilir (EMS=1)", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    await a.writeHoldingRegister(SET_COMMAND_SOURCE, 1);
    expect(await a.readHoldingRegister(SET_COMMAND_SOURCE)).toBe(1);
  });

  it("tick: güç setpoint'e yakınsar (anında uygulama — tick kararlı kalır)", () => {
    const sim = new WattoxPcsSimulator({});
    sim.tick(1);
    const a = new WattoxPcsAdapter(sim);
    return expect(a.readInputRegister(REG_OP_STATUS)).resolves.toBe(OP_STOP);
  });

  it("BMS varsayılanları: SOC %50.0, pack voltaj 1500.0 V", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    expect(await a.readInputRegister(BMS_SOC)).toBe(500);
    expect(await a.readInputRegister(BMS_TOTAL_VOLTAGE)).toBe(15000);
  });

  it("çoklu register okuma (FC 0x03 aralığı)", async () => {
    const sim = new WattoxPcsSimulator({});
    const a = new WattoxPcsAdapter(sim);
    const words = await a.readInputRegisters(REG_GRID_V_AB, 3);
    expect(words).toEqual([4000, 4000, 4000]);
  });
});
