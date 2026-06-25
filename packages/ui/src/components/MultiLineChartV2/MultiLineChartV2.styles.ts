export {
  DEFAULT_COLORS,
  Container,
  Title,
  Subtitle,
  Skeleton,
  Empty,
  LegendTable,
  LegendHeader,
  LegendRow,
  LegendCell,
  LegendColor,
} from "../MultiLineChart/MultiLineChart.styles";

export const uPlotContainerStyle: React.CSSProperties = {
  width: "100%",
  position: "relative",
};

export const tooltipStyle: React.CSSProperties = {
  position: "absolute",
  background: "#1a1a2e",
  border: "1px solid #2a2a3a",
  borderRadius: "10px",
  padding: "10px 14px",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
  minWidth: "160px",
  zIndex: 20,
  pointerEvents: "none",
  fontSize: "12px",
};
