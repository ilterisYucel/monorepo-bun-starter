import { QueryClientProvider } from "@tanstack/react-query";
import React, { Component } from "react";
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "react-router-dom";
import { COLORS } from "@gd-monorepo/ui";
import { queryClient } from "../lib/query-client";
import { router } from "./router";

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", color: COLORS.error }}>
          <h2>Bir hata olustu</h2>
          <pre>{this.state.error?.message}</pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: "1rem", padding: "8px 16px" }}
          >
            Yeniden Yukle
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AppProviders: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </QueryClientProvider>
  </ErrorBoundary>
);
