// packages/ui/src/components/RackCard/RackCard.styles.ts
import { styled } from "just-styled";

// Rack Card Container
export const Card = styled("div", {
  background: "#1a1a2e",
  border: "1px solid #2a2a3a",
  borderRadius: "20px",
  padding: "20px",
  transition: "all 0.2s ease",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  cursor: "pointer",
  "@media (max-width: 480px)": {
    padding: "16px",
  },
  "&:hover": {
    transform: "translateY(-2px)",
    borderColor: "#3b82f6",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
  },
});

// Header
export const Header = styled("div", {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  flexWrap: "wrap",
  gap: "12px",
  "@media (max-width: 480px)": {
    flexWrap: "wrap",
  },
});

export const Name = styled("span", {
  fontWeight: 700,
  color: "#e5e7eb",
  fontSize: "18px",
  letterSpacing: "0.5px",
});

export const Badges = styled("div", {
  display: "flex",
  gap: "8px",
  "@media (max-width: 480px)": {
    flexWrap: "wrap",
  },
});

// Badge components (doğrudan styled)
export const BadgeOnline = styled("span", {
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "#10b98120",
  color: "#10b981",
  border: "1px solid #10b981",
});

export const BadgeOffline = styled("span", {
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "#ef444420",
  color: "#ef4444",
  border: "1px solid #ef4444",
});

export const BadgeCharge = styled("span", {
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "#10b98120",
  color: "#10b981",
  border: "1px solid #10b981",
});

export const BadgeDischarge = styled("span", {
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "#f59e0b20",
  color: "#f59e0b",
  border: "1px solid #f59e0b",
});

export const BadgeIdle = styled("span", {
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "#6b728020",
  color: "#9ca3af",
  border: "1px solid #6b7280",
});

// SoC Section
export const SocContainer = styled("div", {
  textAlign: "center",
  marginBottom: "24px",
  padding: "16px",
  background: "#0f0f1a",
  borderRadius: "16px",
});

export const SocValue = styled("div", {
  fontSize: "48px",
  fontWeight: 800,
  color: "#3b82f6",
  lineHeight: 1,
  marginBottom: "8px",
  "@media (max-width: 480px)": {
    fontSize: "36px",
  },
});

export const SocLabel = styled("div", {
  fontSize: "12px",
  color: "#9ca3af",
  marginBottom: "12px",
});

export const SocBar = styled("div", {
  height: "8px",
  background: "#2a2a3a",
  borderRadius: "4px",
  overflow: "hidden",
});

export const SocBarFill = styled("div", {
  height: "100%",
  background: "linear-gradient(90deg, #3b82f6, #10b981)",
  borderRadius: "4px",
  transition: "width 0.3s ease",
});

// Details Grid
export const DetailsGrid = styled("div", {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "8px",
  "@media (max-width: 480px)": {
    gridTemplateColumns: "1fr",
  },
});

export const DetailItem = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "#0f0f1a",
  padding: "10px 12px",
  borderRadius: "12px",
  transition: "all 0.2s",
  "&:hover": {
    background: "#1f1f2e",
    transform: "translateX(2px)",
  },
});

export const DetailIcon = styled("span", {
  fontSize: "16px",
  minWidth: "28px",
});

export const DetailLabel = styled("span", {
  fontSize: "11px",
  color: "#9ca3af",
  flex: 1,
});

export const DetailValue = styled("span", {
  fontSize: "13px",
  fontWeight: 600,
  color: "#e5e7eb",
});
