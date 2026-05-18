import React from "react";
import { useAuth } from "../../stores/AuthStore";

export const LogoutButton: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="logout-container">
      <div className="user-info">
        <span className="user-name">👤 {user?.name}</span>
        <span className={`user-role ${isAdmin ? "role-admin" : "role-teknik"}`}>
          {isAdmin ? "👑 Admin" : "🔧 Teknik"}
        </span>
      </div>
      <div className="header">
        <h1>🔋 Battery Rack Controller</h1>
      </div>
      <button onClick={logout} className="btn-logout">
        🚪 Çıkış Yap
      </button>
    </div>
  );
};
