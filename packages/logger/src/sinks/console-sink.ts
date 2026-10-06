import type { ILogSink, LogRecord } from "../types";

/**
 * ConsoleSink — insan-okur tek satır yazar ve console metodunu seviyeye eşler
 * (debug→console.debug, info→console.info, warn→console.warn, error→console.error).
 *
 * Satır biçimi: `ts [level] [service/component] message {context}`; `component`
 * yoksa `[service]`, `context` yoksa son blok atlanır.
 */
export class ConsoleSink implements ILogSink {
  write(record: LogRecord): void {
    const tag = record.component
      ? `${record.service}/${record.component}`
      : record.service;
    const context =
      record.context !== undefined ? ` ${JSON.stringify(record.context)}` : "";
    const line = `${record.ts} [${record.level}] [${tag}] ${record.message}${context}`;

    if (record.level === "debug") console.debug(line);
    else if (record.level === "info") console.info(line);
    else if (record.level === "warn") console.warn(line);
    else console.error(line);
  }
}
