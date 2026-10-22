import type { ILogger, TunnelLogInput } from "@gd-monorepo/ws-tunnel";

/** ConsoleLogger — minimal stdout logger adapter'ı. */
export class ConsoleLogger implements ILogger {
  async log(input: TunnelLogInput): Promise<void> {
    const line = `[${input.category}] ${input.eventCode} ${input.message}`;
    const context = input.context ? ` ${JSON.stringify(input.context)}` : "";
    if (input.level === "error" || input.level === "fatal") {
      console.error(line + context);
    } else if (input.level === "warn") {
      console.warn(line + context);
    } else {
      console.log(line + context);
    }
  }
}
