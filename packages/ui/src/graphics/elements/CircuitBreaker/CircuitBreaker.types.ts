import type { BreakerBusLayout } from "../../types";

export interface CircuitBreakerProps {
  config: { step: number };
  positions: BreakerBusLayout;
  breakerStatus: "online" | "offline";
  breakerPosition: "open" | "close";
  onClick?: () => void;
}
