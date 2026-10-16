import { describe, it, expect } from "vitest";
import { FssSimulator } from "./fss-simulator";
import { COILS, DISCRETE, INPUT, PANEL_STATUS, ZONE_STATE } from "./register-map";

describe("FssSimulator (UC-10)", () => {
  it("AK-10.1: başlangıç sağlıklı panel", () => {
    const fss = new FssSimulator();
    expect(fss.readInputRegister(INPUT.PANEL_STATUS)).toBe(PANEL_STATUS.NORMAL);
    expect(fss.readInputRegister(INPUT.FIRST_STAGE)).toBe(0);
    expect(fss.readInputRegister(INPUT.RELEASED)).toBe(0);
    expect(fss.readDiscreteInput(DISCRETE.SYSTEM_OK)).toBe(true);
  });

  it("AK-10.1: 1 zone → first stage + countdown; 2 zone → second stage", () => {
    const fss = new FssSimulator({ releaseDelayS: 30 });
    fss.injectZoneFire(0, true);
    expect(fss.readInputRegister(INPUT.FIRST_STAGE)).toBe(1);
    expect(fss.readInputRegister(INPUT.SECOND_STAGE)).toBe(0);
    expect(fss.readInputRegister(INPUT.COUNTDOWN)).toBe(30);
    fss.injectZoneFire(1, true);
    expect(fss.readInputRegister(INPUT.SECOND_STAGE)).toBe(1);
  });

  it("AK-10.1: countdown dolar → released (EEE)", () => {
    const fss = new FssSimulator({ releaseDelayS: 5 });
    fss.injectZoneFire(0, true);
    fss.tick(5);
    expect(fss.readInputRegister(INPUT.RELEASED)).toBe(1);
    expect(fss.readDiscreteInput(DISCRETE.DISCHARGED)).toBe(true);
    expect(fss.readInputRegister(INPUT.VENTS_OPEN)).toBe(1);
  });

  it("manual mode → otomatik release YOK", () => {
    const fss = new FssSimulator({ releaseDelayS: 5 });
    fss.writeCoil(COILS.MODE_MANUAL, true);
    fss.injectZoneFire(0, true);
    fss.tick(10);
    expect(fss.readInputRegister(INPUT.RELEASED)).toBe(0);
    expect(fss.readInputRegister(INPUT.MODE)).toBe(1);
  });

  it("gaz alarmı → tahliye + havalandırma açılır", () => {
    const fss = new FssSimulator({ h2AlarmLEL: 10 });
    fss.injectGasAlarm(0, true);
    expect(fss.readInputRegister(INPUT.EXTRACT_FAN)).toBe(1);
    expect(fss.readInputRegister(INPUT.VENTILATION)).toBe(1);
    expect(fss.readInputRegister(INPUT.DET1_H2_LEL)).toBe(150);
  });

  it("reset → sağlıklıya döner; bilinmeyen adres 0/false", () => {
    const fss = new FssSimulator();
    fss.injectZoneFire(0, true);
    fss.writeCoil(COILS.RESET, true);
    expect(fss.readInputRegister(INPUT.PANEL_STATUS)).toBe(PANEL_STATUS.NORMAL);
    expect(fss.readInputRegister(9999)).toBe(0);
    expect(fss.readCoil(9999)).toBe(false);
    expect(fss.readDiscreteInput(9999)).toBe(false);
  });

  it("zone state'i fire/normal arasında geçer", () => {
    const fss = new FssSimulator();
    fss.injectZoneFire(2, true);
    expect(fss.readInputRegister(INPUT.ZONE_3_STATE)).toBe(ZONE_STATE.FIRE);
    fss.injectZoneFire(2, false);
    expect(fss.readInputRegister(INPUT.ZONE_3_STATE)).toBe(ZONE_STATE.NORMAL);
  });

  it("disablement register'ları ayarlanır", () => {
    const fss = new FssSimulator();
    expect(fss.readInputRegister(INPUT.DISABLE_EXTRACT)).toBe(0);
    fss.setDisablement("dE", true);
    fss.setDisablement("db", true);
    expect(fss.readInputRegister(INPUT.DISABLE_EXTRACT)).toBe(1);
    expect(fss.readInputRegister(INPUT.DISABLE_SOUNDERS)).toBe(1);
    expect(fss.readInputRegister(INPUT.DISABLE_MANUAL)).toBe(0);
  });
});
