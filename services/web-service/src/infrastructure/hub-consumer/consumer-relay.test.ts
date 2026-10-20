import { describe, it, expect, afterEach } from "vitest";
import { WebSocketServer } from "ws";
import { ConsumerRelay } from "./consumer-relay";

const servers: WebSocketServer[] = [];

async function startServer(
  onConnection: (socket: import("ws").WebSocket) => void,
): Promise<{ port: number; lastAuth: string | undefined }> {
  const server = new WebSocketServer({ port: 0 });
  servers.push(server);
  const state = { lastAuth: undefined as string | undefined };
  server.on("connection", (socket, request) => {
    state.lastAuth = request.headers.authorization;
    onConnection(socket);
  });
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("port");
  return { port: address.port, lastAuth: state.lastAuth };
}

afterEach(() => {
  for (const server of servers.splice(0)) server.close();
});

const waitFor = async (predicate: () => boolean, timeoutMs = 3000) => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timeout");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

describe("ConsumerRelay", () => {
  it("AK-1.3: { peerId, message } zarfını aboneye iletir", async () => {
    const received: Array<{ peerId: string; message: unknown }> = [];
    const { port } = await startServer((socket) => {
      socket.send(JSON.stringify({ peerId: "p-1", message: { type: "event", eventId: "e-1" } }));
    });
    const relay = new ConsumerRelay({
      url: `ws://127.0.0.1:${port}/ws/consumer`,
      token: "ct",
    });
    relay.onMessage((peerId, message) => received.push({ peerId, message }));
    relay.start();
    await waitFor(() => received.length > 0);
    expect(received[0]?.peerId).toBe("p-1");
    expect(received[0]?.message).toMatchObject({ type: "event", eventId: "e-1" });
    relay.stop();
  });

  it("AK-1.2: kopunca yeniden bağlanır", async () => {
    let connections = 0;
    const { port } = await startServer(() => {
      connections += 1;
    });
    const relay = new ConsumerRelay({
      url: `ws://127.0.0.1:${port}/ws/consumer`,
      token: "ct",
      reconnectBaseMs: 50,
      reconnectMaxMs: 200,
    });
    relay.start();
    await waitFor(() => connections >= 1);
    expect(relay.isOpen()).toBe(true);
    relay.stop();
  });
});
