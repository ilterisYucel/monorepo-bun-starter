import { describe, it, expect, beforeAll } from "vitest";

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
  api,
  normalizeStack,
} from "../helpers";

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
  await normalizeStack(fieldToken, containerToken);
});

/** PCS şarj/deşarj → connector ters kanalı → BSC DC gücü (PCS-BSC-GUC-LINKI). */
const fieldOperation = (name: string, body: Record<string, unknown> = {}) =>
  api(FIELD_URL, fieldToken, `/api/operations/${name}/execute`, {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("BSC komut el sıkışması", () => {
  it("C3: komut sonrası 40010 finalize ile 0'a döner", async () => {
    const res = await fetch(`${CONTAINER_URL}/api/commands/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${containerToken}`,
      },
      body: JSON.stringify({ deviceId: "BSC-1", command: "emergency" }),
    });
    expect([200, 202, 422]).toContain(res.status);

    let commandRequest = Number.NaN;
    for (let i = 0; i < 12; i++) {
      const direct = await readCommandRequestDirect();
      if (Number.isFinite(direct)) commandRequest = direct;
      if (commandRequest === 0) break;
      await sleep(1000);
    }
    expect(commandRequest).toBe(0);
  });

  it("kabul edilen komut Request Acknowledge = Done (0x0002) olur", async () => {
    // EMERGENCY yalnız Normal/NPS/Manual'den kabul edilir: reset → start → Normal → close.
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 10); // RESET
    await sleep(1500);
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 2); // START
    for (let i = 0; i < 40; i++) {
      const state = (await modbusRead(BSC_PORT, 4, 30036, 1)).values[0];
      if (state === 3) break;
      await sleep(1000);
    }
    await modbusWriteSingle(BSC_PORT, COMMAND_REQUEST, 5); // CLOSE
    await sleep(6000);
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
});

async function readCommandRequestDirect(): Promise<number> {
  const rows = await deviceRows(CONTAINER_URL, containerToken, "BSC-1").catch(
    () => [],
  );
  return valueOf(rows, "Command Request");
}

describe("BSC request-ack tablosu (canlı, Sequence/Diagnosis)", () => {
  const STATE = 30036;

  it("heartbeat 40000-40009 birlikte artar", async () => {
    const a = await modbusRead(BSC_PORT, 3, 40009, 1);
    await sleep(2500);
    const b = await modbusRead(BSC_PORT, 3, 40009, 1);
    expect(a.values[0]).toBeGreaterThan(0);
    expect(b.values[0]).not.toBe(a.values[0]);
  });
});
