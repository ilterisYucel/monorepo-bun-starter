// apps/web/src/features/reports/ReportsPage.tsx
import React from "react";
import "./ReportsPage.css";

export const ReportsPage: React.FC = () => {
  return (
    <div className="reports-page">
      <div className="reports-placeholder">
        <div className="placeholder-icon">📄</div>
        <h2>Raporlar Sayfası</h2>
        <p>Bu sayfa şu anda geliştirme aşamasındadır.</p>
        <p>
          Yakında eklenecek: PDF raporları, Excel export, grafik raporları...
        </p>
      </div>
    </div>
  );
};
