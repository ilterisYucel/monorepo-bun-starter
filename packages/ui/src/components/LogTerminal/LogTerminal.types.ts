// packages/ui/src/components/LogTerminal/types.ts
import type { LogProvider } from "../../interfaces/log-provider";

export interface LogTerminalProps {
  /** Log provider (IoC) */
  provider: LogProvider;
  /** Maksimum yükseklik (px) */
  maxHeight?: number;
}