// packages/ui/src/components/PowerFlowAnimation/types.ts

import type { Rack } from "../../types";

export interface PowerFlowAnimationProps {
  /** Akış yönü: Charge (Şarj), Discharge (Deşarj), Idle (Bekleme) */
  flowDirection: "Charge" | "Discharge" | "Idle";
  /** Rack listesi (16 adet) */
  racks: Rack[];
  /** Yükseklik (px) */
  height?: number;
}
