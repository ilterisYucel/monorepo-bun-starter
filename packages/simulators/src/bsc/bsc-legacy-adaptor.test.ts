import { connect as netConnect } from "node:net";
import { describe, expect, it } from "vitest";
import { BSC_SEQUENCE, runEquivalence } from "../physical/conformance/equivalence";
import { bscPhysicalSide } from "../physical/conformance/bsc-sides";
import { createBscLegacyAdaptor } from "./bsc-legacy-adaptor";

/**
 * `BscLegacyAdaptor` testleri (T-4).
 *
 * SPEC: `SIMULATOR-MODEL-BIRLESTIRME-MIMARISI.md` §6.2
 * - AK-2.1: adaptör + fiziksel yüz `uyumlu` profilde fark 0
 * - AK-2.2: bağımsız ünite kendi modbus sunucusuyla aynı register'ları okur
 * - Purity (SC-1): adaptör kendi durum makinesini taşımaz (`state`/`ack` alanı yok)
 */

const config = { deviceId: "BSC-1", rackCount: 8, initialSocPercent: 50, initialTempC: 25 };

/**
 * Ham Modbus TCP FC04 okuması — EMS'in BSC verisini okuduğu yol (Rev AF).
 * `jsmodbus` yüksek adreslerde (30036) yanıt beklemede kaldığı için doğrudan
 * PDU kullanılır; sözleşme aynıdır (FC04, 1 kelime).
 */
function readInput(port: number, address: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = netConnect({ host: "127.0.0.1", port }, () => {
      const pdu = Buffer.alloc(5);
      pdu[0] = 4;
      pdu.writeUInt16BE(address, 1);
      pdu.writeUInt16BE(1, 3);
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
      reject(new Error(`FC04 timeout (${address})`));
    }, 3000);
    socket.on("data", (d) => {
      clearTimeout(timer);
      socket.destroy();
      resolve(d.readUInt16BE(9));
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

describe("BscLegacyAdaptor — UC-2", () => {
  it("config'ten kurulur ve legacy okuma yüzünü sunar", () => {
    const adaptor = createBscLegacyAdaptor(config);
    expect(adaptor.deviceId).toBe("BSC-1");
    expect(typeof adaptor.readInputRegister).toBe("function");
    expect(typeof adaptor.readHoldingRegister).toBe("function");
    expect(typeof adaptor.writeHoldingRegister).toBe("function");
    expect(typeof adaptor.tick).toBe("function");
  });

  it("başlangıç durumu: BSC State = 1 (Not Initialized), ack = 0", () => {
    const adaptor = createBscLegacyAdaptor(config);
    expect(adaptor.readInputRegister(30036)).toBe(1);
    expect(adaptor.readInputRegister(30030)).toBe(0);
  });

  it("geçersiz girdi fail-fast reddedilir (boş deviceId, rackCount < 1)", () => {
    expect(() => createBscLegacyAdaptor({ ...config, deviceId: " " })).toThrow("deviceId zorunlu");
    expect(() => createBscLegacyAdaptor({ ...config, rackCount: 0 })).toThrow("rackCount ≥ 1");
  });

  it("AK-2.1 — adaptör ile fiziksel yüz `uyumlu` profilde fark 0", () => {
    const adaptor = createBscLegacyAdaptor(config);
    const legacy = {
      read: (address: number) => adaptor.readInputRegister(address),
      write: (address: number, value: number) => adaptor.writeHoldingRegister(address, value),
      advance: (seconds: number) => adaptor.tick(seconds),
    };
    const rows = runEquivalence(legacy, bscPhysicalSide(config), BSC_SEQUENCE);
    expect(rows.filter((r) => r.diff)).toEqual([]);
  });

  it("AK-2.2 — bağımsız ünite kendi modbus sunucusuyla aynı register'ları okur", async () => {
    const adaptor = createBscLegacyAdaptor({ ...config, network: { host: "127.0.0.1", port: 0 } });
    await adaptor.start();
    try {
      expect(adaptor.port()).toBeGreaterThan(0);
      expect(await readInput(adaptor.port(), 30036)).toBe(1);
      expect(await readInput(adaptor.port(), 30030)).toBe(0);
      expect(await readInput(adaptor.port(), 30038)).toBe(0);
    } finally {
      await adaptor.stop();
    }
  }, 20_000);

  it("tick modeli ilerletir: START → Normal (durum modelden gelir)", () => {
    const adaptor = createBscLegacyAdaptor(config);
    adaptor.writeHoldingRegister(40010, 2); // START
    adaptor.tick(10);
    expect(adaptor.readInputRegister(30036)).toBe(3); // Normal
    adaptor.writeHoldingRegister(40010, 5); // CLOSE
    adaptor.tick(8);
    expect(adaptor.readInputRegister(30038)).toBe(8); // 8 raf online
  });

  it("varsayılanlar: SOC %50, bilinmeyen adres 0, coil yüzü boş", () => {
    const adaptor = createBscLegacyAdaptor({ deviceId: "BSC-2", rackCount: 8 });
    // SOC, raflar online olana kadar 0'dır → START + CLOSE + ilerlet.
    adaptor.writeHoldingRegister(40010, 2);
    adaptor.tick(10);
    adaptor.writeHoldingRegister(40010, 5);
    adaptor.tick(8);
    expect(adaptor.readInputRegister(30055)).toBeGreaterThan(4800); // ~%50 SOC (×100)
    expect(adaptor.readInputRegister(39999)).toBe(0);
    expect(adaptor.readHoldingRegister(49999)).toBe(0);
    expect(adaptor.readCoil(1)).toBe(false);
    adaptor.writeCoil(1, true); // no-op, istisna yok
    adaptor.tick(0);
    adaptor.tick(1.4); // yuvarlama → 1 sn (model Normal'de kalır)
    expect(adaptor.readInputRegister(30036)).toBe(3);
  });

  it("network yokken start/stop no-op, port 0", async () => {
    const adaptor = createBscLegacyAdaptor(config);
    await adaptor.start();
    expect(adaptor.port()).toBe(0);
    await adaptor.stop();
  });

  it("purity (SC-1): adaptör durum makinesi alanları taşımaz", () => {
    const adaptor = createBscLegacyAdaptor(config) as unknown as Record<string, unknown>;
    expect("state" in adaptor).toBe(false);
    expect("ack" in adaptor).toBe(false);
  });
});
