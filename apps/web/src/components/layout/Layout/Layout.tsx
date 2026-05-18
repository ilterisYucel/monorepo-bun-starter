// src/components/layout/Layout.tsx
import React from "react";
import { Sidebar, type PageType } from "../Sidebar/Sidebar";
import { Header } from "../Header/Header";
import "./Layout.css";

interface LayoutProps {
  children: React.ReactNode;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  pageTitle: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentPage,
  onPageChange,
  pageTitle,
}) => {
  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} onPageChange={onPageChange} />
      <div className="main-content">
        <Header pageTitle={pageTitle} />
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
};
