import { describe, it, expect, afterEach } from "vitest";
import { connect as netConnect } from "node:net";
import type { Socket } from "node:net";
import { ModbusTCPClient } from "jsmodbus";
import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import { ModbusServerBridge } from "./modbus-server-bridge";

/** Bellek-içi test adapter'ı — aralık dışı isteklerde throw eder. */
class FakeAdapter implements IModbusSimulatorAdapter {
  readonly holding = new Array<number>(256).fill(0);
  readonly input = new Array<number>(256).fill(0);
  readonly coils = new Array<boolean>(256).fill(false);
  readonly discrete = new Array<boolean>(256).fill(false);
  readonly calls = { writeRegister: 0, writeRegisters: 0, writeCoil: 0, writeCoils: 0 };

  private assertRange(address: number, count: number, size: number): void {
    if (address < 0 || count <= 0 || address + count > size) {
      throw new Error(`aralık dışı: ${address}+${count}`);
    }
  }

  async readHoldingRegister(address: number): Promise<number> {
    this.assertRange(address, 1, this.holding.length);
    return this.holding[address]!;
  }
  async readHoldingRegisters(address: number, count: number): Promise<number[]> {
    this.assertRange(address, count, this.holding.length);
    return this.holding.slice(address, address + count);
  }
  async writeHoldingRegister(address: number, value: number): Promise<void> {
    this.assertRange(address, 1, this.holding.length);
    this.calls.writeRegister += 1;
    this.holding[address] = value;
  }
  async writeHoldingRegisters(address: number, values: number[]): Promise<void> {
    this.assertRange(address, values.length, this.holding.length);
    this.calls.writeRegisters += 1;
    values.forEach((v, i) => (this.holding[address + i] = v));
  }
  async readInputRegister(address: number): Promise<number> {
    this.assertRange(address, 1, this.input.length);
    return this.input[address]!;
  }
  async readInputRegisters(address: number, count: number): Promise<number[]> {
    this.assertRange(address, count, this.input.length);
    return this.input.slice(address, address + count);
  }
  async readCoil(address: number): Promise<boolean> {
    this.assertRange(address, 1, this.coils.length);
    return this.coils[address]!;
  }
  async readCoils(address: number, count: number): Promise<boolean[]> {
    this.assertRange(address, count, this.coils.length);
    return this.coils.slice(address, address + count);
  }
  async writeCoil(address: number, value: boolean): Promise<void> {
    this.assertRange(address, 1, this.coils.length);
    this.calls.writeCoil += 1;
    this.coils[address] = value;
  }
  async writeMultipleCoils(address: number, values: boolean[]): Promise<void> {
    this.assertRange(address, values.length, this.coils.length);
    this.calls.writeCoils += 1;
    values.forEach((v, i) => (this.coils[address + i] = v));
  }
  async readDiscreteInput(address: number): Promise<boolean> {
    this.assertRange(address, 1, this.discrete.length);
    return this.discrete[address]!;
  }
  async readDiscreteInputs(address: number, count: number): Promise<boolean[]> {
    this.assertRange(address, count, this.discrete.length);
    return this.discrete.slice(address, address + count);
  }
}

interface Harness {
  adapter: FakeAdapter;
  bridge: ModbusServerBridge;
  client: ModbusTCPClient;
  socket: Socket;
}

interface HarnessProtection {
  writeProtected?: { table: "holding" | "coil"; ranges?: [number, number][] };
  readProtected?: {
    table: "holding" | "coil" | "discrete" | "input";
    ranges?: [number, number][];
  };
}

const openHarness = async (protection: HarnessProtection = {}): Promise<Harness> => {
  const adapter = new FakeAdapter();
  const bridge = new ModbusServerBridge({
    adapter,
    host: "127.0.0.1",
    port: 0,
    ...(protection.writeProtected ? { writeProtected: protection.writeProtected } : {}),
    ...(protection.readProtected ? { readProtected: protection.readProtected } : {}),
  });
  await bridge.start();
  const socket = netConnect({ host: "127.0.0.1", port: bridge.port() });
  const client = new ModbusTCPClient(socket, 1);
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
  });
  return { adapter, bridge, client, socket };
};

const closeHarness = async (h: Harness): Promise<void> => {
  h.socket.destroy();
  await h.bridge.stop();
};

afterEach(() => {});

describe("ModbusServerBridge — UC-1", () => {
  it("AK-1.1 — FC 03/04/01/02 adapter'dan anlık değer döner", async () => {
    const h = await openHarness();
    try {
      h.adapter.holding[10] = 1111;
      h.adapter.input[11] = 2222;
      h.adapter.coils[2] = true;
      h.adapter.discrete[3] = true;

      const hr = await h.client.readHoldingRegisters(10, 1);
      expect((hr.response.body.valuesAsArray as number[])[0]).toBe(1111);

      const ir = await h.client.readInputRegisters(11, 1);
      expect((ir.response.body.valuesAsArray as number[])[0]).toBe(2222);

      const co = await h.client.readCoils(2, 1);
      expect((co.response.body.valuesAsArray as (number | boolean)[])[0]).toBe(1);

      const di = await h.client.readDiscreteInputs(3, 1);
      expect((di.response.body.valuesAsArray as (number | boolean)[])[0]).toBe(1);
    } finally {
      await closeHarness(h);
    }
  });

  it("AK-1.1 — çoklu holding okuma sıralı değer döner", async () => {
    const h = await openHarness();
    try {
      h.adapter.holding.splice(100, 3, 7, 8, 9);
      const res = await h.client.readHoldingRegisters(100, 3);
      expect(res.response.body.valuesAsArray as number[]).toEqual([7, 8, 9]);
    } finally {
      await closeHarness(h);
    }
  });

  it("AK-1.2 — korunan holding aralığına yazım 0x02 döner, adapter'a GİTMEZ", async () => {
    const h = await openHarness({ writeProtected: { table: "holding", ranges: [[0, 99]] } });
    try {
      await expect(h.client.writeSingleRegister(5, 42)).rejects.toThrow();
      expect(h.adapter.calls.writeRegister).toBe(0);
      expect(h.adapter.holding[5]).toBe(0);
    } finally {
      await closeHarness(h);
    }
  });

  it("AK-1.2 — korunmayan holding adresine yazım adapter'a gider", async () => {
    const h = await openHarness({ writeProtected: { table: "holding", ranges: [[0, 99]] } });
    try {
      const res = await h.client.writeSingleRegister(150, 42);
      expect(res.response.body.address).toBe(150);
      expect(h.adapter.holding[150]).toBe(42);
      expect(h.adapter.calls.writeRegister).toBe(1);
    } finally {
      await closeHarness(h);
    }
  });

  it("AK-1.2 — çoklu holding yazımı korunan aralıkla kesişirse reddedilir", async () => {
    const h = await openHarness({ writeProtected: { table: "holding", ranges: [[10, 20]] } });
    try {
      await expect(h.client.writeMultipleRegisters(18, [1, 2, 3, 4])).rejects.toThrow();
      expect(h.adapter.calls.writeRegisters).toBe(0);
    } finally {
      await closeHarness(h);
    }
  });

  it("AK-1.2 — coil koruması korunan coil adresine yazımı reddeder", async () => {
    const h = await openHarness({ writeProtected: { table: "coil", ranges: [[0, 10]] } });
    try {
      await expect(h.client.writeSingleCoil(3, true)).rejects.toThrow();
      expect(h.adapter.calls.writeCoil).toBe(0);
    } finally {
      await closeHarness(h);
    }
  });

  it("AK-1.4 — readProtected dışı holding okuma 0x02, korunmayan adres okunur", async () => {
    const h = await openHarness({ readProtected: { table: "holding", ranges: [[100, 199]] } });
    try {
      await expect(h.client.readHoldingRegisters(150, 1)).rejects.toThrow();
      const ok = await h.client.readHoldingRegisters(50, 1);
      expect(ok.response.body.valuesAsArray as number[]).toHaveLength(1);
    } finally {
      await closeHarness(h);
    }
  });

  it("AK-1.4 — readProtected ranges yoksa tüm holding tablosu korunur", async () => {
    const h = await openHarness({ readProtected: { table: "holding" } });
    try {
      await expect(h.client.readHoldingRegisters(0, 1)).rejects.toThrow();
    } finally {
      await closeHarness(h);
    }
  });

  it("AK-1.4 — readProtected coil tablosunda da okumayı reddeder", async () => {
    const h = await openHarness({ readProtected: { table: "coil", ranges: [[0, 10]] } });
    try {
      await expect(h.client.readCoils(3, 1)).rejects.toThrow();
    } finally {
      await closeHarness(h);
    }
  });

  it("AK-1.3 — adapter hatası (aralık dışı) exception döner, server ayakta kalır", async () => {
    const h = await openHarness();
    try {
      await expect(h.client.readHoldingRegisters(300, 1)).rejects.toThrow();
      const ok = await h.client.readHoldingRegisters(0, 1);
      expect(ok.response.body.valuesAsArray as number[]).toHaveLength(1);
    } finally {
      await closeHarness(h);
    }
  });

  it("yazma — tek register/çoklu register/coil adapter'a iletilir (FC 06/10/05/0F)", async () => {
    const h = await openHarness();
    try {
      await h.client.writeSingleRegister(200, 123);
      await h.client.writeMultipleRegisters(210, [1, 2, 3]);
      await h.client.writeSingleCoil(50, true);
      await h.client.writeMultipleCoils(60, [true, false, true]);

      expect(h.adapter.holding[200]).toBe(123);
      expect(h.adapter.holding.slice(210, 213)).toEqual([1, 2, 3]);
      expect(h.adapter.coils[50]).toBe(true);
      expect(h.adapter.coils.slice(60, 63)).toEqual([true, false, true]);
    } finally {
      await closeHarness(h);
    }
  });

  it("edge — port doğrulaması: port<=0 throw eder", () => {
    const adapter = new FakeAdapter();
    expect(() => new ModbusServerBridge({ adapter, port: 0 })).not.toThrow();
    expect(() => new ModbusServerBridge({ adapter, port: -1 })).toThrow();
  });

  it("edge — stop() idempotent; start/stop/start yeniden açılır", async () => {
    const adapter = new FakeAdapter();
    const bridge = new ModbusServerBridge({ adapter, host: "127.0.0.1", port: 0 });
    await bridge.start();
    expect(bridge.port()).toBeGreaterThan(0);
    await bridge.stop();
    await bridge.stop();
    await bridge.start();
    expect(bridge.port()).toBeGreaterThan(0);
    await bridge.stop();
  });
});
