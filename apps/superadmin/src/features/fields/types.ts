/**
 * Boss saha kaydı — `GET /api/admin/fields` (FieldPoller satırı) DTO'su.
 *
 * Alan adları backend satır şemasıyla birebir (`admin_fields`); sınır
 * eşlemesi `toFieldMarker` ile yapılır (UI bileşenleri snake_case görmez).
 */
export interface AdminField {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  api_url: string | null;
  status: string;
  container_count: number;
  online_containers: number;
  total_power_mw: number | null;
  avg_soc: number | null;
  active_alarms: number;
  last_seen_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  /** Saha tipi (wind | solar | hydro | battery | general ...) — harita glifi. */
  field_type: string | null;
}

/** Saha oluşturma/güncelleme girdisi — backend POST/PUT kontratı. */
export interface AdminFieldInput {
  name: string;
  location?: { lat: number; lng: number };
  apiUrl?: string;
  fieldType?: string;
  metadata?: Record<string, unknown>;
}
