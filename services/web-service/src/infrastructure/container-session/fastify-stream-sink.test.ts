import { describe, it, expect, vi } from "vitest";
import type { ServerResponse } from "node:http";
import { FastifyStreamSink } from "./fastify-stream-sink";

/**
 * FastifyStreamSink — IStreamSink adapter sözleşmesi:
 * status→writeHead, write→write, end→end, destroy→destroy, onClose→on("close").
 */
describe("FastifyStreamSink", () => {
  function makeRaw() {
    return {
      writeHead: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
    } as unknown as ServerResponse;
  }

  it("status → writeHead (headers varsayılan {})", () => {
    const raw = makeRaw();
    const sink = new FastifyStreamSink(raw);
    sink.status(200, { "content-type": "text/html" });
    expect(raw.writeHead).toHaveBeenCalledWith(200, { "content-type": "text/html" });
    sink.status(201);
    expect(raw.writeHead).toHaveBeenCalledWith(201, {});
  });

  it("write/end/destroy birebir delege edilir", () => {
    const raw = makeRaw();
    const sink = new FastifyStreamSink(raw);
    const chunk = Buffer.from("hello");
    sink.write(chunk);
    sink.end();
    sink.destroy();
    expect(raw.write).toHaveBeenCalledWith(chunk);
    expect(raw.end).toHaveBeenCalled();
    expect(raw.destroy).toHaveBeenCalled();
  });

  it("onClose → raw 'close' olayına abone olur", () => {
    const raw = makeRaw();
    const sink = new FastifyStreamSink(raw);
    const cb = vi.fn();
    sink.onClose(cb);
    expect(raw.on).toHaveBeenCalledWith("close", cb);
  });
});
