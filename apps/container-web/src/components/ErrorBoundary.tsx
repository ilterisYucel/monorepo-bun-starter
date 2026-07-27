import React from "react";

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
            background: "#1a1a2e",
            color: "#e0e0e0",
            fontFamily: "monospace",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#ef4444", marginBottom: "16px" }}>Something went wrong</h2>
          <p style={{ color: "#a0a0b0", marginBottom: "8px", maxWidth: "500px" }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <p style={{ color: "#6b7280", fontSize: "12px", marginBottom: "24px" }}>
            The application encountered an error and cannot continue. This may be caused by a WebGL context loss or memory exhaustion.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: "10px 24px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "monospace",
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
