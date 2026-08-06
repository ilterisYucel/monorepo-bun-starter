import React from "react";
import { COLORS } from "@gd-monorepo/ui";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error.message, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            padding: "32px",
            background: COLORS.bgCard,
            color: COLORS.textLight,
            fontFamily: "var(--mono)",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: COLORS.error, marginBottom: "16px" }}>Something went wrong</h2>
          <p style={{ color: COLORS.textMuted, marginBottom: "8px", maxWidth: "500px" }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <p style={{ color: COLORS.textDisabled, fontSize: "12px", marginBottom: "24px" }}>
            The application encountered an error and cannot continue. This may be caused by a WebGL context loss or memory exhaustion.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: "10px 24px",
              background: COLORS.info,
              color: COLORS.textWhite,
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "var(--mono)",
              fontSize: "14px",
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
