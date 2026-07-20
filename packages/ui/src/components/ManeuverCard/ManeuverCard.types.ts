import type { ManeuverConfig } from "@gd-monorepo/shared-types";

export interface StepResult {
  deviceId: string;
  command: string;
  success: boolean;
  reason?: string;
}

export interface InputField {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface ManeuverCardState {
  status: "idle" | "running" | "success" | "failed";
  stepResults: StepResult[];
}

export interface ManeuverCardProps {
  maneuver: ManeuverConfig;
  state: "idle" | "running" | "success" | "failed";
  stepResults?: StepResult[];

  inputs?: InputField[];
  timer?: boolean;

  onRun: (values: Record<string, number>) => void;
  onTimerExpired?: () => void;
  onRetry?: () => void;
  onRollback?: () => void;
}
