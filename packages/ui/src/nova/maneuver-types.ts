/**
 * Manevra sihirbazı paylaşımlı tipleri (SPEC UC-5). Backend kataloğu
 * (ManeuverRecord/OperationRecord) app'te bu şekle indirgenir; ui bileşenleri
 * backend tipine bağımlı olmaz.
 */

export interface DemoManeuverInput {
  name: string;
  label?: string;
  type?: "number" | "string" | "boolean";
  min?: number;
  max?: number;
  step?: number;
  default?: number | string | boolean;
}

export interface DemoManeuverItem {
  name: string;
  label: string;
  description?: string;
  kind: "maneuver" | "operation";
  inputs?: DemoManeuverInput[];
  /** Zamanlı durdurma destekliyorsa (opsiyonel süre alanı). */
  timer?: boolean;
  hidden?: boolean;
}

export interface DemoScopeUnit {
  n: number;
  feeder: string;
  note: string;
  disabled?: boolean;
}

export interface DemoRunStep {
  label: string;
  status: "pending" | "active" | "done" | "failed" | string;
}

export interface DemoActiveRun {
  name: string;
  label: string;
  status: string;
  steps: DemoRunStep[];
}
