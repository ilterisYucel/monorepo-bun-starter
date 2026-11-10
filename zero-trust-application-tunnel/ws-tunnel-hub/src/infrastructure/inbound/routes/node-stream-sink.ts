import type { ServerResponse } from "node:http";
import type { IStreamSink } from "@gd-monorepo/ws-tunnel";

/** NodeStreamSink — IStreamSink'in node ServerResponse adapter'i (hexagonal). */
export class NodeStreamSink implements IStreamSink {
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
