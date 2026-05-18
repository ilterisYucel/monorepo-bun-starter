// src/modules/auth/components/LogoutButton.tsx
import React from "react";
import { useAuth } from "../hooks/useAuth";

export const LogoutButton: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <span style={{ color: "#e5e7eb", fontSize: "14px" }}>
        👤 {user?.name || user?.username}
      </span>
      <span
        style={{
          fontSize: "12px",
          padding: "2px 10px",
          borderRadius: "16px",
          background: isAdmin ? "#3b82f620" : "#10b98120",
          color: isAdmin ? "#3b82f6" : "#10b981",
        }}
      >
        {isAdmin ? "Admin" : "Teknik"}
      </span>
      <button
        onClick={logout}
        style={{
          background: "transparent",
          border: "1px solid #ef4444",
          color: "#ef4444",
          padding: "4px 12px",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        Çıkış
      </button>
    </div>
  );
};
