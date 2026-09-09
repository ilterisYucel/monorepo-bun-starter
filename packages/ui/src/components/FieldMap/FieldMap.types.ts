export interface FieldMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "online" | "warning" | "offline";
  /** Saha tipi (wind | solar | hydro | battery | general ...) — harita glifi. */
  type?: string;
  containerCount: number;
  onlineContainerCount: number;
  totalPowerMw?: number;
  avgSoc?: number;
  activeAlarms?: number;
}

export interface FieldMapProps {
  fields: FieldMarker[];
  /** Popup içindeki "Sahaya Git" benzeri buton ile saha detayına gidileceğinde çağrılır. */
  onOpenDetail?: (fieldId: string) => void;
  /** Popup detay butonu etiketi (uygulama katmanı dil anahtarıyla geçer). */
  detailLabel?: string;
  /** Çerçevesiz (arka plandan seçilmeyen) harita — boss Sahalar sayfası. */
  frameless?: boolean;
  selectedFieldId?: string;
  height?: number | string;
  zoom?: number;
  center?: [number, number];
}
