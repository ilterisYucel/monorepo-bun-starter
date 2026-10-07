import { describe, it, expect, vi } from "vitest";
import type { SessionGateway, TunnelProxy, IStreamSink } from "@gd-monorepo/ws-tunnel";
import type { IContainerProxy } from "@gd-monorepo/platform-container-access";
import type { TamperLogger } from "@gd-monorepo/tamper-logger";
import { TunnelManeuverChannel } from "./tunnel-maneuver-channel";

/**
 * TunnelManeuverChannel sözleşmesi (KOMUT §6 + WS-TUNNEL §5.1, C1):
 *
 * - Bağlantı "connected" değilse system_unreachable — oturum/stream açılmaz.
 * - Mevcut peer oturumu YENİDEN KULLANILIR; yoksa programatik açılır.
 * - startHttpStream: POST /api/maneuvers/:name/execute — konteynerin KENDİ
 *   yürütme rotası (katman sızmaz).
 * - Yanıt: 200 → ok (rolled_back dahil); 404/422/409 → ok:false + reason.
 * - Stream hatası → ok:false (tunnel_stream_failed).
 */

function makeDeps(overrides: {
  status?: string;
  streamImpl?: (input: { raw: IStreamSink }) => Promise<void> | void;
} = {}) {
  const sessionForPeer = vi.fn(() => undefined);
  const openSession = vi.fn(async () => ({
    isErr: () => false,
    unwrap: () => ({ sessionId: "s-new", token: "jwt", expiresInSec: 14400, peerRole: "admin" }),
  }));
  const startHttpStream = vi.fn(
    overrides.streamImpl ??
      (async (input: { raw: IStreamSink }) => {
        input.raw.status(200, { "content-type": "application/json" });
        input.raw.write(Buffer.from(JSON.stringify({ runId: "r", status: "completed" })));
        input.raw.end();
      }),
  );
  const containerProxy = {
    connectionStatus: () =>
      new Map([["container-1", overrides.status ?? "connected"]]),
  } as unknown as IContainerProxy;
  const gateway = {
    sessionForPeer,
    openSession,
  } as unknown as SessionGateway;
  const tunnelProxy = { startHttpStream } as unknown as TunnelProxy;
  const log = vi.fn(async () => undefined);
  const channel = new TunnelManeuverChannel({
    fieldId: "f-1",
    containerProxy,
    gateway,
    tunnelProxy,
    logger: { log } as unknown as TamperLogger,
  });
  return { channel, startHttpStream, openSession, sessionForPeer, log };
}

describe("TunnelManeuverChannel (C1)", () => {
  it("connected + 200 yanıt → ok", async () => {
    const { channel } = makeDeps();
    const result = await channel.execute("container-1", "bsc_prepare");
    expect(result).toEqual({ ok: true });
  });

  it("timer verilince gövdeye eklenir (additive)", async () => {
    const { channel, startHttpStream } = makeDeps();
    await channel.execute("container-1", "bsc_charge", { powerKw: 100 }, { durationSeconds: 5 });
    const body = JSON.parse(
      String((startHttpStream.mock.calls[0]![0] as { requestBody: Buffer }).requestBody),
    );
    expect(body).toEqual({ params: { powerKw: 100 }, timer: { durationSeconds: 5 } });
  });

  it("timer YOKKEN gövde yalnızca params (mevcut davranış)", async () => {
    const { channel, startHttpStream } = makeDeps();
    await channel.execute("container-1", "bsc_prepare", { powerKw: 100 });
    const body = JSON.parse(
      String((startHttpStream.mock.calls[0]![0] as { requestBody: Buffer }).requestBody),
    );
    expect(body).toEqual({ params: { powerKw: 100 } });
  });

  it("bağlantı connected değilse system_unreachable — stream açılmaz", async () => {
    const deps = makeDeps({ status: "stale" });
    const result = await deps.channel.execute("container-1", "bsc_prepare");
    expect(result).toEqual({ ok: false, reason: "system_unreachable" });
    expect(deps.startHttpStream).not.toHaveBeenCalled();
    expect(deps.openSession).not.toHaveBeenCalled();
  });

  it("stream: POST /api/maneuvers/:name/execute + params gövdesi + oturum cookie", async () => {
    const deps = makeDeps();
    await deps.channel.execute("container-1", "bsc_prepare", { powerKw: 200 });
    const [input] = deps.startHttpStream.mock.calls[0] as [
      { method: string; path: string; requestBody: Buffer; headers: Record<string, string> },
    ];
    expect(input.method).toBe("POST");
    expect(input.path).toBe("/api/maneuvers/bsc_prepare/execute");
    expect(JSON.parse(input.requestBody.toString())).toEqual({
      params: { powerKw: 200 },
    });
    expect(input.headers.cookie).toBe("container_session=jwt");
  });

  it("upstream 404 → ok:false + reason gövdeden", async () => {
    const deps = makeDeps({
      streamImpl: async (input: { raw: IStreamSink }) => {
        input.raw.status(404, { "content-type": "application/json" });
        input.raw.write(Buffer.from(JSON.stringify({ error: "not_found" })));
        input.raw.end();
      },
    });
    const result = await deps.channel.execute("container-1", "yok");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("stream hatası → ok:false (tunnel_stream_failed)", async () => {
    const deps = makeDeps({
      streamImpl: async () => {
        throw new Error("tunel akti kesildi");
      },
    });
    const result = await deps.channel.execute("container-1", "bsc_prepare");
    expect(result).toEqual({ ok: false, reason: "tunnel_stream_failed" });
  });

  it("oturum yoksa programatik açılır; varsa yeniden kullanılır", async () => {
    const deps = makeDeps();
    await deps.channel.execute("container-1", "bsc_prepare");
    expect(deps.openSession).toHaveBeenCalledWith({
      fieldId: "f-1",
      peerId: "container-1",
      user: expect.objectContaining({ username: "system" }),
      remoteIp: "127.0.0.1",
    });

    deps.sessionForPeer.mockReturnValue({
      sessionId: "s-1",
      peerId: "container-1",
      token: "jwt",
      user: { id: "system", username: "system", role: "admin" },
      peerRole: "admin",
      createdAt: 0,
      lastActivityAt: 0,
      bytesIn: 0,
      bytesOut: 0,
    });
    deps.openSession.mockClear();
    await deps.channel.execute("container-1", "bsc_prepare");
    expect(deps.openSession).not.toHaveBeenCalled();
  });
});
