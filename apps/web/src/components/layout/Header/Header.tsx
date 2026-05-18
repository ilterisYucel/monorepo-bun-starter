// src/components/layout/Header.tsx
import React from "react";
import { LogoutButton } from "../../../modules/auth/components/LogoutButton";
import "./Header.css";

interface HeaderProps {
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle }) => {
  return (
    <header className="app-header">
      <h1 className="page-title">{pageTitle}</h1>
      <div className="header-actions">
        <LogoutButton />
      </div>
    </header>
  );
};
