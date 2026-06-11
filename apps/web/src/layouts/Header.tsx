// apps/web/src/layouts/Header.tsx
import React from "react";
import "./Header.css";

interface HeaderProps {
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle }) => {
  return (
    <header className="app-header">
      <h1 className="page-title">{pageTitle}</h1>
    </header>
  );
};
