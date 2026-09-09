import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "../../core/TranslationProvider";
import { FieldCard } from "../FieldCard/FieldCard";
import type { FieldMapProps } from "./FieldMap.types";
import * as S from "./FieldMap.styles";

/** Saha tipi glifleri (24x24 viewBox; beyaz stroke — status rengi daire üstüne). */
const GLYPH_PATHS: Record<string, string> = {
  wind: `<circle cx="12" cy="12" r="2.2"/><path d="M12 9.2V3.8M10 10.9L4.8 13.9M14 10.9L19.2 13.9"/>`,
  solar: `<rect x="4.5" y="8.5" width="15" height="8" rx="1.2"/><path d="M4.5 12.5h15"/>`,
  hydro: `<path d="M12 3.2C12 8 5.6 9.9 5.6 14.3a6.4 6.4 0 0 0 12.8 0C18.4 9.9 12 8 12 3.2Z"/>`,
  battery: `<path d="M13.4 2.6 5.4 13.2h5l-1.8 8.2 8-10.6h-5Z"/>`,
  general: `<circle cx="12" cy="12" r="2.6"/>`,
};

const DEFAULT_GLYPH = GLYPH_PATHS.general;

/**
 * Tip + durum işaretçisi: dış halo ve iç daire status renginde (durum
 * haritada bir bakışta okunur), üstünde beyaz saha tipi glifi.
 */
const createFieldIcon = (
  status: "online" | "warning" | "offline",
  fieldType: string | undefined,
) => {
  const color =
    status === "online" ? "#10b981" : status === "warning" ? "#f59e0b" : "#ef4444";
  const glyph = GLYPH_PATHS[fieldType ?? ""] ?? DEFAULT_GLYPH;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="13" fill="${color}" opacity="0.22" />
      <circle cx="15" cy="15" r="9.5" fill="${color}" stroke="#fff" stroke-width="1.5" />
      <g transform="translate(3,3)" stroke="#fff" fill="none" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round"
         data-field-type="${fieldType ?? "general"}">
        ${glyph}
      </g>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const FitBounds: React.FC<{ fields: FieldMapProps["fields"] }> = ({ fields }) => {
  const map = useMap();

  useEffect(() => {
    if (fields.length === 0) return;
    const bounds = L.latLngBounds(fields.map((f) => [f.lat, f.lng] as [number, number]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [fields, map]);

  return null;
};

/**
 * FieldMap — saha konum haritası (react-leaflet).
 * Marker tıklaması navigasyon YAPMAZ; popup açar. Popup içindeki detay
 * butonu `onOpenDetail(fieldId)` çağırır (saha detay sayfasına gidilir).
 */
export const FieldMap: React.FC<FieldMapProps> = ({
  fields,
  onOpenDetail,
  detailLabel,
  frameless = false,
  height = "40vh",
  zoom = 6,
  center = [39.0, 35.0],
}) => {
  const { t } = useTranslation();

  const icons = useMemo(
    () =>
      fields.reduce(
        (acc, f) => {
          acc[f.id] = createFieldIcon(f.status, f.type);
          return acc;
        },
        {} as Record<string, L.DivIcon>,
      ),
    [fields],
  );

  return (
    <S.MapWrapper $height={height} $frameless={frameless}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds fields={fields} />
        {fields.map((f) => (
          <Marker
            key={f.id}
            position={[f.lat, f.lng]}
            icon={icons[f.id]}
          >
            <Popup>
              <S.PopupCard>
                <FieldCard
                  field={f}
                  size="small"
                  onClick={onOpenDetail ? () => onOpenDetail(f.id) : undefined}
                />
                {onOpenDetail && (
                  <S.DetailButton
                    onClick={() => onOpenDetail(f.id)}
                  >
                    {detailLabel ?? t("common.detail")}
                  </S.DetailButton>
                )}
              </S.PopupCard>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </S.MapWrapper>
  );
};
