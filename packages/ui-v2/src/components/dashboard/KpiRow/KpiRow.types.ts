export type KpiBarTone = "success" | "warning" | "critical" | "info" | "neutral";
export type KpiValueSize = "default" | "compact";

export interface KpiBarData {
  label: string;
  pct: number;
}

export interface KpiKv {
  label: string;
  value: string;
}

export interface KpiTrack {
  pct: number;
  tone: KpiBarTone;
}

export interface KpiBandMarker {
  /** 0–100 track yüzdesi. */
  pct: number;
  tone: "info" | "critical";
}

export interface KpiBand {
  /** Yeşil bölümün başlangıç yüzdesi. */
  start: number;
  /** Yeşil bölümün genişlik yüzdesi. */
  width: number;
  markers?: KpiBandMarker[];
}

export interface KpiCardData {
  key: string;
  label: string;
  value: string;
  unit?: string;
  tone?: KpiBarTone;
  valueSize?: KpiValueSize;
  bars?: KpiBarData[];
  kv?: KpiKv[];
  track?: KpiTrack;
  band?: KpiBand;
  caption?: string;
}

export interface KpiRowProps {
  items: KpiCardData[];
  className?: string;
}
