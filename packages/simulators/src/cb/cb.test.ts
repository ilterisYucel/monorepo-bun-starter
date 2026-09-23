import { describe, it, expect, beforeEach } from "vitest";
import { CbSimulator } from "./index";
import { COILS, DISCRETE } from "./register-map";

/**
 * CB Şalter (SYW6GZ-4000) sözleşmesi — KONTEYNER-MANEVRA-KATALOGU-REV03 K2:
 * trip/akım/sıcaklık/eşik semantiği YOKTUR; durum aux kontaklardan:
 * DI 0 = Is Closed (NC), DI 1 = Is Open (NO). Komutlar: COIL 0 open
 * (shunt trip), COIL 1 close. RESET ve holding/input register YOKTUR.
 */
describe("CbSimulator (DC Şalter — K2)", () => {
  let sim: CbSimulator;

  beforeEach(() => {
    sim = new CbSimulator();
    sim.tick(1);
  });

  describe("başlangıç durumu", () => {
    it("kapalı başlar: Is Closed = true, Is Open = false", () => {
      expect(sim.readDiscreteInput(DISCRETE.IS_CLOSED)).toBe(true);
      expect(sim.readDiscreteInput(DISCRETE.IS_OPEN)).toBe(false);
    });
  });

  describe("aç/kapat (coil komutları)", () => {
    it("OPEN coil → şalter açılır (Is Open = true)", () => {
      sim.writeCoil(COILS.OPEN, true);
      sim.tick(1);
      expect(sim.readDiscreteInput(DISCRETE.IS_CLOSED)).toBe(false);
      expect(sim.readDiscreteInput(DISCRETE.IS_OPEN)).toBe(true);
    });

    it("CLOSE coil → şalter kapanır (Is Closed = true)", () => {
      sim.writeCoil(COILS.OPEN, true);
      sim.tick(1);
      sim.writeCoil(COILS.CLOSE, true);
      sim.tick(1);
      expect(sim.readDiscreteInput(DISCRETE.IS_CLOSED)).toBe(true);
      expect(sim.readDiscreteInput(DISCRETE.IS_OPEN)).toBe(false);
    });

    it("writeCoil false değerini yok sayar", () => {
      sim.writeCoil(COILS.OPEN, false);
      sim.tick(1);
      expect(sim.readDiscreteInput(DISCRETE.IS_CLOSED)).toBe(true);
    });

    it("açıkken aç, kapalıyken kapat — konum değişmez (idempotent)", () => {
      sim.writeCoil(COILS.OPEN, true);
      sim.tick(1);
      sim.writeCoil(COILS.OPEN, true);
      sim.tick(1);
      expect(sim.readDiscreteInput(DISCRETE.IS_OPEN)).toBe(true);
      sim.writeCoil(COILS.CLOSE, true);
      sim.tick(1);
      sim.writeCoil(COILS.CLOSE, true);
      sim.tick(1);
      expect(sim.readDiscreteInput(DISCRETE.IS_CLOSED)).toBe(true);
    });
  });

  describe("kaldırılan semantik (K2)", () => {
    it("input register okumaları 0 döner (trip/akım/sıcaklık YOK)", () => {
      expect(sim.readInputRegister(0)).toBe(0);
      expect(sim.readInputRegister(4)).toBe(0);
    });

    it("holding register okumaları 0 döner (eşikler YOK)", () => {
      expect(sim.readHoldingRegister(0)).toBe(0);
    });

    it("RESET coil'i yok sayılır (trip semantiği kalktı)", () => {
      sim.writeCoil(COILS.OPEN, true);
      sim.tick(1);
      sim.writeCoil(2, true); // eski RESET adresi
      sim.tick(1);
      expect(sim.readDiscreteInput(DISCRETE.IS_OPEN)).toBe(true);
    });

    it("bilinmeyen discrete input false döner", () => {
      expect(sim.readDiscreteInput(9)).toBe(false);
    });
  });
});
