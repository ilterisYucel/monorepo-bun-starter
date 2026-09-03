import type { ServerResponse } from "node:http";
import type { IStreamSink } from "@gd-monorepo/ws-tunnel";

/**
 * FastifyStreamSink — ws-tunnel `IStreamSink` sözleşmesinin Fastify adapter'i:
 * `reply.raw` (node ServerResponse) üzerine yazar. Tünel proxy'si Fastify'a
 * değil bu arayüze yazar (KUTUPHANE-CIKARMA-PLANI.md §4.1).
 */
export class FastifyStreamSink implements IStreamSink {
  constructor(private readonly raw: ServerResponse) {}

  status(code: number, headers?: Record<string, string>): void {
    this.raw.writeHead(code, headers ?? {});
  }

  write(chunk: Buffer): void {
    this.raw.write(chunk);
  }

  end(): void {
    this.raw.end();
  }

  destroy(): void {
    this.raw.destroy();
  }

  onClose(callback: () => void): void {
    this.raw.on("close", callback);
  }
}
