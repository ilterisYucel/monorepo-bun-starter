import type { CommandStep } from "./command";

/** Manevra konfigürasyonu — birden fazla cihaza sıralı/paralel komut zinciri */
export interface ManeuverConfig {
  name: string;
  label: string;
  description?: string;
  mode: "parallel" | "sequential";
  steps: CommandStep[];
  rollbackSteps?: CommandStep[];
  onFailure?: "stop" | "continue";
}
