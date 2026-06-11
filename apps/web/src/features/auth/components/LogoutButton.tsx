// apps/web/src/features/auth/components/LogoutButton.tsx
import React from "react";
import { useAuth } from "../hooks/useAuth";

export const LogoutButton: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="logout-button-container">
      <div className="user-info">
        <span>👤 {user?.name}</span>
        <span className={`role-badge ${isAdmin ? "admin" : "teknik"}`}>
          {isAdmin ? "Admin" : "Teknik"}
        </span>
      </div>
      <button onClick={logout} className="logout-btn">
        🚪 Çıkış
      </button>
    </div>
  );
};
