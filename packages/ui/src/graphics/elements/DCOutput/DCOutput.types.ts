import type { OutputPosition } from "../../types";

export interface DCOutputProps {
  config: { step: number };
  output: OutputPosition;
  dcOutput?: { status: "online" | "offline"; voltage: number; current: number };
}
