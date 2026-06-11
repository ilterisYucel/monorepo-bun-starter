// packages/ui/src/components/TelemetryChart/TelemetryChart.styles.ts
import { styled } from "just-styled";

export const Container = styled("div", {
  background: "#1a1a2e",
  borderRadius: "16px",
  border: "1px solid #2a2a3a",
  overflow: "hidden",
});

export const Controls = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  padding: "12px 20px",
  background: "#1f1f2e",
  flexWrap: "wrap",
  "@media (max-width: 640px)": {
    flexDirection: "column",
    alignItems: "stretch",
  },
});

export const ControlGroup = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  "@media (max-width: 640px)": {
    justifyContent: "space-between",
  },
});

export const ControlLabel = styled("label", {
  color: "#9ca3af",
  fontSize: "13px",
  fontWeight: 500,
});

export const ControlSelect = styled("select", {
  background: "#1a1a2e",
  border: "1px solid #2a2a3a",
  color: "#e5e7eb",
  padding: "6px 12px",
  borderRadius: "8px",
  fontSize: "13px",
  cursor: "pointer",
  transition: "all 0.2s",
  "&:hover": {
    borderColor: "#3b82f6",
  },
});

export const RangeIndicator = styled("div", {
  display: "flex",
  gap: "8px",
  marginLeft: "auto",
  "@media (max-width: 640px)": {
    marginLeft: 0,
    justifyContent: "center",
  },
});

export const RangeBadge = styled("span", {
  fontSize: "11px",
  padding: "4px 10px",
  borderRadius: "20px",
  background: "#1a1a2e",
  border: "1px solid #3b82f640",
  color: "#3b82f6",
});

export const PointsBadge = styled("span", {
  fontSize: "11px",
  padding: "4px 10px",
  borderRadius: "20px",
  background: "#1a1a2e",
  border: "1px solid #10b98140",
  color: "#10b981",
});

export const Loading = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#1f1f2e",
  borderRadius: "12px",
  color: "#9ca3af",
});

export const Error = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#1f1f2e",
  borderRadius: "12px",
  color: "#ef4444",
});
