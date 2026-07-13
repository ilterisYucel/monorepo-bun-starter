// packages/ui/src/components/PowerFlowAnimation/types.ts

import type { Rack } from "../../../types";
import type { ChargeStatus } from "@gd-monorepo/shared-types";

export interface PowerFlowAnimationProps {
  /** Akış yönü: Charge (Şarj), Discharge (Deşarj), Idle (Bekleme) */
  flowDirection: ChargeStatus;
  /** Rack listesi (16 adet) */
  racks: Rack[];
  /** Yükseklik (px) */
  height?: number;
}
