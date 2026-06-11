// packages/ui/src/core/Gauge/Gauge.styles.ts
import { styled } from "just-styled";
import type { ReactNode } from "react";

// 🔥 Tip tanımına children ekle
interface GaugeContainerProps {
  size?: "small" | "medium" | "large";
  children?: ReactNode;
}

export const GaugeContainer = styled("div", {
  borderRadius: "16px",
  transition: "all 0.2s ease",
  border: "1px solid #2a2a3a",
  cursor: "pointer",
  textAlign: "center",
  variants: {
    size: {
      small: { padding: "10px 12px", minWidth: "100px" },
      medium: { padding: "16px", minWidth: "140px" },
      large: { padding: "20px", minWidth: "180px" },
    },
  },
  ":hover": {
    transform: "translateY(-2px)",
    borderColor: "#3b82f6",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  },
}) as React.FC<GaugeContainerProps>;

// Label için de aynısını yap
interface LabelProps {
  size?: "small" | "medium" | "large";
  children?: ReactNode;
}

export const Label = styled("div", {
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: "8px",
  variants: {
    size: {
      small: { fontSize: "11px" },
      medium: { fontSize: "13px" },
      large: { fontSize: "15px" },
    },
  },
}) as React.FC<LabelProps>;

// ValueNumber için de aynısını yap
interface ValueNumberProps {
  size?: "small" | "medium" | "large";
  children?: ReactNode;
}

export const ValueNumber = styled("span", {
  variants: {
    size: {
      small: { fontSize: "20px" },
      medium: { fontSize: "28px" },
      large: { fontSize: "36px" },
    },
  },
}) as React.FC<ValueNumberProps>;

// Diğer stiller (çocuk almayanlar) aynı kalabilir
export const Icon = styled("div", {
  fontSize: "24px",
  marginBottom: "8px",
});

export const ValueContainer = styled("div", {
  fontWeight: 700,
  color: "#e5e7eb",
  lineHeight: 1.2,
  marginBottom: "12px",
});

export const Unit = styled("span", {
  fontSize: "0.5em",
  marginLeft: "2px",
  color: "#9ca3af",
  fontWeight: 400,
});

export const BarContainer = styled("div", {
  background: "#2a2a3a",
  borderRadius: "10px",
  height: "8px",
  overflow: "hidden",
  marginBottom: "8px",
});

export const BarFill = styled("div", {
  height: "100%",
  borderRadius: "10px",
  transition: "width 0.3s ease",
});

export const Limits = styled("div", {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "10px",
  color: "#6b7280",
});
