import React from "react";

/**
 * Test stub — react-leaflet yerine geçer (vitest alias, apps/superadmin).
 * jsdom'da gerçek leaflet render'ı gerekmez; testid'lerle sözleşme sabitlenir.
 */
export const MapContainer: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => <div data-testid="map-container">{children}</div>;

export const TileLayer: React.FC = () => null;

export const useMap = () => ({ fitBounds: () => undefined });

export const Marker: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => <div data-testid="marker">{children}</div>;

export const Popup: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div data-testid="popup">{children}</div>
);
