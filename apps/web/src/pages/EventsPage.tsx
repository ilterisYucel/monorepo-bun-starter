// apps/web/src/features/events/EventsPage.tsx
import React from "react";
import { LogTerminal } from "@gd-monorepo/ui";
import "./EventsPage.css";
import { useFilteredLogProvider } from "../hooks/useFilteredLogProvider";

export const EventsPage: React.FC = () => {
  const systemLogProvider = useFilteredLogProvider("system");
  const userActionLogProvider = useFilteredLogProvider("command");

  return (
    <div className="events-page">
      <div className="events-grid">
        <div className="events-card">
          <h3>⚠️ Sistem Event & Hataları</h3>
          <LogTerminal provider={systemLogProvider} maxHeight={500} />
        </div>
        <div className="events-card">
          <h3>👤 Kullanıcı Hareketleri</h3>
          <LogTerminal provider={userActionLogProvider} maxHeight={500} />
        </div>
      </div>
    </div>
  );
};
