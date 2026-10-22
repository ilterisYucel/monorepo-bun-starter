import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { SerialSocketAdapter } from "./serial-socket-adapter";
import type { SerialPortLike } from "./serial-socket-adapter";

/**
 * SerialSocketAdapter sözleşmesi:
 * - jsmodbus RTU'nun beklediği socket yüzeyi: `'open'` + `isOpen` + `write(data, cb)`
 * - `'data'` (Uint8Array) → `Buffer` olarak iletilir
 * - `'error'` / `'close'` birebir aktarılır; `close()` best-effort
 * - port enjekte edilir (bun:ffi yüklemesi connect anına ertelenir)
 */

class FakePort extends EventEmitter implements SerialPortLike {
  isOpen = false;
  write = vi.fn(async (_data: Uint8Array) => undefined);
  close = vi.fn(async () => {
    this.isOpen = false;
  });
  open = vi.fn(async () => {
    this.isOpen = true;
  });
  override on(event: string, handler: (...args: never[]) => void): this {
    return super.on(event, handler as (...args: unknown[]) => void);
  }
}

let port: FakePort;

beforeEach(() => {
  port = new FakePort();
  vi.restoreAllMocks();
});

describe("SerialSocketAdapter", () => {
  it("isOpen port durumunu yansıtır", () => {
    const adapter = new SerialSocketAdapter(port);
    expect(adapter.isOpen).toBe(false);
    port.isOpen = true;
    expect(adapter.isOpen).toBe(true);
  });

  it("'open' / 'error' / 'close' olayları aktarılır", () => {
    const adapter = new SerialSocketAdapter(port);
    const onOpen = vi.fn();
    const onError = vi.fn();
    const onClose = vi.fn();
    adapter.on("open", onOpen);
    adapter.on("error", onError);
    adapter.on("close", onClose);

    port.emit("open");
    const boom = new Error("EIO");
    port.emit("error", boom);
    port.emit("close");

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(boom);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("'data' Uint8Array → Buffer olarak iletilir", () => {
    const adapter = new SerialSocketAdapter(port);
    const onData = vi.fn();
    adapter.on("data", onData);

    port.emit("data", new Uint8Array([0x01, 0x02, 0x03]));

    expect(onData).toHaveBeenCalledTimes(1);
    const chunk = onData.mock.calls[0]![0] as Buffer;
    expect(Buffer.isBuffer(chunk)).toBe(true);
    expect([...chunk]).toEqual([1, 2, 3]);
  });

  it("write → port.write + callback başarı/hata iletir", async () => {
    const adapter = new SerialSocketAdapter(port);
    const ok = vi.fn();
    adapter.write(new Uint8Array([0xaa]), ok);
    await vi.waitFor(() => expect(ok).toHaveBeenCalledTimes(1));
    expect(port.write).toHaveBeenCalledWith(new Uint8Array([0xaa]));

    const boom = new Error("EIO");
    port.write.mockRejectedValueOnce(boom);
    const fail = vi.fn();
    adapter.write(new Uint8Array([0xbb]), fail);
    await vi.waitFor(() => expect(fail).toHaveBeenCalledWith(boom));
  });

  it("close best-effort — hata yutulur", async () => {
    const adapter = new SerialSocketAdapter(port);
    adapter.close();
    await vi.waitFor(() => expect(port.close).toHaveBeenCalledTimes(1));

    port.close.mockRejectedValueOnce(new Error("Port is not open"));
    expect(() => adapter.close()).not.toThrow();
  });
});
