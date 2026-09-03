import type { LogEvent } from "./types";

/**
 * ILogSink — TamperLogger fan-out hedefi.
 *
 * - `write(events)` komut: verilen imzalı olayları kalıcılaştırır; başarısızlıkta
 *   fırlatır (drop/fail-closed kararı logger'dadır, sink'te değil).
 * - `close()` komut: kaynak kapatma — tekrar çağrılabilir olmalıdır.
 */
export interface ILogSink {
  name(): string;
  write(events: LogEvent[]): Promise<void>;
  close(): Promise<void>;
}
