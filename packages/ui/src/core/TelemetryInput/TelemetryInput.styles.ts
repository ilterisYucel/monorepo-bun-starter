// packages/ui/src/core/TelemetryInput/TelemetryInput.styles.ts
import { styled } from "just-styled";

// Container
export const Container = styled("div", {
  background: "#1a1a2e",
  border: "1px solid #3a3a4a",
  borderRadius: "12px",
  transition: "all 0.2s ease",
  width: "100%",
  variants: {
    disabled: {
      true: { opacity: 0.6, cursor: "not-allowed", borderColor: "#2a2a3a" },
      false: { "&:hover": { borderColor: "#3b82f6", background: "#1f1f2e" } },
    },
    size: {
      small: { padding: "12px" },
      medium: { padding: "16px" },
      large: { padding: "20px" },
    },
  },
});

// Header
export const Header = styled("div", {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
  flexWrap: "wrap",
  gap: "8px",
});

export const LabelSection = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
});

export const Name = styled("span", {
  fontSize: "14px",
  fontWeight: 600,
  color: "#e5e7eb",
});
export const DeviceId = styled("span", {
  fontSize: "11px",
  color: "#6b7280",
  background: "#2a2a3a",
  padding: "2px 8px",
  borderRadius: "4px",
  fontFamily: "monospace",
});
export const TagsContainer = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  flexWrap: "wrap",
});
export const Tag = styled("span", {
  fontSize: "10px",
  color: "#9ca3af",
  background: "#2a2a3a",
  padding: "2px 6px",
  borderRadius: "4px",
  border: "1px solid #3a3a4a",
});

// Input Group - hepsi aynı container, aynı arka plan
export const InputGroup = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "#0f0f1a",
  border: "1px solid #2a2a3a",
  borderRadius: "8px",
  padding: "8px 12px",
  margin: "0px 12px",
  "&:focus-within": {
    borderColor: "#3b82f6",
    boxShadow: "0 0 0 2px #3b82f620",
  },
});

// Value Input - flex ile büyür
export const ValueInput = styled("input", {
  flex: 1,
  backgroundColor: "transparent",
  border: "none",
  color: "#e5e7eb",
  fontFamily: "monospace",
  fontSize: "20px",
  fontWeight: 500,
  textAlign: "left",
  outline: "none",
  "&:focus": { outline: "none" },
});

// Unit - sabit genişlik
export const Unit = styled("span", {
  background: "transparent",
  color: "#9ca3af",
  fontSize: "14px",
  fontWeight: 500,
  minWidth: "40px",
  textAlign: "right",
});

// Ok tuşları
export const Controls = styled("div", {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

export const ControlBtn = styled("button", {
  background: "#2a2a3a",
  border: "none",
  borderRadius: "4px",
  color: "#9ca3af",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "22px",
  fontSize: "11px",
  transition: "all 0.2s",
  "&:hover": { background: "#3b82f6", color: "white" },
  "&:active": { transform: "scale(0.92)" },
  "&:disabled": { opacity: 0.4, cursor: "not-allowed" },
});

// Footer
export const Description = styled("div", {
  fontSize: "11px",
  color: "#6b7280",
  marginTop: "8px",
  lineHeight: 1.4,
});
export const LimitIndicator = styled("div", {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "4px",
  fontSize: "9px",
  color: "#4a4a5a",
  fontFamily: "monospace",
});
