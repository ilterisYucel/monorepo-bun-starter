import React, { useState } from "react";
import { api } from "../../services/api";

interface AdminPanelProps {
  onRefresh: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onRefresh }) => {
  const [socValue, setSocValue] = useState<number>(50);
  const [statusValue, setStatusValue] = useState<"online" | "offline">(
    "online",
  );
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSetSoc = async () => {
    setIsLoading(true);
    try {
      // Tüm rack'lere SoC ata (rack_id gönderme)
      await api.setSoc(socValue);
      setMessage({
        type: "success",
        text: `Tüm rack'lerin SoC değeri ${socValue}% olarak ayarlandı!`,
      });
      setTimeout(() => setMessage(null), 3000);
      onRefresh();
    } catch {
      setMessage({ type: "error", text: "SoC ayarlanamadı!" });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetStatus = async () => {
    setIsLoading(true);
    try {
      // Tüm rack'lere Status ata (rack_id gönderme)
      await api.setStatus(statusValue);
      setMessage({
        type: "success",
        text: `Tüm rack'ler ${statusValue} olarak ayarlandı!`,
      });
      setTimeout(() => setMessage(null), 3000);
      onRefresh();
    } catch {
      setMessage({ type: "error", text: "Status ayarlanamadı!" });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-panel">
      <h3 className="section-title">👑 Admin Kontrolleri</h3>

      {/* SoC Ayarı - Tüm rack'lere */}
      <div className="form-group">
        <label>🔋 Tüm Rack'lerin SoC Değeri (%)</label>
        <div className="admin-input-group">
          <input
            type="number"
            value={socValue}
            onChange={(e) => setSocValue(Number(e.target.value))}
            min={0}
            max={100}
            step={5}
            disabled={isLoading}
          />
          <button
            onClick={handleSetSoc}
            disabled={isLoading}
            className="btn-admin"
          >
            SoC Ayarla
          </button>
        </div>
        <small>Bu işlem tüm rack'lere aynı SoC değerini atar.</small>
      </div>

      {/* Status Ayarı - Tüm rack'lere */}
      <div className="form-group">
        <label>🟢 Tüm Rack'lerin Status Değeri</label>
        <div className="admin-input-group">
          <select
            value={statusValue}
            onChange={(e) =>
              setStatusValue(e.target.value as "online" | "offline")
            }
            className="admin-select"
            disabled={isLoading}
          >
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
          <button
            onClick={handleSetStatus}
            disabled={isLoading}
            className="btn-admin"
          >
            Status Ayarla
          </button>
        </div>
        <small>Bu işlem tüm rack'lere aynı status değerini atar.</small>
      </div>

      {message && (
        <div
          className={`alert alert-${message.type}`}
          style={{ marginTop: "12px" }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
};
