import { open, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { FileHandle } from "node:fs/promises";
import type { LogEvent } from "../types";
import type { ILogSink } from "../interfaces";

/** FileSink yapılandırması — tek obje (DI kuralı 3). */
export interface FileSinkConfig {
  readonly path: string;
}

/**
 * FileSink — append-only dosya sink'i. Her flush sonrası fsync (dayanıklılık).
 * Zincir alanları (seq/prevHash/signature) dosyaya birebir yazılır;
 * `tools/verify-log.mjs` bu dosyayı doğrular.
 * İlk yazımda üst dizini oluşturur (ör. `/var/log/gd-pms` imajda yoksa —
 * fail-closed akışların çevre eksikliğinden kırılmaması için).
 */
export class FileSink implements ILogSink {
  private handle: FileHandle | undefined;
  private closed = false;

  constructor(private readonly config: FileSinkConfig) {}

  name(): string {
    return "file";
  }

  async write(events: LogEvent[]): Promise<void> {
    if (this.closed) {
      throw new Error("[FileSink] kapalı — yazma reddedildi");
    }
    if (events.length === 0) return;
    const handle =
      this.handle ??
      (this.handle = await (async () => {
        await mkdir(dirname(this.config.path), { recursive: true });
        return open(this.config.path, "a");
      })());
    const content =
      events.map((event) => JSON.stringify(event)).join("\n") + "\n";
    await handle.writeFile(content);
    await handle.sync();
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.handle !== undefined) {
      await this.handle.close();
      this.handle = undefined;
    }
  }
}
