import { describe, it, expect, afterEach } from "vitest";
import { createConnection } from "node:net";
import { WattoxPcsSimulator } from "./simulator";
import { BmsPortServer } from "./bms-port-server";
import { BMS_SOC, BMS_TOTAL_VOLTAGE, REG_OP_STATUS } from "./register-map";

/**
 * BmsPortServer sözleşmesi (BSC-PCS-CONNECTOR-MIMARISI §4.2, T-C4):
 *
 * - Minimal Modbus TCP sunucu (MBAP + PDU): FC 0x03 okuma, FC 0x06 tek yazım,
 *   FC 0x10 çoklu yazım — YALNIZCA BMS bloğu (0x0300-0x0316, ondalık 768-790).
 * - BMS bloğu dışı okuma/yazma → exception 0x02; bilinmeyen fonksiyon → 0x01.
 * - Yazımlar `simulator.setBmsRegister` üzerinden uygulanır — EMS yüzü aynı
 *   depoyu RO okur (izolasyon).
 * - start(): idempotent (aynı port); stop(): idempotent — sonrası bağlantı reddi.
 * - Aynı anda 1 istemci; yeni bağlantı eskisini düşürür.
 */

function mbap(unitId: number, pdu: Buffer): Buffer {
  const header = Buffer.alloc(7);
  header.writeUInt16BE(1, 0); // transaction
  header.writeUInt16BE(0, 2); // protocol
  header.writeUInt16BE(pdu.length + 1, 4);
  header[6] = unitId;
  return Buffer.concat([header, pdu]);
}

function request(
  port: number,
  pdu: Buffer,
  unitId = 1,
): Promise<{ functionCode: number; data: Buffer }> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.on("error", reject);
    socket.on("connect", () => socket.write(mbap(unitId, pdu)));
    socket.on("data", (chunk: Buffer) => {
      // Modbus TCP sunucusu bağlantıyı açık tutar — tam MBAP çerçevesi
      // geldiğinde yanıtlar ve bağlantıyı kapatırız.
      const fn = chunk[7]!;
      resolve({ functionCode: fn, data: chunk.subarray(8) });
      socket.destroy();
    });
    setTimeout(() => {
      socket.destroy();
      reject(new Error("BMS port yanıt vermedi (timeout)"));
    }, 3000);
  });
}

function writeSingle(port: number, address: number, value: number) {
  const pdu = Buffer.alloc(5);
  pdu[0] = 0x06;
  pdu.writeUInt16BE(address, 1);
  pdu.writeUInt16BE(value, 3);
  return request(port, pdu);
}

function writeMultiple(port: number, address: number, values: number[]) {
  const pdu = Buffer.alloc(7 + values.length * 2);
  pdu[0] = 0x10;
  pdu.writeUInt16BE(address, 1);
  pdu.writeUInt16BE(values.length, 3);
  pdu[5] = values.length * 2;
  values.forEach((v, i) => pdu.writeUInt16BE(v, 6 + i * 2));
  return request(port, pdu);
}

function readHolding(port: number, address: number, count: number) {
  const pdu = Buffer.alloc(5);
  pdu[0] = 0x03;
  pdu.writeUInt16BE(address, 1);
  pdu.writeUInt16BE(count, 3);
  return request(port, pdu);
}

let server: BmsPortServer | undefined;

afterEach(async () => {
  await server?.stop();
  server = undefined;
});

describe("BmsPortServer", () => {
  it("start port döner; FC 0x03 BMS bloğunu okur", async () => {
    const sim = new WattoxPcsSimulator({});
    server = new BmsPortServer({ simulator: sim, port: 0 });
    const port = await server.start();

    const res = await readHolding(port, BMS_SOC, 1);
    expect(res.functionCode).toBe(0x03);
    expect(res.data.readUInt16BE(1)).toBe(500); // SOC %50.0
  });

  it("FC 0x06 yazımı simülatör deposuna uygular (EMS yüzü görür)", async () => {
    const sim = new WattoxPcsSimulator({});
    server = new BmsPortServer({ simulator: sim, port: 0 });
    const port = await server.start();

    const res = await writeSingle(port, BMS_SOC, 8720);
    expect(res.functionCode).toBe(0x06);
    expect(sim.readRegister(BMS_SOC)).toBe(8720);
  });

  it("FC 0x10 çoklu yazım uygulanır", async () => {
    const sim = new WattoxPcsSimulator({});
    server = new BmsPortServer({ simulator: sim, port: 0 });
    const port = await server.start();

    const res = await writeMultiple(port, BMS_TOTAL_VOLTAGE, [15200, 300]);
    expect(res.functionCode).toBe(0x10);
    expect(sim.readRegister(BMS_TOTAL_VOLTAGE)).toBe(15200);
    expect(sim.readRegister(BMS_TOTAL_VOLTAGE + 1)).toBe(300);
  });

  it("BMS bloğu DIŞI yazım → exception 0x02", async () => {
    const sim = new WattoxPcsSimulator({});
    server = new BmsPortServer({ simulator: sim, port: 0 });
    const port = await server.start();

    const res = await writeSingle(port, 767, 1);
    expect(res.functionCode).toBe(0x86);
    expect(res.data[0]).toBe(0x02);
    const res2 = await writeSingle(port, 791, 1);
    expect(res2.functionCode).toBe(0x86);
    expect(res2.data[0]).toBe(0x02);
  });

  it("BMS bloğu DIŞI okuma → exception 0x02", async () => {
    const sim = new WattoxPcsSimulator({});
    server = new BmsPortServer({ simulator: sim, port: 0 });
    const port = await server.start();

    const res = await readHolding(port, REG_OP_STATUS, 1);
    expect(res.functionCode).toBe(0x83);
    expect(res.data[0]).toBe(0x02);
  });

  it("bilinmeyen fonksiyon → exception 0x01", async () => {
    const sim = new WattoxPcsSimulator({});
    server = new BmsPortServer({ simulator: sim, port: 0 });
    const port = await server.start();

    const pdu = Buffer.from([0x05, 0x00, 0x00, 0x00, 0x00]);
    const res = await request(port, pdu);
    expect(res.functionCode).toBe(0x85);
    expect(res.data[0]).toBe(0x01);
  });

  it("start idempotent: ikinci çağrı aynı port", async () => {
    const sim = new WattoxPcsSimulator({});
    server = new BmsPortServer({ simulator: sim, port: 0 });
    const port1 = await server.start();
    const port2 = await server.start();
    expect(port1).toBe(port2);
  });

  it("stop sonrası bağlantı reddedilir", async () => {
    const sim = new WattoxPcsSimulator({});
    server = new BmsPortServer({ simulator: sim, port: 0 });
    const port = await server.start();
    await server.stop();

    await expect(readHolding(port, BMS_SOC, 1)).rejects.toThrow();
  });
});
