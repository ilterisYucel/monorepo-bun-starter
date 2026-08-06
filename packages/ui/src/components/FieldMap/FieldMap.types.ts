export interface FieldMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "online" | "warning" | "offline";
  containerCount: number;
  onlineContainerCount: number;
  totalPowerMw?: number;
  avgSoc?: number;
  activeAlarms?: number;
}

export interface FieldMapProps {
  fields: FieldMarker[];
  onFieldClick?: (fieldId: string) => void;
  selectedFieldId?: string;
  height?: number | string;
  zoom?: number;
  center?: [number, number];
}
