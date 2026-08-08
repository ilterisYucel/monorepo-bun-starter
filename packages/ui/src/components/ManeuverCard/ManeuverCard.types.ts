import type { ManeuverConfig, CommandStep } from "@gd-monorepo/shared-types";

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
  deviceId?: string;
  description?: string;
  min: number;
  max: number;
  step: number;
  default: number;
  type?: "number" | "select";
  options?: Array<{ value: number; label: string }>;
}

export interface ManeuverCardLabels {
  inputs: string;
  steps: string;
  timed: string;
  duration: string;
  seconds: string;
  remaining: string;
  cancel: string;
  schedule: string;
  rollback: string;
  retry: string;
  run: string;
  now: string;
  scheduled: string;
  running: string;
}

export interface ManeuverCardState {
  status: "idle" | "running" | "timer" | "success" | "failed";
  stepResults: StepResult[];
}

export interface ManeuverCardProps {
  maneuver: ManeuverConfig;
  state: "idle" | "running" | "timer" | "success" | "failed";
  stepResults?: StepResult[];

  inputs?: InputField[];
  timerConfig?: boolean;

  onRun: (values: Record<string, number>, timer?: { durationSeconds: number }) => void;
  onTimerExpired?: () => void;
  onRetry?: () => void;
  onRollback?: () => void;

  labels?: ManeuverCardLabels;
}

/** Kullanıcı girdilerini adım-spesifik parametrelere dönüştürür */
export type ManeuverTransform = (
  values: Record<string, number>,
  steps: CommandStep[],
) => Record<string, number>[];