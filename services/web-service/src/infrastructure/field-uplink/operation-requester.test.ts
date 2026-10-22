import { describe, it, expect, vi } from "vitest";
import type { HubConsumerClient } from "../hub-consumer";
import { OperationRequester } from "./operation-requester";

/**
 * OperationRequester sözleşmesi (SPEC UC-4 — hub access HTTP):
 * - send: hub access POST `/api/operations/<name>/execute`; system kimliği +
 *   `x-gd-operation-id`/`x-gd-trace-id` başlıkları taşınır.
 * - Terminal-only eşleme: 200 → çalıştırma durumu; 422 → failed; 202 →
 *   failed (`still_running`); 4xx → rejected; 5xx → failed.
 * - Ağ hatası / timeout → undefined (boss rotası 503 üretir).
 */

interface AccessCall {
  peerId: string;
  serviceId: string;
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
}

function makeClient(
  impl: (call: AccessCall) => Promise<Response>,
): { client: HubConsumerClient; calls: AccessCall[] } {
  const calls: AccessCall[] = [];
  const client = {
    access: vi.fn(async (call: AccessCall) => {
      calls.push(call);
      return impl(call);
    }),
  } as unknown as HubConsumerClient;
  return { client, calls };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("OperationRequester (UC-4 — HTTP relay)", () => {
  it("hub access POST'u system kimliği + köken başlıklarıyla atar; 200 sonucu eşler", async () => {
    const { client, calls } = makeClient(async () => json({ status: "completed" }));
    const requester = new OperationRequester({ client, serviceId: "field-api" });

    const result = await requester.send(
      "f-1",
      "op-1",
      "field_charge",
      { powerKw: 200 },
      "t-1",
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      peerId: "f-1",
      serviceId: "field-api",
      path: "/api/operations/field_charge/execute",
      method: "POST",
      headers: {
        "x-tunnel-user-id": "system",
        "x-tunnel-user-username": "system",
        "x-tunnel-user-role": "admin",
        "x-gd-operation-id": "op-1",
        "x-gd-trace-id": "t-1",
      },
    });
    expect(JSON.parse(String(calls[0]?.body))).toEqual({
      params: { powerKw: 200 },
    });
    expect(result).toEqual({
      type: "operation-result",
      operationId: "op-1",
      status: "completed",
    });
  });

  it("200 + outcomes → results özetine dönüşür", async () => {
    const { client } = makeClient(async () =>
      json({
        status: "rolled_back",
        outcomes: [
          { stepIndex: 0, system: "container-1", maneuver: "bsc_prepare", success: true },
          { stepIndex: 1, success: false, reason: "write_failed" },
        ],
      }),
    );
    const requester = new OperationRequester({ client, serviceId: "field-api" });

    await expect(requester.send("f-1", "op-1", "field_charge")).resolves.toEqual({
      type: "operation-result",
      operationId: "op-1",
      status: "rolled_back",
      results: [
        { step: 0, system: "container-1", maneuver: "bsc_prepare", ok: true },
        { step: 1, ok: false, reason: "write_failed" },
      ],
    });
  });

  it("202 (uzun koşu) → failed/still_running (terminal-only)", async () => {
    const { client } = makeClient(async () => json({ status: "running" }, 202));
    const requester = new OperationRequester({ client, serviceId: "field-api" });

    await expect(requester.send("f-1", "op-1", "charge")).resolves.toEqual({
      type: "operation-result",
      operationId: "op-1",
      status: "failed",
      reason: "still_running",
    });
  });

  it("422 → failed + gövdedeki reason", async () => {
    const { client } = makeClient(async () =>
      json({ status: "failed", reason: "current_flows" }, 422),
    );
    const requester = new OperationRequester({ client, serviceId: "field-api" });

    await expect(requester.send("f-1", "op-1", "stop")).resolves.toMatchObject({
      status: "failed",
      reason: "current_flows",
    });
  });

  it("404/403 → rejected + gövdedeki error", async () => {
    const { client } = makeClient(async () => json({ error: "not_found" }, 404));
    const requester = new OperationRequester({ client, serviceId: "field-api" });
    await expect(requester.send("f-1", "op-1", "yok")).resolves.toMatchObject({
      status: "rejected",
      reason: "not_found",
    });

    const forbidden = makeClient(async () => json({}, 403));
    const requester2 = new OperationRequester({
      client: forbidden.client,
      serviceId: "field-api",
    });
    await expect(requester2.send("f-1", "op-1", "x")).resolves.toMatchObject({
      status: "rejected",
      reason: "invalid_request",
    });
  });

  it("5xx → failed (remote_http_<status>)", async () => {
    const { client } = makeClient(async () => new Response("boom", { status: 502 }));
    const requester = new OperationRequester({ client, serviceId: "field-api" });

    await expect(requester.send("f-1", "op-1", "x")).resolves.toMatchObject({
      status: "failed",
      reason: "remote_http_502",
    });
  });

  it("ağ hatası → undefined", async () => {
    const { client } = makeClient(async () => {
      throw new Error("ECONNREFUSED");
    });
    const requester = new OperationRequester({ client, serviceId: "field-api" });

    await expect(requester.send("f-1", "op-1", "x")).resolves.toBeUndefined();
  });

  it("timeout → undefined", async () => {
    const { client } = makeClient(
      () => new Promise<Response>(() => undefined),
    );
    const requester = new OperationRequester({
      client,
      serviceId: "field-api",
      timeoutMs: 10,
    });

    await expect(requester.send("f-1", "op-1", "x")).resolves.toBeUndefined();
  });
});
