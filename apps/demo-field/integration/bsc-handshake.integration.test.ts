import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FIELD_URL,
  CONTAINER_URL,
  assertHealthy,
  login,
  deviceRows,
  valueOf,
  sleep,
  modbusRead,
  modbusWriteSingle,
} from "./helpers";

/**
 * BSC komut el sıkışması entegrasyonu (LGES Flex BSC, Request Ack tabloları).
 * Bulgular: C1, C2, C3, C4, M5, M9 — `DENETIM-ESLEME-v2.md`.
 *
 * Simülatör portu: BSC-1 → 127.0.0.1:15501 (v2/dev compose loopback yayını).
 */

const BSC_PORT = Number(process.env.BSC1_PORT ?? 15501);
const COMMAND_REQUEST = 40010;
const REQUEST_ACK = 30030;
const HEARTBEAT = 40000;

let fieldToken = "";
let containerToken = "";

beforeAll(async () => {
  await assertHealthy(FIELD_URL);
  await assertHealthy(CONTAINER_URL);
  fieldToken = await login(FIELD_URL);
  containerToken = await login(CONTAINER_URL);
});

describe("BSC komut el sıkışması", () => {
  it("C3: komut sonrası 40010 finalize ile 0'a döner", async () => {
    const res = await fetch(`${CONTAINER_URL}/api/commands/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${containerToken}` },
      body: JSON.stringify({ deviceId: "BSC-1", command: "emergency" }),
    });
    expect([200, 202]).toContain(res.status);

    let commandRequest = Number.NaN;
    for (let i = 0; i < 12; i++) {
      const direct = await readCommandRequestDirect();
      if (Number.isFinite(direct)) commandRequest = direct;
      if (commandRequest === 0) break;
      await sleep(1000);
    }
    expect(commandRequest).toBe(0);
  });

  it("C4: heartbeat 40000 saniyelik artan sayaç olarak yazılır", async () => {
    const first = await modbusRead(BSC_PORT, 3, HEARTBEAT, 1);
    expect(first.values.length).toBe(1);
    await sleep(2500);
    const second = await modbusRead(BSC_PORT, 3, HEARTBEAT, 1);
    expect(second.values[0]).not.toBe(first.values[0]);
  });

  it("kabul edilen komut Request Acknowledge = Done (0x0002) olur", async () => {
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 1); // emergency
    let ack = 0;
    for (let i = 0; i < 10; i++) {
      const res = await modbusRead(BSC_PORT, 4, REQUEST_ACK, 1);
      ack = res.values[0] ?? 0;
      if (ack === 2) break;
      await sleep(500);
    }
    expect(ack).toBe(2);
  });

  it("C1/C2/M9: akım akarken stop 'Current Flows' (0x000A) ile reddedilir", async () => {
    // Temiz durum: reset → oto-init → START (akım akar), sonra STOP.
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 10); // RESET
    await sleep(8000);
    await modbusWriteSingle(BSC_PORT, 49000, 500); // SIM-only şarj setpoint 50 kW (0.1 kW)
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 2); // START (akım akar)
    await sleep(2000);
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 3); // STOP

    let ack = 0;
    for (let i = 0; i < 10; i++) {
      const res = await modbusRead(BSC_PORT, 4, REQUEST_ACK, 1);
      ack = res.values[0] ?? 0;
      if (ack === 0x000a) break;
      await sleep(500);
    }
    // LGES: normalde akım akarken stop reddedilir ve ack = Current Flows.
    expect(ack).toBe(0x000a);
  });

  it("C2: akım akarken EMERGENCY (0x0001) kabul edilir (en yüksek öncelik)", async () => {
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 10); // RESET
    await sleep(8000);
    await modbusWriteSingle(BSC_PORT, 49000, 500);
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 2); // START (akım akar)
    await sleep(2000);
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 1); // EMERGENCY

    let ack = 0;
    for (let i = 0; i < 10; i++) {
      const res = await modbusRead(BSC_PORT, 4, REQUEST_ACK, 1);
      ack = res.values[0] ?? 0;
      if (ack === 2) break;
      await sleep(500);
    }
    expect(ack).toBe(2); // DONE
  });

  it("M5: close_contactors timeoutMs N×400+5000 (8 rack → 8200 ms)", () => {
    const cfg = JSON.parse(
      readFileSync(
        resolve(__dirname, "../../../deployment/v2/dev/container/device-configs/bsc-1.json"),
        "utf-8",
      ),
    ) as { commands: Record<string, { timeoutMs?: number }> };
    expect(cfg.commands["close_contactors"]?.timeoutMs).toBe(8200);
  });
});

async function readCommandRequestDirect(): Promise<number> {
  const rows = await deviceRows(CONTAINER_URL, containerToken, "BSC-1").catch(() => []);
  return valueOf(rows, "Command Request");
}

describe("BSC request-ack tablosu (canlı, Sequence/Diagnosis)", () => {
  const STATE = 30036;

  it("Start Normal'de → 0x06 (BMS Already Connected)", async () => {
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 10); // RESET
    await sleep(8000);
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 2); // START (NotInitialized)
    await sleep(1000);
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 2); // ikinci START (Normal)
    expect((await modbusRead(BSC_PORT, 4, REQUEST_ACK, 1)).values[0]).toBe(0x0006);
  });

  it("Event Clear ikinci kez → 0x12 (Within Cooldown)", async () => {
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 9); // EVENT_CLEAR
    await sleep(500);
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 9);
    expect((await modbusRead(BSC_PORT, 4, REQUEST_ACK, 1)).values[0]).toBe(0x0012);
  });

  it("Emergency → Stop Emergency'den çıkarır (0 = Not Initialized)", async () => {
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 1); // EMERGENCY
    await sleep(500);
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 3); // STOP
    const state = (await modbusRead(BSC_PORT, 4, STATE, 1)).values[0];
    expect(state).toBe(1); // NOT_INITIALIZED
  });

  it("heartbeat 40000-40009 birlikte artar", async () => {
    const a = await modbusRead(BSC_PORT, 3, 40009, 1);
    await sleep(2500);
    const b = await modbusRead(BSC_PORT, 3, 40009, 1);
    expect(a.values[0]).toBeGreaterThan(0);
    expect(b.values[0]).not.toBe(a.values[0]);
  });
});
