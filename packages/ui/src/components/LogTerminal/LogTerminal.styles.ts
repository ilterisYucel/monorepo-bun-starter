// packages/ui/src/components/LogTerminal/LogTerminal.styles.ts
import { styled } from "just-styled";

// Header
export const Header = styled("div", {
  flexShrink: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  background: "#1a1a2e",
  borderBottom: "1px solid #2a2a3a",
});

export const Title = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "13px",
  fontWeight: 600,
  color: "#e5e7eb",
});

export const ClearBtn = styled("button", {
  background: "#ef444420",
  border: "1px solid #ef444640",
  color: "#ef4444",
  padding: "4px 10px",
  borderRadius: "6px",
  fontSize: "11px",
  cursor: "pointer",
  transition: "all 0.2s",
  flexShrink: 0,
  "&:hover": {
    background: "#ef444430",
    borderColor: "#ef444480",
  },
});

// Body
export const Body = styled("div", {
  flex: 1,
  overflowY: "auto",
  minHeight: 0,
  padding: "8px",
  "&::-webkit-scrollbar": { width: "4px" },
  "&::-webkit-scrollbar-track": { background: "#1a1a2e" },
  "&::-webkit-scrollbar-thumb": {
    background: "#3b82f6",
    borderRadius: "4px",
  },
});

// Empty state
export const Empty = styled("div", {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  minHeight: "150px",
  color: "#6b7280",
  gap: "8px",
  padding: "32px",
  textAlign: "center",
});

export const EmptyIcon = styled("span", {
  fontSize: "48px",
  opacity: 0.5,
});

export const EmptyText = styled("p", {
  margin: 0,
  fontSize: "14px",
});

export const EmptySmall = styled("small", {
  fontSize: "11px",
});

// Log entry base
export const Entry = styled("div", {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "8px 12px",
  marginBottom: "6px",
  borderRadius: "8px",
  fontSize: "12px",
  background: "#1a1a2e",
  borderLeft: "3px solid transparent",
  transition: "all 0.2s",
  "&:hover": {
    background: "#1f1f2e",
    transform: "translateX(2px)",
  },
});

// Entry variants
export const EntrySuccess = styled("div", {
  borderLeftColor: "#10b981",
  "& .log-icon": { color: "#10b981" },
});

export const EntryError = styled("div", {
  borderLeftColor: "#ef4444",
  "& .log-icon": { color: "#ef4444" },
});

export const EntryWarning = styled("div", {
  borderLeftColor: "#f59e0b",
  "& .log-icon": { color: "#f59e0b" },
});

export const EntryInfo = styled("div", {
  borderLeftColor: "#3b82f6",
  "& .log-icon": { color: "#3b82f6" },
});

// Entry parts
export const Time = styled("div", {
  fontSize: "10px",
  color: "#6b7280",
  minWidth: "65px",
  fontFamily: "monospace",
  flexShrink: 0,
});

export const Icon = styled("div", {
  minWidth: "45px",
  fontSize: "12px",
  flexShrink: 0,
});

export const Message = styled("div", {
  flex: 1,
  color: "#e5e7eb",
  wordBreak: "break-word",
});

export const Details = styled("div", {
  fontSize: "10px",
  color: "#6b7280",
  marginTop: "4px",
  paddingLeft: "8px",
  borderLeft: "1px solid #2a2a3a",
});

// Footer
export const Footer = styled("div", {
  flexShrink: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 16px",
  background: "#1a1a2e",
  borderTop: "1px solid #2a2a3a",
  fontSize: "10px",
  color: "#6b7280",
});

export const Legend = styled("div", {
  display: "flex",
  gap: "12px",
});

export const LegendSuccess = styled("span", { color: "#10b981" });
export const LegendError = styled("span", { color: "#ef4444" });
export const LegendWarning = styled("span", { color: "#f59e0b" });
export const LegendInfo = styled("span", { color: "#3b82f6" });
