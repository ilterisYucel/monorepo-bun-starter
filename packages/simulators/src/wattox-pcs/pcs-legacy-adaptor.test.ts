import { connect as netConnect } from "node:net";
import { describe, expect, it } from "vitest";
import { PCS_SEQUENCE, runEquivalence } from "../physical/conformance/equivalence";
import { pcsPhysicalSide } from "../physical/conformance/pcs-sides";
import { createPcsLegacyAdaptor } from "./pcs-legacy-adaptor";

/**
 * `PcsLegacyAdaptor` testleri (UC-3 / T-6).
 *
 * SPEC: `SIMULATOR-MODEL-BIRLESTIRME-MIMARISI.md` §6.3
 * - AK-3.1: adaptör + fiziksel yüz `uyumlu` profilde fark 0
 * - AK-3.2: şarj setpoint'i → güç **negatif** (mevcut işaret konvansiyonu)
 * - BMS yüzü: connector'ın yazdığı blok okunur; blok dışı yazım yok sayılır
 * - Purity (SC-1): durum makinesi adaptörde değil
 */

const config = { deviceId: "PCS-1" };

/** Ham Modbus TCP okuma/yazma — sunucu yüzlerini (EMS FC03/BMS) doğrulamak için. */
function modbus(port: number, fc: 3 | 6, address: number, value = 0): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = netConnect({ host: "127.0.0.1", port }, () => {
      const pdu = fc === 3 ? Buffer.alloc(5) : Buffer.alloc(5);
      pdu[0] = fc;
      pdu.writeUInt16BE(address, 1);
      pdu.writeUInt16BE(fc === 3 ? 1 : value, 3);
      const frame = Buffer.alloc(7 + pdu.length);
      frame.writeUInt16BE(1, 0);
      frame.writeUInt16BE(0, 2);
      frame.writeUInt16BE(pdu.length + 1, 4);
      frame[6] = 1;
      pdu.copy(frame, 7);
      socket.write(frame);
    });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`modbus timeout (fc${fc} ${address})`));
    }, 3000);
    socket.on("data", (d) => {
      clearTimeout(timer);
      socket.destroy();
      resolve(fc === 3 ? d.readUInt16BE(9) : 0);
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** Ham 16-bit → işaretli (EMS konvansiyonu). */
const signed = (raw: number): number => (raw >= 0x8000 ? raw - 0x10000 : raw);

describe("PcsLegacyAdaptor — UC-3", () => {
  it("config'ten kurulur, geçersiz deviceId reddedilir", () => {
    expect(createPcsLegacyAdaptor(config).deviceId).toBe("PCS-1");
    expect(() => createPcsLegacyAdaptor({ deviceId: " " })).toThrow("deviceId zorunlu");
  });

  it("başlangıç: Operation Status = 0 (Stop), fault word 0", () => {
    const adaptor = createPcsLegacyAdaptor(config);
    expect(adaptor.readHoldingRegister(0x2f7d)).toBe(0);
    expect(adaptor.readHoldingRegister(0x2f43)).toBe(0);
  });

  it("AK-3.1 — adaptör ile fiziksel yüz `uyumlu` profilde fark 0", () => {
    const adaptor = createPcsLegacyAdaptor(config);
    const legacy = {
      read: (address: number) => adaptor.readHoldingRegister(address),
      write: (address: number, value: number) => adaptor.writeHoldingRegister(address, value),
      advance: (seconds: number) => adaptor.tick(seconds),
    };
    const rows = runEquivalence(legacy, pcsPhysicalSide(config), PCS_SEQUENCE);
    expect(rows.filter((r) => r.diff)).toEqual([]);
  });

  it("AK-3.2 — şarj setpoint'i negatif güç üretir (işaret konvansiyonu)", () => {
    const adaptor = createPcsLegacyAdaptor(config);
    adaptor.writeHoldingRegister(0x0e00, 1); // Command Source = EMS
    adaptor.writeHoldingRegister(0x0e14, 1); // START
    adaptor.tick(20);
    adaptor.writeHoldingRegister(0x0e19, 0x10000 - 100); // −100 kW
    adaptor.tick(10);
    expect(adaptor.readHoldingRegister(0x2f7d)).toBe(2); // Şarj
    expect(signed(adaptor.readHoldingRegister(0x2f7e))).toBe(-100);
  });

  it("BMS yüzü: blok okunur/yazılır, blok dışı yazım yok sayılır", () => {
    const adaptor = createPcsLegacyAdaptor(config);
    adaptor.writeBmsRegister(0x0300 + 0x08, 17250); // şarj izinli güç (0,1 kW)
    expect(adaptor.readBmsRegister(0x0300 + 0x08)).toBe(17250);
    adaptor.writeBmsRegister(0x0900, 5); // blok dışı
    expect(adaptor.readBmsRegister(0x0900)).toBe(0);
  });

  it("anma değerleri ve bilinmeyen adres davranışı", () => {
    const adaptor = createPcsLegacyAdaptor(config);
    expect(adaptor.readHoldingRegister(0x2f08)).toBe(1725); // Rated Power
    expect(adaptor.readHoldingRegister(0x2f09)).toBe(690); // Rated Voltage
    expect(adaptor.readHoldingRegister(0x2f0a)).toBe(1443); // Rated Current
    expect(adaptor.readHoldingRegister(0x9999)).toBe(0);
    adaptor.writeHoldingRegister(0x9999, 5); // yutulur
    adaptor.tick(0);
    adaptor.tick(1.4); // yuvarlama → 1 sn
    expect(adaptor.readHoldingRegister(0x2f7d)).toBe(0); // komut yok → Stop
  });

  it("start/stop: EMS + BMS sunucuları açılır, portlar raporlanır", async () => {
    const adaptor = createPcsLegacyAdaptor({
      ...config,
      network: { host: "127.0.0.1", port: 0 },
      bmsNetwork: { host: "127.0.0.1", port: 0 },
    });
    await adaptor.start();
    expect(adaptor.port()).toBeGreaterThan(0);
    expect(adaptor.bmsPort()).toBeGreaterThan(0);
    await adaptor.stop();
  }, 20_000);

  it("gridLink: fider enerjisizken gerilim 0, enerjiliyken anma (690 V)", () => {
    let energized = true;
    const adaptor = createPcsLegacyAdaptor({
      ...config,
      gridLink: { isEnergized: () => energized },
      gridFeeder: "H04",
    });
    adaptor.tick(1);
    expect(adaptor.readHoldingRegister(0x2f4f)).toBe(6900);
    energized = false;
    adaptor.tick(1);
    expect(adaptor.readHoldingRegister(0x2f4f)).toBe(0);
  });

  it("feedBmsLink=false: adaptör BMS linkini tazelemez (Plant/connector besler)", () => {
    const adaptor = createPcsLegacyAdaptor({ ...config, feedBmsLink: false });
    adaptor.tick(5);
    expect(adaptor.readBmsRegister(0x0300 + 0x08)).toBe(0);
  });

  it("tick yuvarlaması ve bilinmeyen adres", () => {
    const adaptor = createPcsLegacyAdaptor(config);
    adaptor.tick(0);
    adaptor.tick(1.4);
    expect(adaptor.readHoldingRegister(0x2f7d)).toBe(0);
    expect(adaptor.readHoldingRegister(0x9999)).toBe(0);
    adaptor.writeHoldingRegister(0x9999, 5);
  });

  it("sunucu yüzleri TCP üzerinden okunur/yazılır (EMS + BMS)", async () => {
    const adaptor = createPcsLegacyAdaptor({
      ...config,
      network: { host: "127.0.0.1", port: 0 },
      bmsNetwork: { host: "127.0.0.1", port: 0 },
    });
    await adaptor.start();
    try {
      expect(await modbus(adaptor.port(), 3, 0x2f7d)).toBe(0); // Operation Status
      adaptor.tick(1); // BMS link tazeleme (feedBmsLink)
      expect(await modbus(adaptor.bmsPort(), 3, 0x0300 + 0x08)).toBe(17250);
      await modbus(adaptor.bmsPort(), 6, 0x0300 + 0x09, 8000);
      expect(await modbus(adaptor.bmsPort(), 3, 0x0300 + 0x09)).toBe(8000);
    } finally {
      await adaptor.stop();
    }
  }, 20_000);

  it("purity (SC-1): adaptör durum makinesi alanları taşımaz", () => {
    const adaptor = createPcsLegacyAdaptor(config) as unknown as Record<string, unknown>;
    expect("phase" in adaptor).toBe(false);
    expect("faults" in adaptor).toBe(false);
    expect("runEnabled" in adaptor).toBe(false);
  });
});
