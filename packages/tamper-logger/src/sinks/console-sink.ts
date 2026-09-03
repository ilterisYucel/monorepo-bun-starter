import type { LogEvent } from "../types";
import type { ILogSink } from "../interfaces";

/**
 * ConsoleSink — her olayı seviye eşlemeli console metoduna JSON satırı yazar.
 * debug→console.debug, info→console.info, warn→console.warn,
 * error/fatal→console.error.
 */
export class ConsoleSink implements ILogSink {
  name(): string {
    return "console";
  }

  async write(events: LogEvent[]): Promise<void> {
    for (const event of events) {
      const line = JSON.stringify(event);
      if (event.level === "debug") console.debug(line);
      else if (event.level === "info") console.info(line);
      else if (event.level === "warn") console.warn(line);
      else console.error(line);
    }
  }

  async close(): Promise<void> {}
}
