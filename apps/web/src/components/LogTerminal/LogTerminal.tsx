// src/components/LogTerminal/LogTerminal.tsx
import React, { useRef, useEffect } from "react";
import { useLogStore } from "../../stores/LogStore";
import "./LogTerminal.css";

interface LogTerminalProps {
  maxHeight?: number;
}

export const LogTerminal: React.FC<LogTerminalProps> = ({
  maxHeight = 350,
}) => {
  const { logs, clearLogs } = useLogStore();
  const terminalRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Yeni log geldiğinde otomatik scroll
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [logs]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      default:
        return "📌";
    }
  };

  const getTypeClass = (type: string) => {
    switch (type) {
      case "success":
        return "log-success";
      case "error":
        return "log-error";
      case "warning":
        return "log-warning";
      default:
        return "log-info";
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "command":
        return "🎮";
      case "rack":
        return "🔋";
      case "scheduler":
        return "⏰";
      default:
        return "⚙️";
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="log-terminal" style={{ height: maxHeight }}>
      <div className="log-terminal-header">
        <div className="log-title">
          <span>📋</span>
          <span>Komut Terminali & Event Log</span>
        </div>
        <button onClick={clearLogs} className="clear-logs-btn">
          🗑️ Temizle
        </button>
      </div>

      <div className="log-terminal-body" ref={bodyRef}>
        {logs.length === 0 ? (
          <div className="log-empty">
            <span>📭</span>
            <p>Henüz log kaydı yok.</p>
            <small>Komut gönderdiğinizde burada görünecektir.</small>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`log-entry ${getTypeClass(log.type)}`}>
              <div className="log-time">{formatTime(log.timestamp)}</div>
              <div className="log-icon">
                {getTypeIcon(log.type)} {getSourceIcon(log.source)}
              </div>
              <div className="log-message">{log.message}</div>
              {log.details && <div className="log-details">{log.details}</div>}
            </div>
          ))
        )}
      </div>

      <div className="log-terminal-footer">
        <span>📊 Toplam {logs.length} kayıt</span>
        <span className="log-legend">
          <span className="legend-success">✅ Başarılı</span>
          <span className="legend-error">❌ Hata</span>
          <span className="legend-warning">⚠️ Uyarı</span>
          <span className="legend-info">📌 Bilgi</span>
        </span>
      </div>
    </div>
  );
};
