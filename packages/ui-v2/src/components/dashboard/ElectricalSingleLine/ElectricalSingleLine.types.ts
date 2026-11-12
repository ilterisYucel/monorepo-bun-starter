export type RackTone = "normal" | "warning" | "alarm" | "offline";

export interface RackReading {
  id: string;
  soc: number;
  temperature: number;
  voltage: number;
  current: number;
  tone?: RackTone;
  /** Seçili (info tint) rack. */
  selected?: boolean;
  /** Min cell V vurgu barının indeksi (0–11). */
  minCellBarIndex?: number;
  /** Alarm vurgu barının indeksi (0–11). */
  alarmBarIndex?: number;
}

export interface BscBlock {
  id: string;
  racks: RackReading[];
  dcBusLabel: string;
}

export interface CbmBlock {
  id: string;
  state: string;
  voltage: number;
  current: number;
  /** IMD chip değeri, örn. "2,84 MΩ". */
  imd?: string;
}

export interface PcsBlock {
  id: string;
  state: string;
  power: string;
  tone?: "success" | "warning" | "critical";
}

export interface RmuBlock {
  title: string;
  state: string;
  lines: string[];
  values: Array<{ label: string; value: string }>;
}

export interface TrafoBlock {
  title: string;
  voltage: string;
  vector: string;
}

export interface ElectricalSingleLineProps {
  title?: string;
  bscs: BscBlock[];
  cbms: CbmBlock[];
  pcs: PcsBlock[];
  rmu: RmuBlock;
  /** Kavşak ortası trafo verileri (TR 3 ...). */
  trafo?: TrafoBlock;
  /** Discharge path (turuncu) vurgusu; varsayılan aktif. */
  energized?: boolean;
  onRackSelect?: (rackId: string) => void;
  className?: string;
}
