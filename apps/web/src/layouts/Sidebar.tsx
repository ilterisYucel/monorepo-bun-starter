// apps/web/src/layouts/Sidebar.tsx
import React, { useState } from "react";
import { LogoutButton } from "../features/auth";
import "./Sidebar.css";

export type PageType =
  | "dashboard"
  | "racks"
  | "control"
  | "events"
  | "system-charts"
  | "reports";

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const menuItems = [
  { id: "dashboard" as const, label: "Dashboard", icon: "📊" },
  { id: "racks" as const, label: "Rack Detayları", icon: "🔋" },
  { id: "control" as const, label: "Kontrol", icon: "🎮" },
  { id: "events" as const, label: "Event & History", icon: "📋" },
  { id: "system-charts" as const, label: "Sistem Grafikleri", icon: "📈" },
  { id: "reports" as const, label: "Raporlar", icon: "📄" },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleEmergencyStop = () => {
    if (
      confirm("ACİL DURDURMA: Tüm sistem duracak. Devam etmek istiyor musunuz?")
    ) {
      // TODO: Acil durdurma API çağrısı
      console.log("Emergency stop triggered");
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <button
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? "→" : "←"}
      </button>

      <div className="sidebar-logo">
        <div className="logo-icon">🔋</div>
        {!isCollapsed && <span className="logo-text">EMS</span>}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? "active" : ""}`}
            onClick={() => onPageChange(item.id)}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && <span className="nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="emergency-stop-btn" onClick={handleEmergencyStop}>
          🛑 ACİL DURDUR
        </button>
        <LogoutButton />
      </div>
    </div>
  );
};
