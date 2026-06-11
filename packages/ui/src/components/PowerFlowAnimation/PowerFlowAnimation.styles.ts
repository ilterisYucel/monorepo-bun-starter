// packages/ui/src/components/PowerFlowAnimation/PowerFlowAnimation.styles.ts
import { styled } from "just-styled";

// Keyframes
export const pulseCharge = {
  "0%, 100%": { boxShadow: "0 0 0 0 #10b98140" },
  "50%": { boxShadow: "0 0 0 8px #10b98120" },
};

export const pulseDischarge = {
  "0%, 100%": { boxShadow: "0 0 0 0 #f59e0b40" },
  "50%": { boxShadow: "0 0 0 8px #f59e0b20" },
};

export const fadeIn = {
  from: { opacity: 0, transform: "translateY(-8px)" },
  to: { opacity: 1, transform: "translateY(0)" },
};

// Container
export const Container = styled("div", {
  background: "#1f1f2e",
  borderRadius: "20px",
  padding: "20px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
});

// Header
export const Header = styled("div", {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  flexWrap: "wrap",
  gap: "12px",
  paddingBottom: "12px",
  borderBottom: "1px solid #2a2a3a",
});

export const Title = styled("h3", {
  margin: 0,
  fontSize: "18px",
  fontWeight: 600,
  color: "#e5e7eb",
  display: "flex",
  alignItems: "center",
  gap: "8px",
});

// Flow Status
export const FlowStatus = styled("div", {
  padding: "6px 16px",
  borderRadius: "24px",
  fontSize: "12px",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  gap: "6px",
});

export const FlowStatusCharge = styled("div", {
  background: "#10b98120",
  color: "#10b981",
  border: "1px solid #10b981",
  animation: `1.5s infinite ${pulseCharge}`,
  "&::before": {
    content: '"🔌"',
    fontSize: "12px",
  },
});

export const FlowStatusDischarge = styled("div", {
  background: "#f59e0b20",
  color: "#f59e0b",
  border: "1px solid #f59e0b",
  animation: `1.5s infinite ${pulseDischarge}`,
  "&::before": {
    content: '"⚡"',
    fontSize: "12px",
  },
});

export const FlowStatusIdle = styled("div", {
  background: "#6b728020",
  color: "#9ca3af",
  border: "1px solid #6b7280",
  "&::before": {
    content: '"⏸️"',
    fontSize: "12px",
  },
});

// Legend
export const Legend = styled("div", {
  display: "flex",
  justifyContent: "center",
  gap: "24px",
  marginTop: "20px",
  paddingTop: "16px",
  borderTop: "1px solid #2a2a3a",
  flexWrap: "wrap",
});

export const LegendItem = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
  color: "#9ca3af",
  background: "#0f0f1a",
  padding: "6px 12px",
  borderRadius: "24px",
  transition: "all 0.2s",
  cursor: "pointer",
  "&:hover": {
    background: "#1f1f2e",
    transform: "translateY(-1px)",
  },
});

// Legend Icons
export const LegendBattery = styled("span", {
  width: "20px",
  height: "14px",
  background: "#1e1e2e",
  border: "1px solid #3d3d5e",
  borderRadius: "3px",
  position: "relative",
  "&::after": {
    content: '"+"',
    position: "absolute",
    top: "-4px",
    right: "-2px",
    fontSize: "8px",
    color: "#3d3d5e",
  },
});

export const LegendSwitch = styled("span", {
  width: "16px",
  height: "16px",
  background: "#fbbf24",
  borderRadius: "50%",
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  "&::after": {
    content: '"⚡"',
    position: "absolute",
    fontSize: "8px",
    color: "#1f1f2e",
  },
});

export const LegendGrid = styled("span", {
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  border: "2px solid #fbbf24",
  background: "#fef3c7",
});

export const LegendFlowCharge = styled("span", {
  width: "24px",
  height: "4px",
  background: "#10b981",
  position: "relative",
  borderRadius: "2px",
  "&::after": {
    content: '"←"',
    position: "absolute",
    right: "-8px",
    top: "-6px",
    color: "#10b981",
    fontSize: "12px",
    fontWeight: "bold",
  },
});

export const LegendFlowDischarge = styled("span", {
  width: "24px",
  height: "4px",
  background: "#f59e0b",
  position: "relative",
  borderRadius: "2px",
  "&::after": {
    content: '"→"',
    position: "absolute",
    right: "-8px",
    top: "-6px",
    color: "#f59e0b",
    fontSize: "12px",
    fontWeight: "bold",
  },
});

export const LegendClick = styled("span", {
  width: "16px",
  height: "16px",
  background: "#3b82f6",
  borderRadius: "4px",
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  "&::after": {
    content: '"🔍"',
    position: "absolute",
    fontSize: "10px",
  },
});

// Popover
export const Popover = styled("div", {
  animation: `0.2s ease ${fadeIn}`,
});

export const PopoverContent = styled("div", {
  background: "#1f1f2e",
  border: "1px solid #3b82f6",
  borderRadius: "16px",
  padding: "14px 18px",
  minWidth: "240px",
  boxShadow: "0 12px 28px rgba(0, 0, 0, 0.5)",
  backdropFilter: "blur(4px)",
});

export const PopoverHeader = styled("div", {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
  paddingBottom: "10px",
  borderBottom: "1px solid #2a2a3a",
});

export const PopoverHeaderStrong = styled("strong", {
  color: "#e5e7eb",
  fontSize: "15px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  "&::before": {
    content: '"🔋"',
    fontSize: "14px",
  },
});

export const StatusBadge = styled("span", {
  fontSize: "10px",
  padding: "3px 10px",
  borderRadius: "20px",
  fontWeight: 600,
});

export const StatusBadgeOnline = styled("span", {
  background: "#10b98120",
  color: "#10b981",
  border: "1px solid #10b98140",
});

export const StatusBadgeOffline = styled("span", {
  background: "#ef444420",
  color: "#ef4444",
  border: "1px solid #ef444440",
});

export const PopoverBody = styled("div", {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
});

export const PopoverRow = styled("div", {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "12px",
  color: "#9ca3af",
  padding: "2px 0",
});

export const PopoverRowStrong = styled("strong", {
  color: "#e5e7eb",
  fontWeight: 600,
});

export const ChargeStatusCharge = styled("span", {
  color: "#10b981",
  fontWeight: 600,
});

export const ChargeStatusDischarge = styled("span", {
  color: "#f59e0b",
  fontWeight: 600,
});

export const ChargeStatusIdle = styled("span", {
  color: "#6b7280",
  fontWeight: 600,
});
