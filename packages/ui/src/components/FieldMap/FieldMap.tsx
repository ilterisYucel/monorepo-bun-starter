import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FieldMapProps } from "./FieldMap.types";
import * as S from "./FieldMap.styles";

const STATUS_LABEL: Record<string, string> = {
  online: "Aktif",
  warning: "Uyarı",
  offline: "Çevrimdışı",
};

const createColoredIcon = (status: "online" | "warning" | "offline") => {
  const color =
    status === "online" ? "#10b981" : status === "warning" ? "#f59e0b" : "#ef4444";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="12" fill="${color}" opacity="0.25" />
      <circle cx="14" cy="14" r="7" fill="${color}" stroke="#fff" stroke-width="2" />
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
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

export const FieldMap: React.FC<FieldMapProps> = ({
  fields,
  onFieldClick,
  height = "40vh",
  zoom = 6,
  center = [39.0, 35.0],
}) => {
  const icons = useMemo(
    () =>
      fields.reduce(
        (acc, f) => {
          acc[f.id] = createColoredIcon(f.status);
          return acc;
        },
        {} as Record<string, L.DivIcon>,
      ),
    [fields],
  );

  return (
    <S.MapWrapper $height={height}>
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
            eventHandlers={{
              click: () => onFieldClick?.(f.id),
            }}
          >
            <Popup>
              <S.PopupTitle>{f.name}</S.PopupTitle>
              <S.PopupRow>
                <S.PopupStatus $status={f.status}>
                  <S.PopupDot $status={f.status} />
                  {STATUS_LABEL[f.status]}
                  {" "}
                </S.PopupStatus>
                — {f.onlineContainerCount}/{f.containerCount} konteyner
              </S.PopupRow>
              {f.totalPowerMw !== undefined && (
                <S.PopupRow>Güç: {f.totalPowerMw.toFixed(1)} MW</S.PopupRow>
              )}
              {f.avgSoc !== undefined && (
                <S.PopupRow>SoC: %{Math.round(f.avgSoc)}</S.PopupRow>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </S.MapWrapper>
  );
};
