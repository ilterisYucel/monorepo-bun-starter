import { describe, it, expect, beforeEach } from "vitest";
import { ControlPanelIoSimulator } from "./index";
import { COILS, DISCRETE } from "./register-map";

describe("ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5)", () => {
  let sim: ControlPanelIoSimulator;

  beforeEach(() => {
    sim = new ControlPanelIoSimulator();
  });

  describe("initial state", () => {
    it("kapılar kapalı, ışıklar sönük başlar", () => {
      expect(sim.readDiscreteInput(DISCRETE.BATTERY_DOOR_OPEN)).toBe(false);
      expect(sim.readDiscreteInput(DISCRETE.PANEL_DOOR_OPEN)).toBe(false);
      expect(sim.readCoil(COILS.BATTERY_LIGHT)).toBe(false);
      expect(sim.readCoil(COILS.PANEL_LIGHT)).toBe(false);
    });

    it("FSS sağlıklı başlar: System OK=true, Fault/Discharged/2nd=false", () => {
      expect(sim.readDiscreteInput(DISCRETE.FSS_SYSTEM_OK)).toBe(true);
      expect(sim.readDiscreteInput(DISCRETE.FSS_FAULT)).toBe(false);
      expect(sim.readDiscreteInput(DISCRETE.FSS_DISCHARGED)).toBe(false);
      expect(sim.readDiscreteInput(DISCRETE.FSS_2ND_STAGE)).toBe(false);
    });
  });

  describe("kapı state (demo senaryo API)", () => {
    it("setDoorState batarya kapısını açar", () => {
      sim.setDoorState({ batteryOpen: true, panelOpen: false });
      expect(sim.readDiscreteInput(DISCRETE.BATTERY_DOOR_OPEN)).toBe(true);
      expect(sim.readDiscreteInput(DISCRETE.PANEL_DOOR_OPEN)).toBe(false);
    });

    it("setDoorState panel kapısını açar", () => {
      sim.setDoorState({ batteryOpen: false, panelOpen: true });
      expect(sim.readDiscreteInput(DISCRETE.PANEL_DOOR_OPEN)).toBe(true);
    });
  });

  describe("ışık komutları (COIL write)", () => {
    it("battery light AÇ → coil true, read-back yansır", () => {
      sim.writeCoil(COILS.BATTERY_LIGHT, true);
      expect(sim.readCoil(COILS.BATTERY_LIGHT)).toBe(true);
    });

    it("battery light KAPAT → coil false", () => {
      sim.writeCoil(COILS.BATTERY_LIGHT, true);
      sim.writeCoil(COILS.BATTERY_LIGHT, false);
      expect(sim.readCoil(COILS.BATTERY_LIGHT)).toBe(false);
    });

    it("panel light bağımsız yönetilir", () => {
      sim.writeCoil(COILS.BATTERY_LIGHT, true);
      sim.writeCoil(COILS.PANEL_LIGHT, true);
      expect(sim.readCoil(COILS.BATTERY_LIGHT)).toBe(true);
      expect(sim.readCoil(COILS.PANEL_LIGHT)).toBe(true);
      sim.writeCoil(COILS.BATTERY_LIGHT, false);
      expect(sim.readCoil(COILS.BATTERY_LIGHT)).toBe(false);
      expect(sim.readCoil(COILS.PANEL_LIGHT)).toBe(true);
    });
  });

  describe("FSS kuru kontakları (K5 — EP203 → IO DI)", () => {
    it("setFssState fault → Fault=true, System OK=false", () => {
      sim.setFssState({ fault: true });
      expect(sim.readDiscreteInput(DISCRETE.FSS_FAULT)).toBe(true);
      expect(sim.readDiscreteInput(DISCRETE.FSS_SYSTEM_OK)).toBe(false);
    });

    it("setFssState discharged → Discharged=true, System OK=false", () => {
      sim.setFssState({ discharged: true });
      expect(sim.readDiscreteInput(DISCRETE.FSS_DISCHARGED)).toBe(true);
      expect(sim.readDiscreteInput(DISCRETE.FSS_SYSTEM_OK)).toBe(false);
    });

    it("setFssState secondStage → 2nd Stage=true", () => {
      sim.setFssState({ secondStage: true });
      expect(sim.readDiscreteInput(DISCRETE.FSS_2ND_STAGE)).toBe(true);
    });

    it("setFssState temizlenince System OK geri döner", () => {
      sim.setFssState({ fault: true, discharged: true });
      sim.setFssState({ fault: false, discharged: false });
      expect(sim.readDiscreteInput(DISCRETE.FSS_SYSTEM_OK)).toBe(true);
      expect(sim.readDiscreteInput(DISCRETE.FSS_FAULT)).toBe(false);
    });
  });

  describe("okuma sınırları", () => {
    it("bilinmeyen DI adresi false döner", () => {
      expect(sim.readDiscreteInput(99)).toBe(false);
    });

    it("bilinmeyen coil adresi yazılmaz", () => {
      sim.writeCoil(99, true);
      expect(sim.readCoil(99)).toBe(false);
    });
  });
});
