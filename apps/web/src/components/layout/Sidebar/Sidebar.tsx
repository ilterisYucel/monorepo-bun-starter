// src/components/layout/Sidebar.tsx
import React, { useState } from "react";
import "./Sidebar.css";

export type PageType = "dashboard" | "racks" | "control" | "reports";

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const menuItems = [
  { id: "dashboard" as const, label: "Dashboard", icon: "📊" },
  { id: "racks" as const, label: "Rack Details", icon: "🔋" },
  { id: "control" as const, label: "Control", icon: "🎮" },
  { id: "reports" as const, label: "Reports", icon: "📄" },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <button
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Genişlet" : "Daralt"}
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
    </div>
  );
};
