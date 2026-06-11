// packages/ui/src/components/MultiLineChart/MultiLineChart.styles.ts
import { styled } from "just-styled";

export const Container = styled("div", {
  background: "#1f1f2e",
  borderRadius: "12px",
  padding: "16px",
});

export const Title = styled("h4", {
  marginBottom: "16px",
  color: "#e5e7eb",
  fontSize: "16px",
  fontWeight: 600,
});

export const Empty = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#1f1f2e",
  borderRadius: "12px",
  color: "#6b7280",
});

// Recharts için stiller (object olarak dışa aktar)
export const cartesianGrid = { stroke: "#2a2a3a", strokeDasharray: "3 3" };
export const xAxis = { stroke: "#9ca3af", fontSize: 11, fill: "#9ca3af" };
export const yAxis = { stroke: "#9ca3af", fontSize: 11, fill: "#9ca3af" };
export const tooltipContent = {
  background: "#1f1f2e",
  border: "1px solid #2a2a3a",
  borderRadius: "8px",
};
export const tooltipLabel = { color: "#e5e7eb" };
export const legend = { color: "#9ca3af" };

export const DEFAULT_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#d946ef",
  "#0ea5e9",
  "#eab308",
  "#a855f7",
  "#22c55e",
];
